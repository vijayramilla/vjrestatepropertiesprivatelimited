import { useState } from 'react'

interface CacheEntry {
  data: unknown[]
  timestamp: number
}

const memoryCache = new Map<string, CacheEntry>()

const CACHE_TTL = 5 * 60 * 1000
const LS_PREFIX = 'vjr_cache_'

function loadFromStorage(key: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key)
    if (!raw) return null
    return JSON.parse(raw) as CacheEntry
  } catch {
    return null
  }
}

function saveToStorage(key: string, entry: CacheEntry) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry))
  } catch { /* quota exceeded - ignore */ }
}

function readCache(key: string): CacheEntry | null {
  const mem = memoryCache.get(key)
  if (mem && Date.now() - mem.timestamp < CACHE_TTL) return mem
  const stored = loadFromStorage(key)
  if (stored && Date.now() - stored.timestamp < CACHE_TTL) {
    memoryCache.set(key, stored)
    return stored
  }
  return null
}

export function usePropertiesCache(cacheKey: string) {
  const [data, setData] = useState<unknown[]>(() => {
    const cached = readCache(cacheKey)
    return cached?.data ?? []
  })

  const getCached = (key: string) => {
    const cached = readCache(key)
    return cached?.data ?? null
  }

  const setCache = (key: string, newData: unknown[]) => {
    const entry: CacheEntry = { data: newData, timestamp: Date.now() }
    memoryCache.set(key, entry)
    saveToStorage(key, entry)
    setData(newData)
  }

  return { data, setData, getCached, setCache }
}