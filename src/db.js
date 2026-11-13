// Stockage : IndexedDB (principal) + copie dans localStorage (secours).
const DB = 'norsk-reisen', STORE = 'kv', KEY = 'state', LS = 'norsk-reisen-state';

function open() {
  return new Promise((res, rej) => {
    if (!('indexedDB' in window)) return rej(new Error('no idb'));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function dbGet() {
  let fromIdb = null, fromLs = null;
  try {
    const db = await open();
    fromIdb = await new Promise((res, rej) => {
      const q = db.transaction(STORE).objectStore(STORE).get(KEY);
      q.onsuccess = () => res(q.result || null);
      q.onerror = () => rej(q.error);
    });
  } catch { /* ignoré */ }
  try { fromLs = JSON.parse(localStorage.getItem(LS) || 'null'); } catch { /* ignoré */ }
  // On garde la copie la plus récente.
  if (fromIdb && fromLs) return (fromLs.savedAt || 0) > (fromIdb.savedAt || 0) ? fromLs : fromIdb;
  return fromIdb || fromLs;
}

export async function dbSet(obj) {
  obj.savedAt = Date.now();
  try { localStorage.setItem(LS, JSON.stringify(obj)); } catch { /* ignoré */ }
  try {
    const db = await open();
    await new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(obj, KEY);
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
  } catch { /* ignoré */ }
}

export async function dbClear() {
  try { localStorage.removeItem(LS); } catch { /* ignoré */ }
  try {
    const db = await open();
    await new Promise((res) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = res;
    });
  } catch { /* ignoré */ }
}

export async function askPersist() {
  try { if (navigator.storage?.persist) await navigator.storage.persist(); } catch { /* ignoré */ }
}
