/* Shared by the download action and standalone reader. Never stores credentials. */
(function (root) {
  'use strict';
  const DB = 'devarena-reading-v1',
    OWNER = 'devarena-reading-owner',
    EPOCH = 'devarena-reading-epoch';
  let blocked = false;
  function owner() {
    try {
      return localStorage.getItem(OWNER);
    } catch {
      return null;
    }
  }
  function open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore('resources', {
          keyPath: ['userId', 'id'],
        });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(new Error('Close other DevArena tabs and retry.'));
    });
  }
  async function transaction(mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('resources', mode);
      let request;
      try {
        request = action(tx.objectStore('resources'));
      } catch (error) {
        db.close();
        reject(error);
        return;
      }
      tx.oncomplete = () => {
        db.close();
        resolve(request?.result);
      };
      tx.onerror = tx.onabort = () => {
        db.close();
        reject(tx.error || new Error('Storage failed.'));
      };
    });
  }
  async function clear() {
    blocked = true;
    localStorage.removeItem(OWNER);
    localStorage.removeItem(EPOCH);
    await transaction('readwrite', (store) => store.clear());
  }
  async function activate(userId) {
    if (!/^[0-9a-f-]{36}$/i.test(userId))
      throw new Error('Sign in before downloading.');
    const epoch = String(Date.now()) + Math.random();
    const changed = owner() !== userId;
    if (changed) {
      blocked = true;
      localStorage.removeItem(OWNER);
      localStorage.removeItem(EPOCH);
    }
    localStorage.setItem(EPOCH, epoch);
    if (changed) await transaction('readwrite', (store) => store.clear());
    if (localStorage.getItem(EPOCH) !== epoch)
      throw new Error('Your account changed. Sign in again.');
    localStorage.setItem(OWNER, userId);
    blocked = false;
  }
  function identity(expected) {
    if (blocked || !expected || owner() !== expected)
      throw new Error('Your account changed. Sign in again.');
  }
  function payload(input) {
    if (
      !input ||
      input.status !== 'published' ||
      typeof input.id !== 'string' ||
      typeof input.title !== 'string' ||
      !input.title.trim() ||
      typeof input.content !== 'string' ||
      !input.content.trim() ||
      input.content.length > 100000 ||
      typeof input.updated_at !== 'string'
    )
      throw new Error(
        'Only published resources with written content can be downloaded.',
      );
    const refs = (value) =>
      (Array.isArray(value) ? value : [])
        .slice(0, 50)
        .flatMap((item) =>
          item && typeof item.id === 'string' && typeof item.name === 'string'
            ? [{ id: item.id, name: item.name.slice(0, 200) }]
            : [],
        );
    // Explicit allowlist: never spread a raw API response here.
    return {
      id: input.id,
      title: input.title.slice(0, 200),
      content: input.content,
      description:
        typeof input.description === 'string'
          ? input.description.slice(0, 2000)
          : '',
      skills: refs(input.skills),
      topics: refs(input.topics),
      tags: (Array.isArray(input.tags) ? input.tags : [])
        .filter((tag) => typeof tag === 'string')
        .slice(0, 20)
        .map((tag) => tag.slice(0, 50)),
      attribution:
        typeof input.attribution === 'string'
          ? input.attribution.slice(0, 1000)
          : '',
      source: typeof input.source === 'string' ? input.source.slice(0, 80) : '',
      version: input.updated_at,
      downloadedAt: new Date().toISOString(),
      availability: 'available',
    };
  }
  async function save(userId, input) {
    identity(userId);
    const copy = payload(input);
    await transaction('readwrite', (store) => {
      identity(userId);
      return store.put({ ...copy, userId });
    });
    identity(userId);
  }
  async function list() {
    const userId = owner();
    if (!userId || blocked) return [];
    const rows = await transaction('readonly', (store) => store.getAll());
    identity(userId);
    return rows
      .filter((row) => row.userId === userId)
      .sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt));
  }
  async function remove(id) {
    const userId = owner();
    identity(userId);
    await transaction('readwrite', (store) => store.delete([userId, id]));
  }
  async function revalidate(id, version, unavailable = false) {
    const userId = owner();
    identity(userId);
    const db = await open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('resources', 'readwrite'),
        store = tx.objectStore('resources');
      const request = store.get([userId, id]);
      request.onsuccess = () => {
        const row = request.result;
        if (!row || owner() !== userId) return;
        row.availability =
          unavailable || !row.content
            ? 'unavailable'
            : row.version === version
              ? 'available'
              : 'stale';
        if (unavailable) row.content = '';
        store.put(row);
      };
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = tx.onabort = () => {
        db.close();
        reject(tx.error);
      };
    });
  }
  root.DevArenaOffline = {
    owner,
    activate,
    clear,
    payload,
    save,
    list,
    remove,
    revalidate,
  };
})(globalThis);
