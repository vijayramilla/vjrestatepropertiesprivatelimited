import { useState } from 'react'

interface CacheEntry {
  data: unknown[]
  timestamp: number
}

const cache = new Map<string, CacheEntry>()

const CACHE_TTL = 5 * 60 * 1000

export function usePropertiesCache(cacheKey: string) {
  const [data, setData] = useState<unknown[]>(() => {
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }
    return []
  })

  const getCached = (key: string) => {
    const cached = cache.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }
    return null
  }

  const setCache = (key: string, newData: unknown[]) => {
    cache.set(key, { data: newData, timestamp: Date.now() })
    setData(newData)
  }

  return { data, setData, getCached, setCache }
}