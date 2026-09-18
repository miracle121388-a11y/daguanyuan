import {dreamJobSchema, type DreamEntry} from './types';

let database: Promise<IDBDatabase> | undefined;
function open() {
  return database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('daguanyuan-dream-album', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('paintings', {keyPath: 'id'});
    request.onsuccess = () => resolve(request.result); request.onerror = () => {database = undefined; reject(request.error);};
  });
}
export async function savedDreams(): Promise<DreamEntry[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const request = db.transaction('paintings').objectStore('paintings').getAll();
    request.onsuccess = () => {const out: DreamEntry[] = []; for (const raw of request.result) {const parsed = dreamJobSchema.safeParse(raw.job); if (parsed.success) out.push({job: parsed.data, image: raw.image, favorite: !!raw.favorite, savedAt: raw.savedAt});} resolve(out);};
    request.onerror = () => reject(request.error);
  });
}
export async function saveDream(entry: DreamEntry) {
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('paintings', 'readwrite');
    transaction.objectStore('paintings').put({id: entry.job.id, job: dreamJobSchema.parse(entry.job), image: entry.image, favorite: entry.favorite, savedAt: entry.savedAt});
    transaction.oncomplete = () => resolve(); transaction.onabort = transaction.onerror = () => reject(transaction.error);
  });
}
