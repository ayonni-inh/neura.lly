
import { GoogleGenAI, Content, Part, GenerateContentResponse } from "@google/genai";
import { MODEL_NAME, IMAGE_MODEL, SYSTEM_INSTRUCTION, FALLBACK_MODEL_NAME, FALLBACK_IMAGE_MODEL } from '../constants';
import { Message, Role, Attachment, GroundingSource, ImageGenerationConfig } from '../types';

// Helper for exponential backoff
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check for retryable errors (503 Service Unavailable, 429 Too Many Requests)
      const errorString = JSON.stringify(error, Object.getOwnPropertyNames(error));
      const messageString = error.message || '';
      const statusText = error.statusText || '';
      
      const isRetryable = 
        error.status === 503 || 
        error.code === 503 ||
        error.status === 429 ||
        error.code === 429 ||
        messageString.includes('503') || 
        messageString.includes('429') || 
        messageString.includes('UNAVAILABLE') || 
        messageString.includes('overloaded') ||
        messageString.includes('high demand') ||
        messageString.includes('temporary') ||
        statusText.includes('UNAVAILABLE') ||
        errorString.includes('503') ||
        errorString.includes('429');

      if (!isRetryable || i === maxRetries - 1) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, i) + Math.random() * 500;
      console.warn(`[Gemini Service] Attempt ${i + 1} failed. Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

export const generateImage = async (
  prompt: string, 
  config: ImageGenerationConfig, 
  contextAttachment?: Attachment | null
): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const styleInstruction = config.style !== 'None' ? ` in a ${config.style} style` : '';
  const fullPrompt = `${prompt}${styleInstruction}.`;

  const performGeneration = async (model: string): Promise<string> => {
      const parts: Part[] = [];
      
      if (contextAttachment) {
        parts.push({
          inlineData: {
            mimeType: contextAttachment.mimeType,
            data: contextAttachment.data
          }
        });
        parts.push({ text: `Create an image based on this reference and the following description: ${fullPrompt}. Return ONLY the generated image.` });
      } else {
        parts.push({ text: `Generate a high-quality image of: ${fullPrompt}. Return ONLY the image.` });
      }

      // Configure image options. Only Pro models support imageSize.
      const imageConfigParams: any = {
        aspectRatio: config.aspectRatio
      };
      
      if (model === 'gemini-3-pro-image-preview') {
        imageConfigParams.imageSize = config.imageSize;
      }

      const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
        model: model,
        contents: [{ parts }],
        config: {
          imageConfig: imageConfigParams
        }
      }));

      const candidate = response.candidates?.[0];
      if (!candidate) {
        throw new Error("Visualization engine failed to initialize (No candidates).");
      }

      for (const part of candidate.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      
      throw new Error("Visualization failed to materialize. The model returned an empty response.");
  };

  try {
    // Execute parallel requests for the number of images requested
    // Try Pro model first
    const promises = Array(config.numberOfImages).fill(null).map(() => performGeneration('gemini-3-pro-image-preview'));
    const results = await Promise.all(promises);
    return results;
  } catch (error: any) {
    // Check for permission denied or not found (often means model not available to project)
    const status = error.status || error.code || error.error?.code || error.error?.status;
    const message = error.message || error.error?.message || JSON.stringify(error);
    const errorString = JSON.stringify(error);
    
    if (
      status === 403 || 
      status === 404 || 
      message.includes('PERMISSION_DENIED') || 
      message.includes('The caller does not have permission') ||
      message.includes('403') ||
      errorString.includes('PERMISSION_DENIED') ||
      errorString.includes('403')
    ) {
       console.warn("Pro model failed with permission/access error. Falling back to Flash.");
       try {
         const promises = Array(config.numberOfImages).fill(null).map(() => performGeneration('gemini-2.5-flash-image'));
         const results = await Promise.all(promises);
         return results;
       } catch (fallbackError) {
         console.error("Fallback Image Generation Error:", fallbackError);
         throw fallbackError;
       }
    }
    
    console.error("Batch Image Generation Error (Pro):", error);
    throw error;
  }
};

export const editImage = async (
  prompt: string,
  image: Attachment
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-flash-image';

  const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: image.mimeType,
            data: image.data
          }
        },
        { text: prompt }
      ]
    }
  }));

  const candidate = response.candidates?.[0];
  if (!candidate) throw new Error("Image editing failed.");

  for (const part of candidate.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("Image editing returned no image data.");
};

export const generateVideo = async (
  prompt: string,
  image?: Attachment | null,
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'veo-3.1-fast-generate-preview';

  const request: any = {
    model: model,
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio
    }
  };

  if (image) {
    request.image = {
      imageBytes: image.data,
      mimeType: image.mimeType
    };
  }

  let operation = await ai.models.generateVideos(request);

  // Poll for completion
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("Video generation failed.");

  // Fetch the video content
  const response = await fetch(videoUri, {
    method: 'GET',
    headers: {
      'x-goog-api-key': process.env.API_KEY || '',
    },
  });

  if (!response.ok) throw new Error("Failed to download generated video.");
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const generateSpeech = async (
  text: string,
  voiceName: string = 'Kore'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-flash-preview-tts';

  const response = await ai.models.generateContent({
    model: model,
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName }
        }
      }
    }
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Speech generation failed.");
  
  return `data:audio/mp3;base64,${base64Audio}`;
};

export const streamResponse = async (
  history: Message[],
  newMessage: string,
  attachment: Attachment | null,
  onChunk: (text: string, sources?: GroundingSource[]) => void,
  signal?: AbortSignal,
  useFastModel: boolean = false
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Select model based on preference
  const selectedModel = useFastModel ? 'gemini-2.5-flash-lite-latest' : MODEL_NAME;

  // Filter and map history to ensure continuity even for image-only messages
  const contents: Content[] = history
    .filter(msg => msg.text || msg.attachment || (msg.generatedImageUrls && msg.generatedImageUrls.length > 0) || msg.generatedImageUrl)
    .map(msg => {
      const parts: Part[] = [];
      if (msg.attachment) {
        parts.push({
          inlineData: {
            mimeType: msg.attachment.mimeType,
            data: msg.attachment.data
          }
        });
      }
      if (msg.text) {
        parts.push({ text: msg.text });
      } else if (msg.generatedImageUrl || (msg.generatedImageUrls && msg.generatedImageUrls.length > 0)) {
        // If a message has no text but has a generated image, we add a system note to preserve context
        parts.push({ text: "[System: Visual content was generated in this turn]" });
      }
      
      return {
        role: msg.role === Role.USER ? 'user' : 'model',
        parts
      };
    });

  const currentParts: Part[] = [];
  if (attachment) {
    currentParts.push({
      inlineData: {
        mimeType: attachment.mimeType,
        data: attachment.data
      }
    });
  }
  currentParts.push({ text: newMessage });
  
  contents.push({
    role: 'user',
    parts: currentParts
  });

  const executeStream = async (model: string) => {
    let fullText = '';
    let sources: GroundingSource[] = [];

    const responseStream = await retryWithBackoff<any>(() => ai.models.generateContentStream({
      model: model,
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        tools: [{ googleSearch: {} }],
        // Adjust thinking budget based on model capabilities if needed
        thinkingConfig: !useFastModel ? { thinkingBudget: 4096 } : undefined
      },
    }));

    for await (const chunk of responseStream) {
      if (signal?.aborted) {
        break;
      }

      const c = chunk as GenerateContentResponse;
      const text = c.text;
      
      const groundingChunks = c.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks) {
        groundingChunks.forEach((item: any) => {
          if (item.web) {
            sources.push({ title: item.web.title, uri: item.web.uri });
          }
        });
        sources = sources.filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i);
      }

      if (text) {
        fullText += text;
        onChunk(fullText, sources.length > 0 ? sources : undefined);
      }
    }
    return fullText;
  };

  try {
    return await executeStream(selectedModel);
  } catch (error: any) {
    if (error.name === 'AbortError') return '';
    
    // Check for high demand / service unavailable errors
    const errorString = JSON.stringify(error, Object.getOwnPropertyNames(error));
    const messageString = error.message || '';
    const isOverloaded = 
      error.status === 503 || 
      error.code === 503 ||
      messageString.includes('503') || 
      messageString.includes('high demand') ||
      messageString.includes('UNAVAILABLE') ||
      errorString.includes('503') ||
      errorString.includes('UNAVAILABLE');

    if (isOverloaded && !useFastModel) {
       console.warn(`Primary model ${selectedModel} overloaded. Switching to fallback: ${FALLBACK_MODEL_NAME}`);
       try {
         return await executeStream(FALLBACK_MODEL_NAME);
       } catch (fallbackError: any) {
         if (fallbackError.name === 'AbortError') return '';
         console.error("Fallback Model Error:", fallbackError);
         throw fallbackError;
       }
    }

    console.error("Gemini API Error:", error);
    throw error;
  }
};
