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
 */
export function useAuctions(categoryFilter: string = 'all') {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)

  // Firestore snapshot — property details
  useEffect(() => {
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
  // status stays authoritative in Firestore to prevent client spoofing)
  const auctionIds = auctions.map((a) => a.id).join(',')
  useEffect(() => {
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
