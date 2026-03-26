
import { GoogleGenAI, Content, Part, GenerateContentResponse, Type } from "@google/genai";
import { MODEL_NAME, IMAGE_MODEL, SYSTEM_INSTRUCTION, FALLBACK_MODEL_NAME, FALLBACK_IMAGE_MODEL } from '../constants';
import { Message, Role, Attachment, GroundingSource, ImageGenerationConfig, UserProfile } from '../types';

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

export const enhanceImagePrompt = async (prompt: string, isEdit: boolean = false): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
  
  const instruction = isEdit 
    ? `Rewrite the following image editing instruction to be highly precise and descriptive for an AI image editor. Keep the core intent (e.g., adding, removing, or changing elements) but ensure the description of the change is clear and detailed. Do NOT write a prompt for a completely new image, only describe the edits to be made. Return ONLY the enhanced instruction text without any conversational filler or quotes.\n\nOriginal instruction: ${prompt}`
    : `Rewrite the following image generation prompt to be highly detailed, descriptive, and optimized for an AI image generator. Keep the core intent but add artistic style, lighting, composition, and mood details. Return ONLY the enhanced prompt text without any conversational filler or quotes.\n\nOriginal prompt: ${prompt}`;

  const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: instruction,
    config: {
      temperature: 0.7
    }
  }));

  const text = response.text?.trim();
  if (!text) throw new Error("Failed to enhance prompt.");
  return text;
};

export const generateImage = async (
  prompt: string, 
  config: ImageGenerationConfig, 
  contextAttachments?: Attachment[] | null
): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
  
  const styleInstruction = config.style !== 'None' ? ` in a ${config.style} style` : '';
  const fullPrompt = `${prompt}${styleInstruction}.`;

  const performGeneration = async (model: string): Promise<string> => {
      const parts: Part[] = [];
      
      if (contextAttachments && contextAttachments.length > 0) {
        contextAttachments.forEach(att => {
          parts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.data
            }
          });
        });
        parts.push({ text: `Create an image based on these references and the following description: ${fullPrompt}. Return ONLY the generated image.` });
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

export const upscaleImage = async (
  imageUrl: string,
  prompt: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
  const model = 'gemini-3.1-flash-image-preview'; // Use flash-image-preview for 4K support

  // Extract base64 and mimeType from data URL
  const [header, base64Data] = imageUrl.split(',');
  const mimeType = header.split(':')[1].split(';')[0];

  const parts: Part[] = [
    {
      inlineData: {
        mimeType: mimeType,
        data: base64Data
      }
    },
    { text: `Upscale and enhance the resolution and details of this image. Maintain the original composition and subject exactly, but increase clarity, sharpness, and texture quality. Original prompt context: ${prompt}` }
  ];

  const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
    model: model,
    contents: { parts },
    config: {
      imageConfig: {
        imageSize: '4K',
        aspectRatio: '1:1' // Defaulting to 1:1, though ideally it should match the original
      } as any
    }
  }));

  const candidate = response.candidates?.[0];
  if (!candidate) throw new Error("Image upscaling failed.");

  for (const part of candidate.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("Image upscaling returned no image data.");
};

export const editImage = async (
  prompt: string,
  images: Attachment[]
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
  const model = 'gemini-2.5-flash-image';

  const parts: any[] = images.map(img => ({
    inlineData: {
      mimeType: img.mimeType,
      data: img.data
    }
  }));
  parts.push({ text: prompt });

  const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
    model: model,
    contents: {
      parts: parts
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
  images?: Attachment[] | null,
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
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

  if (images && images.length > 0) {
    // Veo supports up to 3 reference images if using veo-3.1-generate-preview
    // But for fast model, it usually takes one starting image.
    // Let's use the first one for now or check if we should switch models.
    request.image = {
      imageBytes: images[0].data,
      mimeType: images[0].mimeType
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
      'x-goog-api-key': process.env.API_KEY || process.env.GEMINI_API_KEY || '',
    },
  });

  if (!response.ok) throw new Error("Failed to download generated video.");
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const generateSpeech = async (
  text: string,
  voiceName: string = 'Kore',
  style: string = 'Normal'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
  const model = 'gemini-2.5-flash-preview-tts';

  const prompt = style !== 'Normal' ? `Say ${style}: ${text}` : text;

  const response = await ai.models.generateContent({
    model: model,
    contents: [{ parts: [{ text: prompt }] }],
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

export interface StreamResponseResult {
  text: string;
  functionCall?: {
    name: string;
    args: any;
  };
}

export const streamResponse = async (
  history: Message[],
  newMessage: string,
  attachments: Attachment[] | null,
  onChunk: (text: string, sources?: GroundingSource[]) => void,
  signal?: AbortSignal,
  useFastModel: boolean = false,
  userProfile?: UserProfile | null
): Promise<StreamResponseResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
  
  // Select model based on preference
  const selectedModel = useFastModel ? 'gemini-3.1-flash-lite-preview' : MODEL_NAME;

  // Personalize system instruction
  let personalizedInstruction = SYSTEM_INSTRUCTION;
  if (userProfile) {
    personalizedInstruction += `
USER PROFILE CONTEXT:
- Name: ${userProfile.name || 'User'}
- Role: ${userProfile.role || 'Not specified'}
- Strategic Goals: ${userProfile.goals.join(', ') || 'None specified'}
- Constraints: ${userProfile.constraints.join(', ') || 'None specified'}
- Tone Preference: ${userProfile.preferences.tone}
- Core Expertise: ${userProfile.preferences.expertise || 'Not specified'}
- Interests: ${userProfile.preferences.interests.join(', ') || 'None specified'}

ADAPTATION RULES:
1. Address the user by name if appropriate.
2. Align advice with the user's role and expertise.
3. Respect the stated constraints in all strategic suggestions.
4. Maintain a ${userProfile.preferences.tone} tone.
5. Prioritize the user's strategic goals in decision support.
`;
  }

  // Filter and map history to ensure continuity even for image-only messages
  const contents: Content[] = history
    .filter(msg => msg.text || msg.attachment || msg.attachments || (msg.generatedImageUrls && msg.generatedImageUrls.length > 0) || msg.generatedImageUrl)
    .map(msg => {
      const parts: Part[] = [];
      if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach(att => {
          parts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.data
            }
          });
        });
      } else if (msg.attachment) {
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
  if (attachments && attachments.length > 0) {
    attachments.forEach(att => {
      currentParts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: att.data
        }
      });
    });
  }
  currentParts.push({ text: newMessage });
  
  contents.push({
    role: 'user',
    parts: currentParts
  });

  const executeStream = async (model: string): Promise<StreamResponseResult> => {
    let fullText = '';
    let sources: GroundingSource[] = [];
    let functionCall: { name: string; args: any } | undefined = undefined;

    const responseStream = await retryWithBackoff<any>(() => ai.models.generateContentStream({
      model: model,
      contents: contents,
      config: {
        systemInstruction: personalizedInstruction,
        temperature: 0.7,
        tools: [
          {
            functionDeclarations: [
              {
                name: "generate_image",
                description: "Generate a new image based on the user's prompt. You can infer the style, aspect ratio, number of images, and resolution from the user's request.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    prompt: { type: Type.STRING, description: "The prompt to generate the image" },
                    style: { type: Type.STRING, description: "The aesthetic style (e.g., 'None', 'Photorealistic', 'Cyberpunk', 'Watercolor', '3D Render', 'Sketch')" },
                    aspectRatio: { type: Type.STRING, description: "The aspect ratio (e.g., '1:1', '16:9', '9:16', '4:3', '3:4')" },
                    numberOfImages: { type: Type.NUMBER, description: "The number of images to generate (1-4)" },
                    imageSize: { type: Type.STRING, description: "The resolution of the image ('1K', '2K', '4K')" }
                  },
                  required: ["prompt"]
                }
              },
              {
                name: "edit_image",
                description: "Edit an existing image based on the user's prompt.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    prompt: { type: Type.STRING, description: "The prompt to edit the image" }
                  },
                  required: ["prompt"]
                }
              },
              {
                name: "generate_video",
                description: "Generate a video based on the user's prompt. You can infer the aspect ratio from the user's request.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    prompt: { type: Type.STRING, description: "The prompt to generate the video" },
                    aspectRatio: { type: Type.STRING, description: "The aspect ratio ('16:9' or '9:16')" }
                  },
                  required: ["prompt"]
                }
              }
            ]
          }
        ],
        // Let the model decide automatically
      },
    }));

    for await (const chunk of responseStream) {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
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

      if (c.functionCalls && c.functionCalls.length > 0) {
        const call = c.functionCalls[0];
        functionCall = {
          name: call.name || '',
          args: call.args
        };
        break; // Stop streaming if a function call is made
      }
    }
    return { text: fullText, functionCall };
  };

  try {
    return await executeStream(selectedModel);
  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    
    // Check for high demand / service unavailable errors
    const errorString = JSON.stringify(error, Object.getOwnPropertyNames(error));
    const messageString = error.message || '';
    const isOverloaded = 
      error.status === 503 || 
      error.code === 503 ||
      error.status === 404 ||
      error.code === 404 ||
      messageString.includes('503') || 
      messageString.includes('404') ||
      messageString.includes('high demand') ||
      messageString.includes('UNAVAILABLE') ||
      messageString.includes('NOT_FOUND') ||
      messageString.includes('Requested entity was not found') ||
      errorString.includes('503') ||
      errorString.includes('404') ||
      errorString.includes('UNAVAILABLE') ||
      errorString.includes('NOT_FOUND');

    if (isOverloaded && !useFastModel) {
       const reason = error.status === 404 || error.code === 404 || messageString.includes('404') ? 'Model Not Found' : 'Service Overloaded';
       console.warn(`[Gemini Service] Primary model ${selectedModel} failed (${reason}). Switching to fallback: ${FALLBACK_MODEL_NAME}`);
       try {
         return await executeStream(FALLBACK_MODEL_NAME);
       } catch (fallbackError: any) {
         if (fallbackError.name === 'AbortError') throw fallbackError;
         console.error("Fallback Model Error:", fallbackError);
         throw fallbackError;
       }
    }

    console.error("Gemini API Error:", error);
    throw error;
  }
};
