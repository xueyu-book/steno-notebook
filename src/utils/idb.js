const DB_NAME = 'ZeroNotesDB'
const DB_VERSION = 1
const STORE_NAME = 'store'

let db = null
let memoryMode = false
const memoryStore = new Map()

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function attachDb(next) {
  db = next
  db.onversionchange = () => {
    db.close()
    db = null
  }
  db.onclose = () => {
    db = null
  }
  return db
}

export async function openDB() {
  if (memoryMode) return null
  if (db) return db

  if (!globalThis.indexedDB) {
    memoryMode = true
    return null
  }

  try {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const next = event.target.result
      if (!next.objectStoreNames.contains(STORE_NAME)) {
        next.createObjectStore(STORE_NAME)
      }
    }
    return attachDb(await requestToPromise(request))
  } catch {
    memoryMode = true
    db = null
    return null
  }
}

async function ensureDB() {
  if (memoryMode) return null
  if (db) return db
  return openDB()
}

function withStore(mode) {
  if (!db) throw new Error('IndexedDB 未初始化')
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME)
}

function toCloneable(value) {
  return JSON.parse(JSON.stringify(value))
}

export async function idbGet(key) {
  await ensureDB()
  if (memoryMode) return memoryStore.has(key) ? memoryStore.get(key) : null
  const result = await requestToPromise(withStore('readonly').get(key))
  return result ?? null
}

export async function idbSet(key, value) {
  await ensureDB()
  const payload = toCloneable(value)
  if (memoryMode) {
    memoryStore.set(key, payload)
    return
  }
  try {
    await requestToPromise(withStore('readwrite').put(payload, key))
  } catch {
    memoryMode = true
    memoryStore.set(key, payload)
  }
}

export async function idbRemove(key) {
  await ensureDB()
  if (memoryMode) {
    memoryStore.delete(key)
    return
  }
  await requestToPromise(withStore('readwrite').delete(key))
}

const LEGACY_KEYS = ['notes', 'noteRecords', 'noteStats', 'websites', 'websiteGroups', 'md_notes']

export async function migrateFromLocalStorage() {
  const migrated = await idbGet('__migrated_from_ls__')
  if (migrated) return

  for (const key of LEGACY_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw == null) continue
    try {
      await idbSet(key, JSON.parse(raw))
    } catch {
      /* ignore malformed legacy data */
    }
  }

  await idbSet('__migrated_from_ls__', true)
}

export function isMemoryFallback() {
  return memoryMode
}
