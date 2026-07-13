import { GoogleGenAI, Content, Part, GenerateContentResponse, Type } from "@google/genai";
import { MODEL_NAME, IMAGE_MODEL, SYSTEM_INSTRUCTION, FALLBACK_MODEL_NAME, FALLBACK_IMAGE_MODEL, SPEECH_MODEL } from '../constants';
import { Message, Role, Attachment, GroundingSource, ImageGenerationConfig, UserProfile, Intent, StreamResponseResult } from '../types';

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
      console.warn(`[Gemini Server Service] Attempt ${i + 1} failed. Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

const getAI = () => {
  let apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  if (!apiKey) {
    console.warn("[Gemini Server Service] API Key is missing on the server. Please check environment configuration.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

export const detectIntent = async (text: string, attachments: Attachment[] | null): Promise<Intent> => {
  const ai = getAI();
  const prompt = `Analyze the following user input and categorize the primary intent into exactly one of these categories:
- record: The user is just stating a fact, recording a note, or documenting something without needing an immediate response or analysis.
- analyze: The user wants deep strategic thinking, review, or feedback on an idea or data.
- generate: The user wants to create something new (image, video, text, code).
- query: The user is asking a specific question that needs an answer.
- action: The user is giving a command to perform a specific task (e.g., "save this to project X").

Input: "${text}"
Attachments: ${attachments ? attachments.length : 0} files attached.

Return ONLY the category name.`;

  const modelsToTry = [
    FALLBACK_MODEL_NAME,
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-3.1-pro-preview'
  ];

  let lastError: any = null;
  for (const modelToAttempt of modelsToTry) {
    try {
      const response = await retryWithBackoff<any>(() => ai.models.generateContent({
        model: modelToAttempt,
        contents: prompt
      }));
      const result = response.text?.toLowerCase().trim() as Intent;
      if (['record', 'analyze', 'generate', 'query', 'action'].includes(result)) {
        return result;
      }
      return 'query';
    } catch (err: any) {
      console.warn(`[Gemini Server Service] detectIntent failed with model ${modelToAttempt}:`, err.message || err);
      lastError = err;
    }
  }

  console.error("All detectIntent models exhausted:", lastError);
  return 'query';
};

export const enhanceImagePrompt = async (prompt: string, style?: string | boolean): Promise<string> => {
  const ai = getAI();
  const styleStr = typeof style === 'string' ? style : '';
  const instruction = styleStr && styleStr !== 'None'
    ? `Rewrite the following image generation prompt to be highly detailed, descriptive, and optimized for an AI image generator working in the "${styleStr}" aesthetic. Keep the core intent but add style-specific lighting, composition, mood, and artistic details. Return ONLY the enhanced prompt text without any conversational filler or quotes.\n\nOriginal prompt: ${prompt}`
    : `Rewrite the following image generation prompt to be highly detailed, descriptive, and optimized for an AI image generator. Keep the core intent but add artistic style, lighting, composition, and mood details. Return ONLY the enhanced prompt text without any conversational filler or quotes.\n\nOriginal prompt: ${prompt}`;

  const modelsToTry = [
    FALLBACK_MODEL_NAME,
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-3.1-pro-preview'
  ];

  let lastError: any = null;
  for (const modelToAttempt of modelsToTry) {
    try {
      const response = await retryWithBackoff<any>(() => ai.models.generateContent({
        model: modelToAttempt,
        contents: instruction,
        config: {
          temperature: 0.7
        }
      }));
      
      const text = response.text?.trim();
      if (text) return text;
    } catch (err: any) {
      console.warn(`[Gemini Server Service] enhanceImagePrompt failed with model ${modelToAttempt}:`, err.message || err);
      lastError = err;
    }
  }

  console.error("All enhanceImagePrompt models exhausted:", lastError);
  return prompt;
};

export const generateImage = async (
  prompt: string, 
  config: ImageGenerationConfig, 
  contextAttachments?: Attachment[] | null
): Promise<string[]> => {
  const ai = getAI();
  
  const styleInstruction = config.style !== 'None' ? ` in a ${config.style} style` : '';
  const fullPrompt = `${prompt}${styleInstruction}.`;

  const performGeneration = async (model: string): Promise<string> => {
    if (model.startsWith('imagen-')) {
      const mappedAspect = config.aspectRatio === '1:1' ? '1:1' : 
                          config.aspectRatio === '16:9' ? '16:9' : 
                          config.aspectRatio === '9:16' ? '9:16' : 
                          config.aspectRatio === '4:3' ? '4:3' : 
                          config.aspectRatio === '3:4' ? '3:4' : '1:1';
      
      const response = await retryWithBackoff<any>(() => ai.models.generateImages({
        model: model,
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: mappedAspect,
        },
      }));

      const base64EncodeString = response.generatedImages?.[0]?.image?.imageBytes;
      if (!base64EncodeString) {
        throw new Error(`Imagen model ${model} did not return image bytes.`);
      }
      return `data:image/png;base64,${base64EncodeString}`;
    } else {
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

      // Configure image options
      const imageConfigParams: any = {
        aspectRatio: config.aspectRatio
      };
      
      if (model === 'gemini-3-pro-image-preview' || model === 'gemini-3-pro-image') {
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

      const responseParts = candidate.content?.parts || [];
      for (const part of responseParts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      
      const textResponse = responseParts.map(p => p.text).filter(Boolean).join(' ');
      if (textResponse) {
        throw new Error(`Visualization failed: ${textResponse}`);
      }
      
      throw new Error("Visualization failed to materialize. The model returned an empty response.");
    }
  };

  const modelsToTry = [
    IMAGE_MODEL,
    'gemini-3.1-flash-image',
    FALLBACK_IMAGE_MODEL,
    'imagen-4.0-generate-001',
    'gemini-3-pro-image-preview',
    'gemini-3-pro-image'
  ];

  let lastError: any = null;
  for (const modelToAttempt of modelsToTry) {
    try {
      console.log(`[Gemini Server Service] Attempting image generation with model: ${modelToAttempt}`);
      const promises = Array(config.numberOfImages).fill(null).map(() => performGeneration(modelToAttempt));
      const results = await Promise.all(promises);
      return results;
    } catch (err: any) {
      console.warn(`[Gemini Server Service] Image model ${modelToAttempt} failed:`, err.message || err);
      lastError = err;
    }
  }

  console.error("All image generation models exhausted:", lastError);
  const errorMessage = lastError?.message || JSON.stringify(lastError);
  throw new Error(
    `Image generation quota exceeded or service at capacity. Error details: ${errorMessage}`
  );
};

export const upscaleImage = async (
  imageUrl: string,
  prompt: string
): Promise<string> => {
  const ai = getAI();
  const model = 'gemini-3.1-flash-image-preview';

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
        aspectRatio: '1:1'
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
  const ai = getAI();
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
  const ai = getAI();
  const model = 'veo-3.1-lite-generate-preview';

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
    request.image = {
      imageBytes: images[0].data,
      mimeType: images[0].mimeType
    };
  }

  let operation = await ai.models.generateVideos(request);

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) {
    throw new Error("Video generation failed. The visualization engine returned an empty response.");
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  const fetchUrl = `${videoUri}?key=${apiKey}`;
  const response = await fetch(fetchUrl);

  if (!response.ok) {
    throw new Error("Failed to download generated video.");
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:video/mp4;base64,${base64}`;
};

export const generateSpeech = async (
  text: string,
  voiceName: string = 'Kore',
  style: string = 'Normal',
  pitch: number = 1.0,
  speed: number = 1.0
): Promise<string> => {
  const ai = getAI();
  
  const performSpeechGeneration = async (modelName: string) => {
    let prompt = text;
    const modifiers: string[] = [];
    if (style !== 'Normal') modifiers.push(`in a ${style} style`);
    if (pitch !== 1.0) modifiers.push(`with a ${pitch > 1.0 ? 'higher' : 'lower'} pitch (${pitch}x)`);
    if (speed !== 1.0) modifiers.push(`at a ${speed > 1.0 ? 'faster' : 'slower'} speed (${speed}x)`);

    if (modifiers.length > 0) {
      prompt = `Say ${modifiers.join(', ')}: ${text}`;
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { 
              voiceName: voiceName 
            }
          }
        }
      }
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!audioPart || !audioPart.inlineData) throw new Error("Speech generation failed.");
    
    return `data:${audioPart.inlineData.mimeType || 'audio/mp3'};base64,${audioPart.inlineData.data}`;
  };

  try {
    return await retryWithBackoff(() => performSpeechGeneration(SPEECH_MODEL));
  } catch (error: any) {
    console.error("Speech Generation Error:", error);
    throw error;
  }
};

export const extractDirectives = async (conversationText: string): Promise<string[]> => {
  const ai = getAI();
  const prompt = `You are a cognitive tuning engineer for the "neur.ally" multi-agent platform.
Analyze the following conversation session where a user describes their communication preferences, expectations, goals, and feedback for their AI assistant.

Dialogue history:
${conversationText}

Your task is to distill this conversation into a clean JSON array of explicit, highly specific, and actionable rules (Directives).
- Directives should be things like: "Be extremely concise, avoiding preambles.", "Wrap all coding advice in modular TypeScript blocks.", "Maintain a highly analytical, first-principles logic.", "Integrate structured checkbox lists for complex operations."
- Focus on how the user wants the agent to interact, format, structure, or tone its response.
- Do NOT output preamble, conversational explanations, or markdown code blocks other than a clean JSON array of strings under 120 chars each.
- Output a maximum of 6 best-extracted directives.

Output format:
["directive 1", "directive 2", "directive 3"]`;

  const modelsToTry = [
    FALLBACK_MODEL_NAME,
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-3.1-pro-preview'
  ];

  let lastError: any = null;
  for (const modelToAttempt of modelsToTry) {
    try {
      const response = await retryWithBackoff<any>(() => ai.models.generateContent({
        model: modelToAttempt,
        contents: prompt
      }));
      const cleanedText = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '[]';
      const parsed = JSON.parse(cleanedText);
      if (Array.isArray(parsed)) {
        return parsed.map(p => String(p).trim()).filter(Boolean);
      }
      return [];
    } catch (err: any) {
      console.warn(`[Gemini Server Service] extractDirectives failed with model ${modelToAttempt}:`, err.message || err);
      lastError = err;
    }
  }

  console.error("All extractDirectives models exhausted:", lastError);
  return [];
};

export const streamResponse = async (
  history: Message[],
  newMessage: string,
  attachments: Attachment[] | null,
  onChunk: (text: string, sources?: GroundingSource[]) => void,
  signalState: { aborted: boolean },
  useFastModel: boolean = false,
  userProfile?: UserProfile | null,
  projectContext?: { name: string; description: string } | null,
  intent?: Intent
): Promise<StreamResponseResult> => {
  const ai = getAI();
  const selectedModel = useFastModel ? FALLBACK_MODEL_NAME : MODEL_NAME;

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
- Multi-Agent Protocol: v${userProfile.protocolVersion || '2.4'} (Stage ${userProfile.protocolStage || 1})
- Sync Index: ${userProfile.syncIndex || 98}%

COGNITIVE ALIGNMENT:
- Analytical: ${userProfile.cognitiveAlignment?.analytical || 50}%
- Creative: ${userProfile.cognitiveAlignment?.creative || 50}%
- Strategic: ${userProfile.cognitiveAlignment?.strategic || 50}%
- Empathic: ${userProfile.cognitiveAlignment?.empathic || 50}%

ADAPTATION RULES:
1. Address the user by name if appropriate.
2. Align advice with the user's role and expertise.
3. Respect the stated constraints in all strategic suggestions.
4. Maintain a ${userProfile.preferences.tone} tone.
5. Prioritize the user's strategic goals in decision support.
6. COGNITIVE CALIBRATION: ${
  (userProfile.cognitiveAlignment?.analytical || 50) > 70 ? "Prioritize data-driven logic and first-principles thinking. " : ""
}${
  (userProfile.cognitiveAlignment?.creative || 50) > 70 ? "Encourage abstract connections and lateral ideation. " : ""
}${
  (userProfile.cognitiveAlignment?.strategic || 50) > 70 ? "Focus on long-term implications and leverage points. " : ""
}${
  (userProfile.cognitiveAlignment?.empathic || 50) > 70 ? "Acknowledge emotional context and maintain a supportive presence. " : ""
}
7. PROTOCOL CALIBRATION: ${
  (userProfile.protocolStage || 1) >= 4 ? "Act as a high-level cognitive partner, utilizing advanced synthesis and cross-domain pattern matching. " : "Focus on execution and strategic alignment with user-defined benchmarks. "
}
8. CUSTOM RETRIEVED DIRECTIVES: ${
  userProfile.customDirectives && userProfile.customDirectives.length > 0
    ? "You MUST strictly obey the following user-authored rules: " + userProfile.customDirectives.map((d, idx) => `[Directive ${idx + 1}] ${d}`).join(". ")
    : "No custom interactions saved yet."
}
`;
  }

  if (intent) {
    personalizedInstruction += `
DETECTED INTENT: ${intent.toUpperCase()}
- Priority: ${intent === 'query' ? 'Direct Accuracy' : intent === 'analyze' ? 'Strategic Depth' : intent === 'generate' ? 'Creative Execution' : 'Utility'}
- Processing Level: ${intent === 'analyze' ? 'Deep Reflection' : 'Direct Action'}
`;
  }

  if (projectContext) {
    personalizedInstruction += `
CURRENT PROJECT CONTEXT:
- Project Name: ${projectContext.name}
- Project Description: ${projectContext.description || 'No description provided'}

ADAPTATION RULES FOR PROJECT:
1. Keep responses relevant to the current project context.
2. Refer to the project name when appropriate.
`;
  }

  personalizedInstruction += `
CURRENT INTELLIGENCE LEVEL: ${useFastModel ? 'LITE' : 'DEEP'}
- Operate in ${useFastModel ? 'LITE' : 'DEEP'} mode as defined in your Response Behavior rules.
`;

  const MAX_HISTORY = 20;
  const contents: Content[] = history
    .filter(msg => msg.text || msg.attachment || msg.attachments || (msg.generatedImageUrls && msg.generatedImageUrls.length > 0) || msg.generatedImageUrl)
    .slice(-MAX_HISTORY)
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
                description: "Generate a new image based on the user's prompt. ONLY call this if the user explicitly asks to generate, create, or draw an image. DO NOT call this if the user is asking for prompt ideas, text descriptions, or help writing a prompt.",
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
                description: "Edit an existing image based on the user's prompt. ONLY call this if the user explicitly asks to edit or modify an image. DO NOT call this if the user is asking for prompt ideas.",
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
                description: "Generate a video based on the user's prompt. ONLY call this if the user explicitly asks to generate or create a video. DO NOT call this if the user is asking for prompt ideas.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    prompt: { type: Type.STRING, description: "The prompt to generate the video" },
                    aspectRatio: { type: Type.STRING, description: "The aspect ratio ('16:9' or '9:16')" }
                  },
                  required: ["prompt"]
                }
              },
              {
                name: "fetch_url",
                description: "Fetch and analyze the content of a web link (URL). Call this when the user provides a link and asks you to read, analyze, summarize, or describe it.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    url: { type: Type.STRING, description: "The full URL of the web page to fetch" }
                  },
                  required: ["url"]
                }
              }
            ]
          }
        ]
      },
    }));

    for await (const chunk of responseStream) {
      if (signalState.aborted) {
        throw new Error('AbortError');
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
        const cleanText = fullText.replace(/\[REQUIRES_PROCESSING\]/g, '').trim();
        onChunk(cleanText, sources.length > 0 ? sources : undefined);
      }

      if (c.functionCalls && c.functionCalls.length > 0) {
        const call = c.functionCalls[0];
        functionCall = {
          name: call.name || '',
          args: call.args
        };
        break;
      }
    }
    
    const requiresProcessing = fullText.includes('[REQUIRES_PROCESSING]');
    const finalCleanText = fullText.replace(/\[REQUIRES_PROCESSING\]/g, '').trim();
    
    return { text: finalCleanText, functionCall, requiresProcessing };
  };

  try {
    return await executeStream(selectedModel);
  } catch (error: any) {
    if (error.message === 'AbortError') throw error;
    
    const errorString = JSON.stringify(error, Object.getOwnPropertyNames(error));
    const messageString = error.message || '';
    const isOverloaded = 
      error.status === 429 || 
      error.code === 429 ||
      error.status === 503 || 
      error.code === 503 ||
      error.status === 404 ||
      error.code === 404 ||
      error.status === 403 ||
      error.code === 403 ||
      messageString.includes('429') || 
      messageString.includes('Too Many Requests') ||
      messageString.includes('RESOURCE_EXHAUSTED') ||
      messageString.includes('quota') ||
      messageString.includes('Quota exceeded') ||
      messageString.includes('503') || 
      messageString.includes('404') ||
      messageString.includes('403') ||
      messageString.includes('high demand') ||
      messageString.includes('UNAVAILABLE') ||
      messageString.includes('NOT_FOUND') ||
      messageString.includes('PERMISSION_DENIED') ||
      messageString.includes('Requested entity was not found') ||
      errorString.includes('429') ||
      errorString.includes('RESOURCE_EXHAUSTED') ||
      errorString.includes('quota') ||
      errorString.includes('503') ||
      errorString.includes('404') ||
      errorString.includes('403') ||
      errorString.includes('UNAVAILABLE') ||
      errorString.includes('NOT_FOUND') ||
      errorString.includes('PERMISSION_DENIED');

    if (isOverloaded) {
       const reason = (error.status === 429 || error.code === 429 || messageString.includes('429') || messageString.includes('quota')) ? 'Quota Exceeded' :
                      (error.status === 404 || error.code === 404 || messageString.includes('404')) ? 'Model Not Found' : 
                      (error.status === 403 || error.code === 403 || messageString.includes('403')) ? 'Permission Denied' : 'Service Overloaded';
       
       const backupModels: string[] = [];
       if (selectedModel !== FALLBACK_MODEL_NAME) {
         backupModels.push(FALLBACK_MODEL_NAME);
       }
       backupModels.push('gemini-flash-latest');
        backupModels.push('gemini-3.1-pro-preview');
       backupModels.push('gemini-3-flash-preview');
       backupModels.push('gemini-3.1-flash-lite');
       
       console.warn(`[Gemini Server Service] Primary model ${selectedModel} failed (${reason}). Routing through backup cascade:`, backupModels);
       
       for (const backup of backupModels) {
         try {
           console.log(`[Gemini Server Service] Attempting execution with fallback model: ${backup}`);
           return await executeStream(backup);
         } catch (fallbackError: any) {
           if (fallbackError.message === 'AbortError') throw fallbackError;
           console.warn(`[Gemini Server Service] Fallback model ${backup} also failed:`, fallbackError.message || fallbackError);
         }
       }
    }

    console.error("Gemini API Error:", error);
    throw error;
  }
};
