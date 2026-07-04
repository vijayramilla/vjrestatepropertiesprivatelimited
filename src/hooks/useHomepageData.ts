import { useEffect, useState } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface DashboardProperty {
  id: string
  title: string
  type: string
  location: string
  area: string
  price: number
  price_label?: string
  area_sqft?: number
  monthly_rental?: string
  images?: string[]
  image?: string
}

function toDashboardProp(doc: FirebaseDocumentSnapshot): DashboardProperty {
  const data = doc.data?.() ?? doc
  return {
    id: doc.id ?? data.id,
    title: data.title ?? 'Untitled',
    type: data.type ?? '',
    location: data.location ?? data.area ?? '',
    area: data.area ?? '',
    price: data.price ?? 0,
    price_label: data.price_label ?? '',
    area_sqft: data.area_sqft ?? 0,
    monthly_rental: data.monthly_rental ?? null,
    images: data.images ?? [],
    image: data.images?.[0] ?? '',
  }
}

export function useFeaturedProperties() {
  const [properties, setProperties] = useState<DashboardProperty[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetch = async () => {
      try {
        const q = query(
          collection(db, 'properties'),
          where('featured', '==', true),
          limit(4),
        )
        const snap = await getDocs(q)
        let data = snap.docs.map((d) => toDashboardProp({ id: d.id, ...d.data() }))

        if (data.length === 0) {
          const q2 = query(
            collection(db, 'properties'),
            orderBy('createdAt', 'desc'),
            limit(4),
          )
          const snap2 = await getDocs(q2)
          data = snap2.docs.map((d) => toDashboardProp({ id: d.id, ...d.data() }))
        }

        if (!cancelled) setProperties(data)
      } catch (err) {
        console.error('Featured fetch error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [])

  return { properties, loading }
}

export function useRecentlyViewed() {
  const [properties, setProperties] = useState<DashboardProperty[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetch = async () => {
      try {
        const stored = localStorage.getItem('vjr_recently_viewed')
        if (!stored) { if (!cancelled) setLoading(false); return }

        const ids: string[] = JSON.parse(stored).slice(0, 4)
        if (ids.length === 0) { if (!cancelled) setLoading(false); return }

        const promises = ids.map(async (id) => {
          const snap = await getDoc(doc(db, 'properties', id))
          return snap.exists() ? toDashboardProp({ id: snap.id, ...snap.data() }) : null
        })

        const results = (await Promise.all(promises)).filter(Boolean) as DashboardProperty[]
        if (!cancelled) setProperties(results)
      } catch (err) {
        console.error('Recently viewed error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [])

  return { properties, loading }
}

export function useTrendingProperties() {
  const [properties, setProperties] = useState<DashboardProperty[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetch = async () => {
      try {
        let q = query(
          collection(db, 'properties'),
          orderBy('shortlistCount', 'desc'),
          limit(4),
        )
        let snap = await getDocs(q)

        if (snap.empty) {
          q = query(
            collection(db, 'properties'),
            orderBy('createdAt', 'desc'),
            limit(8),
          )
          snap = await getDocs(q)
        }

        const data = snap.docs
          .map((d) => toDashboardProp({ id: d.id, ...d.data() }))
          .slice(0, 4)

        if (!cancelled) setProperties(data)
      } catch (err) {
        console.error('Trending fetch error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [])

  return { properties, loading }
}

const FALLBACK_LOCALITIES = [
  { locality: 'Indiranagar', avgPricePerSqft: 18500, count: 0 },
  { locality: 'Koramangala', avgPricePerSqft: 16800, count: 0 },
  { locality: 'HSR Layout', avgPricePerSqft: 14200, count: 0 },
  { locality: 'Whitefield', avgPricePerSqft: 12000, count: 0 },
  { locality: 'Marathahalli', avgPricePerSqft: 10500, count: 0 },
  { locality: 'Electronic City', avgPricePerSqft: 8500, count: 0 },
  { locality: 'Sarjapur Road', avgPricePerSqft: 11200, count: 0 },
  { locality: 'Hebbal', avgPricePerSqft: 13500, count: 0 },
]

export function useBangalorePriceSnapshot() {
  const [localities, setLocalities] = useState<typeof FALLBACK_LOCALITIES>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetch = async () => {
      try {
        const snap = await getDocs(collection(db, 'properties'))
        const data = snap.docs.map((d) => d.data())

        const localityMap: Record<string, number[]> = {}

        data.forEach((p: any) => {
          const loc = p.locality || p.area || p.location
          const price = p.price ?? 0
          const area = p.areaSqft || p.area_sqft

          if (loc && price > 0 && area > 0) {
            const ppsf = Math.round(price / area)
            if (ppsf > 100 && ppsf < 1000000) {
              if (!localityMap[loc]) localityMap[loc] = []
              localityMap[loc].push(ppsf)
            }
          }
        })

        const result = Object.entries(localityMap)
          .map(([locality, prices]) => ({
            locality,
            avgPricePerSqft: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
            count: prices.length,
          }))
          .filter((l) => l.count >= 1)
          .sort((a, b) => b.avgPricePerSqft - a.avgPricePerSqft)
          .slice(0, 8)

        if (!cancelled) setLocalities(result.length >= 4 ? result : FALLBACK_LOCALITIES)
      } catch (err) {
        console.error('Price snapshot error:', err)
        if (!cancelled) setLocalities(FALLBACK_LOCALITIES)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [])

  return { localities, loading }
}
