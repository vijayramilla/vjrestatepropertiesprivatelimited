import { useEffect, useState } from 'react'
import { ref, update, increment as rtdbIncrement } from 'firebase/database'
import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  doc,
  increment,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { CheckCircle, Gavel, MapPin, X } from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { db, rtdb } from '@/lib/firebase'
import { formatINR } from '@/lib/formatPrice'
import type { Auction } from '@/data/auctionCategories'
import GoogleSignInButton from '@/components/GoogleSignInButton'
import { useSupabaseData, supabasePlaceBid } from '@/lib/supabaseData'

type Step = 'bid' | 'confirm' | 'success' | 'notify'

interface BidModalProps {
  auction: Auction | null
  currentUser: User | null
  initialStep?: Step
  onClose: () => void
  onRequireLogin: () => Promise<void>
}

/** Mask a display name to "Rahul K***" style before persisting. */
function maskBidderName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return 'Anonymous'
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) {
    return `${parts[0].charAt(0)}${parts[0].slice(1, 2) ?? ''}***`
  }
  const first = parts[0]
  const last = parts[parts.length - 1]
  return `${first} ${last.charAt(0)}***`
}

export default function BidModal({
  auction,
  currentUser,
  initialStep = 'bid',
  onClose,
  onRequireLogin,
}: BidModalProps) {
  const [step, setStep] = useState<Step>('bid')
  const [bidAmount, setBidAmount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isUpcoming = auction?.status === 'upcoming'
  const isClosed = auction?.status === 'closed' || auction?.status === 'sold'
  const currentStep = step

  const minBid = (auction?.currentBid || auction?.startingBid || 0) + (auction?.bidIncrement || 100000)

  // Seed bid amount whenever a new auction is opened. Deliberately keyed on
  // auction.id (not the whole object) so live bid mirror updates don't wipe
  // the amount the user is typing.
  const auctionId = auction?.id
  const seedBid = () => {
    if (!auction) return
    setBidAmount(
      (auction.currentBid || auction.startingBid || 0) + (auction.bidIncrement || 100000),
    )
    setStep(initialStep)
    setError('')
  }
  useEffect(() => {
    seedBid()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionId, initialStep])

  const handlePlaceBid = async () => {
    if (!auction || !currentUser) return
    if (!bidAmount || bidAmount < minBid) {
      setError(`Minimum bid is ${formatINR(minBid)}`)
      return
    }
    if (currentStep === 'bid') {
      setStep('confirm')
      return
    }

    setLoading(true)
    setError('')
    try {
      if (useSupabaseData()) {
        // Atomic, race-safe bid placement via the place_bid RPC (proxy + service role).
        await supabasePlaceBid(
          auction.id,
          bidAmount,
          maskBidderName(currentUser.displayName || 'Anonymous'),
        )
      } else {
        // Save bid to Firestore
        await addDoc(collection(db, 'auction_bids'), {
          auctionId: auction.id,
          bidderId: currentUser.uid,
          bidderName: maskBidderName(currentUser.displayName || 'Anonymous'),
          amount: bidAmount,
          timestamp: serverTimestamp(),
          isWinning: true,
        })

        // Update auction in Firestore
        await updateDoc(doc(db, 'auctions', auction.id), {
          currentBid: bidAmount,
          totalBids: increment(1),
        })

        // Mirror to Realtime Database for live updates (atomic increment)
        await update(ref(rtdb, `auctions/${auction.id}`), {
          currentBid: bidAmount,
          totalBids: rtdbIncrement(1),
        })
      }

      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bid')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setError('')
    setStep('bid')
    onClose()
  }

  return (
    <Dialog
      open={!!auction}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <DialogContent
        className="max-w-[440px] rounded-2xl border-[#e5e7eb] p-0 shadow-[0_20px_60px_rgba(0,0,0,0.3)] sm:max-w-[440px]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {auction && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#F3F4F6] p-6 pb-4">
              <div className="min-w-0">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#C9A84C]">
                  {currentStep === 'confirm'
                    ? 'Confirm Bid'
                    : currentStep === 'success'
                      ? 'Bid Placed'
                      : 'Place Bid'}
                </p>
                <DialogTitle className="text-left text-[17px] font-bold leading-snug text-[#0A1628]">
                  {auction.title}
                </DialogTitle>
                <DialogDescription className="mt-1 flex items-center gap-1 text-left text-[13px] text-[#6B7280]">
                  <MapPin size={13} weight="fill" className="text-[#C9A84C]" />
                  {auction.location}
                </DialogDescription>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                aria-label="Close bid modal"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-[#F3F4F6] text-[#374151] transition-colors duration-200 hover:bg-[#E5E7EB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C] disabled:opacity-50"
              >
                <X size={14} />
              </button>
            </div>

            {currentStep === 'success' ? (
              /* SUCCESS STATE */
              <div className="px-6 pb-6 pt-4 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#0A1628]">
                  <CheckCircle size={32} color="#C9A84C" weight="fill" />
                </div>
                <h3 className="text-xl font-extrabold text-[#0A1628]">
                  Bid Placed Successfully!
                </h3>
                <p className="mt-1.5 text-sm text-[#6B7280]">
                  Your bid of{' '}
                  <strong className="text-[#C9A84C]">{formatINR(bidAmount)}</strong>{' '}
                  has been placed.
                </p>
                <p className="mt-1 text-[13px] text-[#9CA3AF]">
                  You will be notified if you are outbid.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-6 h-12 w-full cursor-pointer rounded-xl border-none bg-[#C9A84C] text-[15px] font-bold text-[#0A1628] transition-transform duration-200 hover:scale-[1.01] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C]"
                >
                  Done
                </button>
              </div>
            ) : currentStep === 'notify' ? (
              /* NOTIFY STATE */
              <div className="px-6 pb-6 pt-2">
                <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3.5">
                  <span aria-hidden className="text-2xl">🔔</span>
                  <div>
                    <p className="text-sm font-bold text-[#1E40AF]">Auction not started</p>
                    <p className="text-[13px] text-[#3B82F6]">
                      Bidding opens when this auction goes live. We'll notify registered users.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="h-12 flex-1 cursor-pointer rounded-xl border-[1.5px] border-[#E5E7EB] bg-white text-sm font-semibold text-[#374151] transition-colors duration-200 hover:border-[#3B82F6] hover:text-[#1E40AF]"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="h-12 flex-[2] cursor-pointer rounded-xl border-none bg-[#3B82F6] text-sm font-extrabold text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition-transform duration-200 hover:scale-[1.01]"
                  >
                    Notify Me
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Current bid info */}
                <div className="mx-6 my-4 grid grid-cols-2 gap-3 rounded-xl border border-[#C9A84C33] bg-[#0A162808] px-4 py-3.5">
                  <div>
                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">
                      Current Bid
                    </p>
                    <p className="text-lg font-extrabold tabular-nums text-[#0A1628]">
                      {formatINR(auction.currentBid || auction.startingBid)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">
                      Min Next Bid
                    </p>
                    <p className="text-lg font-extrabold tabular-nums text-[#C9A84C]">
                      {formatINR(minBid)}
                    </p>
                  </div>
                </div>

                {!currentUser ? (
                  /* LOGIN REQUIRED */
                  <div className="px-6 pb-6">
                    <div className="mb-4 rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] px-4 py-3 text-[13px] font-semibold text-[#B91C1C]">
                      <span aria-hidden>⚠️</span> Please sign in to place a bid.
                    </div>
                    <GoogleSignInButton
                      onClick={async () => {
                        await onRequireLogin()
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleClose}
                      className="mt-3 h-11 w-full cursor-pointer rounded-xl border-[1.5px] border-[#E5E7EB] bg-white text-sm font-semibold text-[#374151] transition-colors duration-200 hover:border-[#C9A84C] hover:text-[#0A1628]"
                    >
                      Cancel
                    </button>
                  </div>
            ) : isUpcoming ? (
              <div className="px-6 pb-6">
                <div className="mb-4 rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3 text-[13px] font-semibold text-[#1E40AF]">
                  🔔 Bidding opens when this auction goes live.
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="h-12 w-full cursor-pointer rounded-xl border-[1.5px] border-[#E5E7EB] bg-white text-sm font-semibold text-[#374151]"
                >
                  Close
                </button>
              </div>
            ) : isClosed ? (
              <div className="px-6 pb-6">
                <div className="mb-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[13px] font-semibold text-[#6B7280]">
                  ⏹ This auction has ended.
                </div>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="h-12 w-full cursor-pointer rounded-xl border-[1.5px] border-[#E5E7EB] bg-white text-sm font-semibold text-[#374151]"
                    >
                      Close
                    </button>
                  </div>
                ) : currentStep === 'bid' ? (
                  <>
                    {/* Bid input */}
                    <div className="px-6">
                      <label className="mb-2 block text-[13px] font-semibold text-[#374151]">
                        Your Bid Amount
                      </label>
                      <div className="flex items-center overflow-hidden rounded-xl border-2 border-[#C9A84C] focus-within:border-[#0A1628]">
                        <span className="flex items-center bg-[#C9A84C22] px-3.5 text-lg font-bold text-[#0A1628]">
                          ₹
                        </span>
                        <input
                          type="number"
                          value={bidAmount || ''}
                          onChange={(e) => {
                            setBidAmount(Number(e.target.value))
                            setError('')
                          }}
                          min={minBid}
                          step={auction.bidIncrement}
                          placeholder={minBid.toLocaleString('en-IN')}
                          className="h-[52px] flex-1 border-none p-0 px-4 text-xl font-bold text-[#0A1628] outline-none"
                          aria-label="Bid amount in rupees"
                        />
                      </div>
                      {error && (
                        <p className="mt-1.5 text-xs text-[#EF4444]">
                          <span aria-hidden>⚠️</span> {error}
                        </p>
                      )}
                    </div>

                    {/* Quick bid buttons */}
                    <div className="flex gap-2 px-6 pt-3">
                      {[1, 2, 3].map((multiplier) => (
                        <button
                          key={multiplier}
                          type="button"
                          onClick={() =>
                            setBidAmount(
                              (auction.currentBid || auction.startingBid) +
                                (auction.bidIncrement || 100000) * multiplier,
                            )
                          }
                          className="flex-1 cursor-pointer rounded-lg border-[1.5px] border-[#E5E7EB] bg-white px-1 py-2 text-[11px] font-semibold text-[#374151] transition-colors duration-200 hover:border-[#C9A84C] hover:text-[#0A1628]"
                        >
                          +{formatINR((auction.bidIncrement || 100000) * multiplier)}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  /* Confirm step */
                  <div className="px-6">
                    <div className="mb-5 rounded-xl border border-[#C9A84C44] bg-[#FFF8E7] px-4 py-4">
                      <p className="mb-1.5 text-[13px] text-[#6B7280]">
                        You are placing a bid of:
                      </p>
                      <p className="text-[28px] font-extrabold tabular-nums text-[#0A1628]">
                        {formatINR(bidAmount)}
                      </p>
                      <p className="mt-2 text-xs text-[#9CA3AF]">
                        <span aria-hidden>⚠️</span> This action cannot be undone. By
                        confirming, you agree to purchase this property if you win.
                      </p>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {(currentUser && !isClosed && !isUpcoming) && (
                  <div className="flex gap-2.5 px-6 pb-6">
                    <button
                      type="button"
                      onClick={() => (currentStep === 'confirm' ? setStep('bid') : handleClose())}
                      disabled={loading}
                      className="h-12 flex-1 cursor-pointer rounded-xl border-[1.5px] border-[#E5E7EB] bg-white text-sm font-semibold text-[#374151] transition-colors duration-200 hover:border-[#C9A84C] disabled:opacity-50"
                    >
                      {currentStep === 'confirm' ? '← Back' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={handlePlaceBid}
                      disabled={loading}
                      className="flex h-12 flex-[2] cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-[#C9A84C] text-sm font-extrabold text-[#0A1628] shadow-[0_4px_12px_rgba(201,168,76,0.4)] transition-transform duration-200 hover:scale-[1.01] disabled:cursor-wait disabled:opacity-70"
                    >
                      {loading ? (
                        '⌛ Placing...'
                      ) : currentStep === 'confirm' ? (
                        <>
                          <CheckCircle size={16} weight="bold" /> Confirm Bid
                        </>
                      ) : (
                        <>
                          <Gavel size={16} weight="bold" /> Review Bid
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
