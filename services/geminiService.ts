import { Message, Attachment, GroundingSource, ImageGenerationConfig, UserProfile, Intent, StreamResponseResult } from '../types';

// Highly robust fetch helper that automatically handles and retries transient issues (e.g. server booting, temporary gateways)
const robustFetch = async (url: string, options: RequestInit, retries = 3, delay = 1000): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      const contentType = response.headers.get('content-type');

      // Check for HTML response which usually indicates server restarting, Nginx bootup page, or unhandled gateway pages
      if (contentType && contentType.includes('text/html')) {
        const text = await response.text();
        if (text.trim().startsWith('<')) {
          console.warn(`[Gemini Client] Received HTML response from ${url} (attempt ${i + 1}/${retries}). Server may still be initializing or restarting.`);
          if (i < retries - 1) {
            await new Promise(res => setTimeout(res, delay * Math.pow(1.5, i)));
            continue;
          }
          throw new Error('The cognitive core is initializing. Please wait a few seconds and try again.');
        }
      }

      if (!response.ok) {
        let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
        try {
          if (contentType && contentType.includes('application/json')) {
            const errJson = await response.json();
            errorMsg = errJson.error || errJson.message || errorMsg;
          } else {
            errorMsg = await response.text();
          }
        } catch {}
        throw new Error(errorMsg);
      }

      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return response;
    } catch (error: any) {
      if (i === retries - 1) {
        throw error;
      }
      console.warn(`[Gemini Client] Request to ${url} failed (attempt ${i + 1}/${retries}). Retrying... Error:`, error.message || error);
      await new Promise(res => setTimeout(res, delay * Math.pow(1.5, i)));
    }
  }
};

export const detectIntent = async (text: string, attachments: Attachment[] | null): Promise<Intent> => {
  try {
    const data = await robustFetch('/api/gemini/detect-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, attachments })
    });
    return data.intent;
  } catch (error) {
    console.error('[Gemini Client] Intent detection failed:', error);
    throw error;
  }
};

export const enhanceImagePrompt = async (prompt: string, style?: string | boolean): Promise<string> => {
  try {
    const data = await robustFetch('/api/gemini/enhance-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, style })
    });
    return data.prompt;
  } catch (error) {
    console.error('[Gemini Client] Prompt enhancement failed:', error);
    throw error;
  }
};

export const generateImage = async (
  prompt: string, 
  config: ImageGenerationConfig, 
  contextAttachments?: Attachment[] | null
): Promise<string[]> => {
  try {
    const data = await robustFetch('/api/gemini/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, config, contextAttachments })
    });
    return data.images;
  } catch (error: any) {
    console.error('[Gemini Client] Image generation failed:', error);
    throw error;
  }
};

export const upscaleImage = async (
  imageUrl: string,
  prompt: string
): Promise<string> => {
  try {
    const data = await robustFetch('/api/gemini/upscale-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl, prompt })
    });
    return data.imageUrl;
  } catch (error) {
    console.error('[Gemini Client] Image upscaling failed:', error);
    throw error;
  }
};

export const editImage = async (
  prompt: string,
  images: Attachment[]
): Promise<string> => {
  try {
    const data = await robustFetch('/api/gemini/edit-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, images })
    });
    return data.imageUrl;
  } catch (error) {
    console.error('[Gemini Client] Image editing failed:', error);
    throw error;
  }
};

export const generateVideo = async (
  prompt: string,
  images?: Attachment[] | null,
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<string> => {
  try {
    const data = await robustFetch('/api/gemini/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, images, aspectRatio })
    });
    
    // Convert base64 data back to native object URL if server returns data URI
    if (data.videoUrl && data.videoUrl.startsWith('data:')) {
      const [header, base64Data] = data.videoUrl.split(',');
      const mimeType = header.split(':')[1].split(';')[0];
      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      return URL.createObjectURL(blob);
    }
    
    return data.videoUrl;
  } catch (error) {
    console.error('[Gemini Client] Video generation failed:', error);
    throw error;
  }
};

export const generateSpeech = async (
  text: string,
  voiceName: string = 'Kore',
  style: string = 'Normal',
  pitch: number = 1.0,
  speed: number = 1.0
): Promise<string> => {
  try {
    const data = await robustFetch('/api/gemini/generate-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceName, style, pitch, speed })
    });
    return data.speechUrl;
  } catch (error) {
    console.error('[Gemini Client] Speech generation failed:', error);
    throw error;
  }
};

export const extractDirectives = async (conversationText: string): Promise<string[]> => {
  try {
    const data = await robustFetch('/api/gemini/extract-directives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationText })
    });
    return data.directives;
  } catch (error) {
    console.error('[Gemini Client] Directives extraction failed:', error);
    return [];
  }
};

export const streamResponse = async (
  history: Message[],
  newMessage: string,
  attachments: Attachment[] | null,
  onChunk: (text: string, sources?: GroundingSource[]) => void,
  signal?: AbortSignal,
  useFastModel: boolean = false,
  userProfile?: UserProfile | null,
  projectContext?: { name: string; description: string } | null,
  intent?: Intent
): Promise<StreamResponseResult> => {
  try {
    const response = await fetch('/api/gemini/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history,
        newMessage,
        attachments,
        useFastModel,
        userProfile,
        projectContext,
        intent
      }),
      signal
    });

    // Check if the response is an HTML page (e.g. from server booting or Gateway)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      const text = await response.text();
      if (text.trim().startsWith('<')) {
        throw new Error('Neural network connection is still initializing. Please wait a few seconds.');
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr: any;
      try {
        parsedErr = JSON.parse(errText);
      } catch {
        parsedErr = { error: errText };
      }
      throw new Error(parsedErr?.error || 'Streaming connection failed');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let accumulatedText = '';
    let finalCleanText = '';
    let isDoneReported = false;
    let finalResult: StreamResponseResult = { text: '', requiresProcessing: false };

    // SSE event Parsing Loop
    let partialLine = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const currentChunk = partialLine + chunk;
      const lines = currentChunk.split('\n');
      
      // Save the last line if it's incomplete
      partialLine = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('data: ')) {
          const dataContent = trimmed.slice(6).trim();
          if (dataContent === '[DONE]') {
            isDoneReported = true;
            continue;
          }

          try {
            const parsed = JSON.parse(dataContent);
            if (parsed.error) {
              throw new Error(parsed.error);
            }

            if (parsed.done) {
              finalResult = {
                text: parsed.text || '',
                functionCall: parsed.functionCall,
                requiresProcessing: parsed.requiresProcessing
              };
            } else if (parsed.text !== undefined) {
              accumulatedText = parsed.text;
              finalCleanText = accumulatedText.replace(/\[REQUIRES_PROCESSING\]/g, '').trim();
              onChunk(finalCleanText, parsed.sources);
            }
          } catch (e) {
            console.error('[Gemini Client] Streaming parsing error:', e);
          }
        }
      }
    }

    // Process leftover line
    if (partialLine && partialLine.trim().startsWith('data: ')) {
      const trimmed = partialLine.trim();
      const dataContent = trimmed.slice(6).trim();
      if (dataContent !== '[DONE]') {
        try {
          const parsed = JSON.parse(dataContent);
          if (parsed.done) {
            finalResult = {
              text: parsed.text || '',
              functionCall: parsed.functionCall,
              requiresProcessing: parsed.requiresProcessing
            };
          }
        } catch {}
      }
    }

    if (!finalResult.text) {
      finalResult.text = finalCleanText;
    }

    return finalResult;
  } catch (error: any) {
    if (error.name === 'AbortError' || error.message === 'AbortError' || error.message?.includes('aborted') || error.name === 'DOMException' && error.message?.includes('Aborted')) {
      throw new DOMException('Aborted', 'AbortError');
    }
    console.error('[Gemini Client] Stream response error:', error);
    throw error;
  }
};
