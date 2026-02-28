import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ChatSession, SavedImage, LogEntry, Task } from '../types';

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
}

const DB_NAME = 'neurally-db';
const DB_VERSION = 2; // Increment version for schema change

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
      },
    });
  }
  return dbPromise;
};

export const db = {
  async getSessions(): Promise<ChatSession[]> {
    const db = await initDB();
    return db.getAll('sessions');
  },
  async saveSession(session: ChatSession) {
    const db = await initDB();
    await db.put('sessions', session);
  },
  async deleteSession(id: string) {
    const db = await initDB();
    await db.delete('sessions', id);
  },
  async getImages(): Promise<SavedImage[]> {
    const db = await initDB();
    return db.getAll('images');
  },
  async saveImage(image: SavedImage) {
    const db = await initDB();
    await db.put('images', image);
  },
  async deleteImage(id: string) {
    const db = await initDB();
    await db.delete('images', id);
  },
  async addLog(entry: Omit<LogEntry, 'id'>) {
    const db = await initDB();
    await db.add('logs', entry);
  },
  async getLogs(): Promise<LogEntry[]> {
    const db = await initDB();
    return db.getAllFromIndex('logs', 'by-timestamp');
  },
  async clearLogs() {
    const db = await initDB();
    await db.clear('logs');
  },
  async getTasks(): Promise<Task[]> {
    const db = await initDB();
    return db.getAll('tasks');
  },
  async saveTask(task: Task) {
    const db = await initDB();
    await db.put('tasks', task);
  },
  async deleteTask(id: string) {
    const db = await initDB();
    await db.delete('tasks', id);
  }
};
