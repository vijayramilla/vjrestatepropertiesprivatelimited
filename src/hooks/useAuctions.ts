import { useState, useEffect } from 'react'
import {
  collection,
  query,
  onSnapshot,
  where,
} from 'firebase/firestore'
import { ref, onValue } from 'firebase/database'
import { db, rtdb } from '@/lib/firebase'
import type { Auction } from '@/data/auctionCategories'
import { useSupabaseData, subscribeSupabaseAuctions } from '@/lib/supabaseData'

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (typeof value === 'object' && 'toDate' in (value as object)) {
    return (value as { toDate: () => Date }).toDate()
  }
  if (value instanceof Date) return value
  return null
}

/**
 * Real-time auction feed. Firestore holds property details, the Realtime
 * Database mirrors currentBid / totalBids / status so every open page sees
 * bid updates live without refetching.
 *
 * With the Supabase site-data flag on, Supabase Realtime replaces both
 * sources: auction rows come from the `auctions` table and the table itself
 * is added to the realtime publication, so bid updates arrive the same way.
 */
export function useAuctions(categoryFilter: string = 'all') {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)

  // Supabase branch — subscriptions + live bid updates via Realtime.
  useEffect(() => {
    if (useSupabaseData()) {
      const unsubscribe = subscribeSupabaseAuctions((data) => {
        setAuctions(data as Auction[])
        setLoading(false)
      }, categoryFilter)
      return () => unsubscribe()
    }

    const q =
      categoryFilter !== 'all'
        ? query(collection(db, 'auctions'), where('category', '==', categoryFilter))
        : query(collection(db, 'auctions'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const d = doc.data()
        return {
          id: doc.id,
          ...d,
          auctionEndTime: toDate(d.auctionEndTime),
          auctionStartTime: toDate(d.auctionStartTime),
        } as Auction
      })
      setAuctions(data)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [categoryFilter])

  // Realtime Database mirror — live bid updates (currentBid/totalBids only;
  // status stays authoritative in Firestore to prevent client spoofing).
  // Skipped on Supabase (Realtime handles it).
  const auctionIds = auctions.map((a) => a.id).join(',')
  useEffect(() => {
    if (useSupabaseData()) return
    if (auctionIds.length === 0) return

    const ids = auctionIds.split(',')
    const unsubscribers = ids.map((id) => {
      const bidRef = ref(rtdb, `auctions/${id}`)
      return onValue(bidRef, (snapshot) => {
        const realtimeData = snapshot.val()
        if (!realtimeData) return
        setAuctions((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  currentBid: realtimeData.currentBid ?? a.currentBid,
                  totalBids: realtimeData.totalBids ?? a.totalBids,
                }
              : a,
          ),
        )
      })
    })

    return () => unsubscribers.forEach((unsub) => unsub())
  }, [auctionIds])

  return { auctions, loading }
}
