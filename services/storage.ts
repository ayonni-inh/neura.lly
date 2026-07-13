import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

let isStorageHealthy = true;


export const storageService = {
  async uploadBase64(path: string, base64Data: string): Promise<string> {
    if (!isStorageHealthy) {
      throw new Error("Firebase Storage is flagged as offline/unprovisioned. Bypassing upload to local database.");
    }

    const storageRef = ref(storage, path);
    
    try {
      // Convert base64 data URL to a Blob for more reliable uploadBytes
      const response = await fetch(base64Data);
      const blob = await response.blob();
      
      const uploadPromise = async () => {
        await uploadBytes(storageRef, blob);
        return await getDownloadURL(storageRef);
      };

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Firebase Storage upload timed out (2.5s scale limit).")), 2500)
      );

      const result = await Promise.race([uploadPromise(), timeoutPromise]);
      return result;
    } catch (error) {
      console.warn(`[Storage Service] Upload failed or timed out for ${path}. Marking storage as unhealthy for this session:`, error);
      isStorageHealthy = false;
      throw error;
    }
  },
  async deleteFile(path: string) {
    if (!isStorageHealthy) return;
    const storageRef = ref(storage, path);
    try {
      await deleteObject(storageRef);
    } catch (e) {
      console.warn("Failed to delete file from storage", e);
    }
  }
};

