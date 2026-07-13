import { removeBackground as imglyRemoveBackground, Config } from '@imgly/background-removal';
import { handleError } from '@/utils/errorHandler';

/**
 * Removes the background from an image and returns a transparent PNG as a base64 string.
 * @param imageSource - The source of the image (URL, File, Blob, or base64 string).
 * @returns A promise that resolves to a base64 string of the transparent PNG.
 */
export async function removeBackground(imageSource: string | File | Blob): Promise<string> {
  try {
    const config: Config = {
      output: {
        format: 'image/png',
        quality: 0.8
      },
      debug: true
    };

    const blob = await imglyRemoveBackground(imageSource, config);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Background removal failed:', error);
    handleError(error);
    throw error;
  }
}

/**
 * Converts a base64 string or URL to a Blob.
 */
export async function urlToBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  return await response.blob();
}
