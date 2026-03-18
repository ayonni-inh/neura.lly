import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ChatSession, SavedImage, LogEntry, Task, UserProfile } from '../types';
import { supabase } from '../utils/supabase';

interface NeurAllyDB extends DBSchema {
  sessions: {
    key: string;
    value: ChatSession;
  };
  images: {
    key: string;
    value: SavedImage;
  };
  logs: {
    key: number;
    value: LogEntry;
    indexes: { 'by-timestamp': Date };
  };
  tasks: {
    key: string;
    value: Task;
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'neurally-db';
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<NeurAllyDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<NeurAllyDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('logs')) {
          const logStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
          logStore.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
};

export const db = {
  async getSessions(): Promise<ChatSession[]> {
    const client = supabase;
    if (client) {
      const { data, error } = await client.from('sessions').select('*');
      if (!error && data) return data as ChatSession[];
    }
    const db = await initDB();
    return db.getAll('sessions');
  },
  async saveSession(session: ChatSession) {
    const client = supabase;
    if (client) {
      await client.from('sessions').upsert({
        id: session.id,
        title: session.title,
        messages: session.messages,
        updated_at: session.updatedAt
      });
    }
    const db = await initDB();
    await db.put('sessions', session);
  },
  async deleteSession(id: string) {
    const client = supabase;
    if (client) {
      await client.from('sessions').delete().eq('id', id);
    }
    const db = await initDB();
    await db.delete('sessions', id);
  },
  async getImages(): Promise<SavedImage[]> {
    const client = supabase;
    if (client) {
      const { data, error } = await client.from('images').select('*');
      if (!error && data) return data as SavedImage[];
    }
    const db = await initDB();
    return db.getAll('images');
  },
  async saveImage(image: SavedImage) {
    const client = supabase;
    if (client) {
      await client.from('images').upsert({
        id: image.id,
        url: image.url,
        prompt: image.prompt,
        timestamp: image.timestamp
      });
    }
    const db = await initDB();
    await db.put('images', image);
  },
  async deleteImage(id: string) {
    const client = supabase;
    if (client) {
      await client.from('images').delete().eq('id', id);
    }
    const db = await initDB();
    await db.delete('images', id);
  },
  async addLog(entry: Omit<LogEntry, 'id'>) {
    const client = supabase;
    if (client) {
      await client.from('logs').insert({
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        details: entry.details
      });
    }
    const db = await initDB();
    await db.add('logs', entry);
  },
  async getLogs(): Promise<LogEntry[]> {
    const client = supabase;
    if (client) {
      const { data, error } = await client.from('logs').select('*').order('timestamp', { ascending: true });
      if (!error && data) return data as LogEntry[];
    }
    const db = await initDB();
    return db.getAllFromIndex('logs', 'by-timestamp');
  },
  async clearLogs() {
    const client = supabase;
    if (client) {
      await client.from('logs').delete().neq('id', 0); // Delete all
    }
    const db = await initDB();
    await db.clear('logs');
  },
  async getTasks(): Promise<Task[]> {
    const client = supabase;
    if (client) {
      const { data, error } = await client.from('tasks').select('*');
      if (!error && data) return data as Task[];
    }
    const db = await initDB();
    return db.getAll('tasks');
  },
  async saveTask(task: Task) {
    const client = supabase;
    if (client) {
      await client.from('tasks').upsert({
        id: task.id,
        text: task.text,
        completed: task.completed,
        priority: task.priority,
        created_at: task.createdAt
      });
    }
    const db = await initDB();
    await db.put('tasks', task);
  },
  async deleteTask(id: string) {
    const client = supabase;
    if (client) {
      await client.from('tasks').delete().eq('id', id);
    }
    const db = await initDB();
    await db.delete('tasks', id);
  },
  async getProfile(): Promise<UserProfile | null> {
    const client = supabase;
    if (client) {
      const { data, error } = await client.from('profiles').select('*').single();
      if (!error && data) {
        return {
          name: data.name,
          role: data.role,
          goals: data.goals,
          constraints: data.constraints,
          preferences: data.preferences
        } as UserProfile;
      }
    }
    const db = await initDB();
    return db.get('settings', 'user-profile');
  },
  async saveProfile(profile: UserProfile) {
    const client = supabase;
    if (client) {
      await client.from('profiles').upsert({
        name: profile.name,
        role: profile.role,
        goals: profile.goals,
        constraints: profile.constraints,
        preferences: profile.preferences,
        updated_at: new Date()
      });
    }
    const db = await initDB();
    await db.put('settings', profile, 'user-profile');
  },
  async trackActivity(action: string, metadata?: any) {
    const client = supabase;
    if (client) {
      await client.from('activities').insert({
        action,
        metadata,
        timestamp: new Date()
      });
    }
    // We could also store this in IndexedDB if we wanted a local history
  }
};
