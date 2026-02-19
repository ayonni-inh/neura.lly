
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
      // Inspect both error properties and the message string (which might contain nested JSON)
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
  
  // Construct the enhanced prompt with style
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
      
      if (model === IMAGE_MODEL) {
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

      let modelText = '';
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
        if (part.text) {
          modelText += part.text;
        }
      }

      if (modelText) {
        const cleanText = modelText
          .replace(/^(I cannot|I can't|I am unable to|Model Response:|System:|Yes,|Sure,|Okay,|Of course,|Here is the image you requested:)/gi, '')
          .trim();
        if (cleanText.length > 0) {
          throw new Error(cleanText);
        }
      }
      
      throw new Error("Visualization failed to materialize. The model returned an empty response.");
  };

  const generateSingleImage = async (): Promise<string> => {
    try {
       return await performGeneration(IMAGE_MODEL);
    } catch (error: any) {
       console.warn(`Primary image model ${IMAGE_MODEL} failed, attempting fallback to ${FALLBACK_IMAGE_MODEL}`, error);
       try {
         return await performGeneration(FALLBACK_IMAGE_MODEL);
       } catch (fallbackError) {
         throw error; // Throw original error if fallback also fails
       }
    }
  };

  try {
    // Execute parallel requests for the number of images requested
    const promises = Array(config.numberOfImages).fill(null).map(() => generateSingleImage());
    const results = await Promise.all(promises);
    return results;
  } catch (error: any) {
    console.error("Batch Image Generation Error:", error);
    throw error;
  }
};

export const streamResponse = async (
  history: Message[],
  newMessage: string,
  attachment: Attachment | null,
  onChunk: (text: string, sources?: GroundingSource[]) => void,
  signal?: AbortSignal
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
        thinkingConfig: { thinkingBudget: 4096 }
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
    return await executeStream(MODEL_NAME);
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

    if (isOverloaded) {
       console.warn(`Primary model ${MODEL_NAME} overloaded. Switching to fallback: ${FALLBACK_MODEL_NAME}`);
       // Clear any partial chunks from the failed attempt if necessary, 
       // but typically we just start over.
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
