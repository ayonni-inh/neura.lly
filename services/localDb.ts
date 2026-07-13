
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'neurAlly_local_storage';
const STORE_NAME = 'assets';
const VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
};

export const localDb = {
  async set(key: string, value: any): Promise<void> {
    const db = await getDB();
    await db.put(STORE_NAME, value, key);
  },

  async get(key: string): Promise<any> {
    const db = await getDB();
    return await db.get(STORE_NAME, key);
  },

  async delete(key: string): Promise<void> {
    const db = await getDB();
    await db.delete(STORE_NAME, key);
  },

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear(STORE_NAME);
  }
};
