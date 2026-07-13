import { ChatSession, SavedImage, LogEntry, Task, UserProfile, Project } from '../types';
import { db as firestore, auth } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, getDoc, query, orderBy, addDoc, serverTimestamp, Timestamp, getDocFromServer, FieldValue } from 'firebase/firestore';
import { handleError } from '@/utils/errorHandler';
import { storageService } from './storage';
import { localDb } from './localDb';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to remove undefined values recursively for Firestore
const sanitize = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date) && !(obj instanceof Timestamp) && !(obj instanceof FieldValue)) {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitize(v)])
    );
  }
  return obj;
};

export const db = {
  async testConnection() {
    try {
      await getDocFromServer(doc(firestore, 'test', 'connection'));
    } catch (error) {
      if(error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration. ");
      }
    }
  },
  async getSessions(): Promise<ChatSession[]> {
    if (!auth.currentUser) return [];
    const path = `users/${auth.currentUser.uid}/sessions`;
    try {
      const q = query(collection(firestore, path), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          updatedAt: data.updatedAt?.toDate() || new Date(),
          messages: data.messages.map((m: any) => ({
            ...m,
            timestamp: m.timestamp?.toDate() || new Date()
          }))
        } as ChatSession;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  async saveSession(session: ChatSession) {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/sessions/${session.id}`;
    try {
      // Offload attachments to Storage to avoid 1MB Firestore limit
      const processedMessages = await Promise.all(session.messages.map(async (msg) => {
        let updatedMsg = { ...msg };
        let changed = false;

        // Handle single attachment
        const hasLargeData = (msg.attachment?.data && msg.attachment.data.length > 20000) || 
                           (msg.attachment?.url && msg.attachment.url.startsWith('data:') && msg.attachment.url.length > 20000);
        
        if (msg.attachment && hasLargeData) {
          const storagePath = `users/${auth.currentUser!.uid}/sessions/${session.id}/attachments/${msg.attachment.id || Date.now()}`;
          const dataToUpload = msg.attachment.url.startsWith('data:') ? msg.attachment.url : `data:${msg.attachment.mimeType};base64,${msg.attachment.data}`;
          
          try {
            const url = await storageService.uploadBase64(storagePath, dataToUpload);
            updatedMsg.attachment = { ...msg.attachment, data: '', url };
            changed = true;
          } catch (e) {
            console.error("Failed to offload single attachment to storage", e);
            // Fallback to local IndexedDB
            try {
              await localDb.set(storagePath, dataToUpload);
              updatedMsg.attachment = { ...msg.attachment, data: '', url: `local://${storagePath}`, localUrl: storagePath };
              changed = true;
            } catch (localErr) {
              console.error("Local fallback failed", localErr);
              updatedMsg.attachment = { ...msg.attachment, data: '[Image too large - Storage failed]', url: '' };
              changed = true;
            }
          }
        }

        // Handle multiple attachments
        if (msg.attachments && msg.attachments.length > 0) {
          const processedAttachments = await Promise.all(msg.attachments.map(async (att) => {
            const isLarge = (att.data && att.data.length > 20000) || (att.url && att.url.startsWith('data:') && att.url.length > 20000);
            if (isLarge) {
              const storagePath = `users/${auth.currentUser!.uid}/sessions/${session.id}/attachments/${att.id}`;
              const dataToUpload = att.url.startsWith('data:') ? att.url : `data:${att.mimeType};base64,${att.data}`;
              
              try {
                const url = await storageService.uploadBase64(storagePath, dataToUpload);
                changed = true;
                return { ...att, data: '', url }; // Store URL, clear base64
              } catch (e) {
                console.error(`Failed to offload attachment ${att.id} to storage`, e);
                try {
                  await localDb.set(storagePath, dataToUpload);
                  changed = true;
                  return { ...att, data: '', url: `local://${storagePath}`, localUrl: storagePath };
                } catch (localErr) {
                  changed = true;
                  return { ...att, data: '[Image too large - Storage failed]', url: '' };
                }
              }
            }
            return att;
          }));
          if (changed) {
            updatedMsg.attachments = processedAttachments;
          }
        }

        // Also check generatedImageUrl (singular - deprecated but might be present)
        if (msg.generatedImageUrl && msg.generatedImageUrl.startsWith('data:') && msg.generatedImageUrl.length > 20000) {
          const storagePath = `users/${auth.currentUser!.uid}/sessions/${session.id}/generated/${msg.id}_main`;
          try {
            updatedMsg.generatedImageUrl = await storageService.uploadBase64(storagePath, msg.generatedImageUrl);
            changed = true;
          } catch (e) {
            console.error("Failed to offload generated image to storage", e);
            try {
              await localDb.set(storagePath, msg.generatedImageUrl);
              updatedMsg.generatedImageUrl = `local://${storagePath}`;
              changed = true;
            } catch (localErr) {
              updatedMsg.generatedImageUrl = '[Image too large - Storage failed]';
              changed = true;
            }
          }
        }

        // Also check generatedImageUrls
        if (msg.generatedImageUrls) {
          const processedUrls = await Promise.all(msg.generatedImageUrls.map(async (url, idx) => {
            if (url.startsWith('data:') && url.length > 20000) {
              const storagePath = `users/${auth.currentUser!.uid}/sessions/${session.id}/generated/${msg.id}_${idx}`;
              try {
                const storageUrl = await storageService.uploadBase64(storagePath, url);
                changed = true;
                return storageUrl;
              } catch (e) {
                console.error(`Failed to offload generated image ${idx} to storage`, e);
                try {
                  await localDb.set(storagePath, url);
                  changed = true;
                  return `local://${storagePath}`;
                } catch (localErr) {
                  if (url.length > 20000) {
                    changed = true;
                    return '[Image too large - Storage failed]';
                  }
                  return url;
                }
              }
            }
            return url;
          }));
          if (changed) {
            updatedMsg.generatedImageUrls = processedUrls;
          }
        }

        // Also check generatedVideoUrl
        if (msg.generatedVideoUrl && msg.generatedVideoUrl.startsWith('data:') && msg.generatedVideoUrl.length > 20000) {
          const storagePath = `users/${auth.currentUser!.uid}/sessions/${session.id}/generated/${msg.id}_video`;
          try {
            updatedMsg.generatedVideoUrl = await storageService.uploadBase64(storagePath, msg.generatedVideoUrl);
            changed = true;
          } catch (e) {
            console.error("Failed to offload generated video to storage", e);
            try {
              await localDb.set(storagePath, msg.generatedVideoUrl);
              updatedMsg.generatedVideoUrl = `local://${storagePath}`;
              changed = true;
            } catch (localErr) {
              updatedMsg.generatedVideoUrl = '[Video too large - Storage failed]';
              changed = true;
            }
          }
        }

        // Also check generatedAudioUrl
        if (msg.generatedAudioUrl && msg.generatedAudioUrl.startsWith('data:') && msg.generatedAudioUrl.length > 20000) {
          const storagePath = `users/${auth.currentUser!.uid}/sessions/${session.id}/generated/${msg.id}_audio`;
          try {
            updatedMsg.generatedAudioUrl = await storageService.uploadBase64(storagePath, msg.generatedAudioUrl);
            changed = true;
          } catch (e) {
            console.error("Failed to offload generated audio to storage", e);
            try {
              await localDb.set(storagePath, msg.generatedAudioUrl);
              updatedMsg.generatedAudioUrl = `local://${storagePath}`;
              changed = true;
            } catch (localErr) {
              updatedMsg.generatedAudioUrl = '[Audio too large - Storage failed]';
              changed = true;
            }
          }
        }

        // Final safety check: truncate any remaining huge strings in the message
        const finalMsg = { ...updatedMsg };
        Object.keys(finalMsg).forEach(key => {
          const val = (finalMsg as any)[key];
          if (typeof val === 'string' && val.length > 100000) { // 100KB safety limit
            console.warn(`Truncating huge string in message field: ${key} (${val.length} chars)`);
            (finalMsg as any)[key] = val.slice(0, 1000) + '... [TRUNCATED DUE TO SIZE]';
          }
        });

        return finalMsg;
      }));

      const sanitizedSession = sanitize({
        ...session,
        messages: processedMessages,
        updatedAt: serverTimestamp()
      });
      await setDoc(doc(firestore, `users/${auth.currentUser.uid}/sessions`, session.id), sanitizedSession);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
  async deleteSession(id: string) {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/sessions/${id}`;
    try {
      await deleteDoc(doc(firestore, `users/${auth.currentUser.uid}/sessions`, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
  async getImages(): Promise<SavedImage[]> {
    if (!auth.currentUser) return [];
    const path = `users/${auth.currentUser.uid}/images`;
    try {
      const q = query(collection(firestore, path), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        } as SavedImage;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  async saveImage(image: SavedImage) {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/images/${image.id}`;
    try {
      let url = image.url;
      // Offload images to Storage
      if (url.startsWith('data:') && url.length > 20000) {
        const storagePath = `users/${auth.currentUser.uid}/images/${image.id}`;
        try {
          url = await storageService.uploadBase64(storagePath, url);
        } catch (e) {
          console.error("Failed to offload image to storage", e);
          // Fallback to local IndexedDB
          try {
            await localDb.set(storagePath, url);
            url = `local://${storagePath}`;
          } catch (localErr) {
            // If storage fails and it's large, we MUST remove it to allow Firestore save
            url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='; // Placeholder 1x1
          }
        }
      }

      await setDoc(doc(firestore, `users/${auth.currentUser.uid}/images`, image.id), sanitize({
        ...image,
        url,
        timestamp: serverTimestamp()
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
  async deleteImage(id: string) {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/images/${id}`;
    try {
      await deleteDoc(doc(firestore, `users/${auth.currentUser.uid}/images`, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
  async addLog(entry: Omit<LogEntry, 'id'>) {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/logs`;
    try {
      await addDoc(collection(firestore, path), sanitize({
        ...entry,
        timestamp: serverTimestamp()
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  async getLogs(): Promise<LogEntry[]> {
    if (!auth.currentUser) return [];
    const path = `users/${auth.currentUser.uid}/logs`;
    try {
      const q = query(collection(firestore, path), orderBy('timestamp', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        } as unknown as LogEntry;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  async clearLogs() {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/logs`;
    try {
      const snapshot = await getDocs(collection(firestore, path));
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
  async getTasks(): Promise<Task[]> {
    if (!auth.currentUser) return [];
    const path = `users/${auth.currentUser.uid}/tasks`;
    try {
      const q = query(collection(firestore, path), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as Task;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  async saveTask(task: Task) {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/tasks/${task.id}`;
    try {
      await setDoc(doc(firestore, `users/${auth.currentUser.uid}/tasks`, task.id), sanitize({
        ...task,
        createdAt: task.createdAt instanceof Date ? task.createdAt : serverTimestamp()
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
  async deleteTask(id: string) {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/tasks/${id}`;
    try {
      await deleteDoc(doc(firestore, `users/${auth.currentUser.uid}/tasks`, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
  async getProfile(): Promise<UserProfile | null> {
    if (!auth.currentUser) return null;
    const path = `users/${auth.currentUser.uid}/profile/main`;
    try {
      const docRef = doc(firestore, path);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          usage: {
            ...data.usage,
            lastReset: data.usage?.lastReset?.toDate() || new Date()
          }
        } as UserProfile;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },
  async saveProfile(profile: UserProfile) {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/profile/main`;
    try {
      let avatar = profile.avatar;
      // Offload large avatars to Storage
      if (avatar && avatar.startsWith('data:') && avatar.length > 20000) {
        const storagePath = `users/${auth.currentUser.uid}/profile/avatar`;
        try {
          avatar = await storageService.uploadBase64(storagePath, avatar);
        } catch (e) {
          console.error("Failed to offload avatar to storage", e);
          try {
            await localDb.set(storagePath, avatar);
            avatar = `local://${storagePath}`;
          } catch (localErr) {
            if (avatar.length > 50000) {
              avatar = ''; // Strip if too large and storage fails
            }
          }
        }
      }

      await setDoc(doc(firestore, path), sanitize({
        ...profile,
        avatar,
        updatedAt: serverTimestamp()
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
  async trackActivity(action: string, metadata?: any) {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/activities`;
    try {
      await addDoc(collection(firestore, path), sanitize({
        action,
        metadata,
        timestamp: serverTimestamp()
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  async getActivities(): Promise<any[]> {
    if (!auth.currentUser) return [];
    const path = `users/${auth.currentUser.uid}/activities`;
    try {
      const q = query(collection(firestore, path), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  async getProjects(): Promise<Project[]> {
    if (!auth.currentUser) return [];
    const path = `users/${auth.currentUser.uid}/projects`;
    try {
      const q = query(collection(firestore, path), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Project;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  async saveProject(project: Project) {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/projects/${project.id}`;
    try {
      await setDoc(doc(firestore, path), sanitize({
        ...project,
        createdAt: project.createdAt instanceof Date ? project.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp()
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
  async deleteProject(id: string) {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/projects/${id}`;
    try {
      await deleteDoc(doc(firestore, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};
