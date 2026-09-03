import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { ref, set, update } from 'firebase/database'
import { db, rtdb, auth } from '@/lib/firebase'
import AdminLayout from '@/components/admin/AdminLayout'
import { AdminPageHeader, AdminPageShell } from '@/components/admin/AdminUi'
import LazyImage from '@/components/common/LazyImage'
import { BANGALORE_AREAS } from '@/data/properties'
import type { LandLocationValue } from '@/lib/mapGeocoding'
import { uploadAuctionImages, deletePropertyImageByUrl } from '@/lib/propertyImages'
import {
  useSupabaseData,
  supabaseGetAuction,
  callDataProxy,
} from '@/lib/supabaseData'
import { ArrowLeft, Link, Spinner, Upload, X } from 'phosphor-react'
import {
  AUCTION_STATUS_CONFIG,
  type AuctionCategory,
  type AuctionStatus,
} from '@/data/auctionCategories'

const CATEGORIES: AuctionCategory[] = [
  'Residential',
  'Commercial',
  'Apartment',
  'Villa',
  'Industrial',
  'PG Building',
]

const STATUSES: AuctionStatus[] = ['upcoming', 'live', 'ending_soon', 'closed', 'sold']

const KHATA_OPTIONS = ['A Khata', 'B Khata', 'DC Converted', 'NA', 'Other']
const FACING_OPTIONS = ['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West']

interface FormState {
  title: string
  category: AuctionCategory
  location: string
  city: string
  description: string
  startingBid: string
  currentBid: string
  reservePrice: string
  bidIncrement: string
  totalBids: string
  areaSqft: string
  propertyType: string
  khata: string
  facing: string
  registeredBidders: string
  status: AuctionStatus
  isFeatured: boolean
  startTime: string
  endTime: string
}

const emptyForm: FormState = {
  title: '',
  category: 'Residential',
  location: '',
  city: 'Bangalore',
  description: '',
  startingBid: '5000000',
  currentBid: '',
  reservePrice: '5000000',
  bidIncrement: '100000',
  totalBids: '0',
  areaSqft: '',
  propertyType: '',
  khata: 'A Khata',
  facing: 'East',
  registeredBidders: '0',
  status: 'upcoming',
  isFeatured: false,
  startTime: '',
  endTime: '',
}

function toLocalInputValue(date?: Date | null): string {
  if (!date) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

export default function AdminAuctionForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Images: existing URLs + pending device uploads + removed (deleted after save)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [linkInput, setLinkInput] = useState('')

  // Google-selected location pin (auto-fills city)
  const [mapPin, setMapPin] = useState<LandLocationValue | null>(null)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        let d: Record<string, any> | null = null
        if (useSupabaseData()) {
          const auction = await supabaseGetAuction(id)
          if (auction) d = auction
        } else {
          const snap = await getDoc(doc(db, 'auctions', id))
          if (snap.exists()) d = snap.data()
        }
        if (!d) {
          setError('Auction not found.')
          return
        }
        // Supabase rows come back with real Date objects; Firestore uses Timestamps.
        const asDate = (v: unknown): Date | undefined =>
          v instanceof Date
            ? v
            : v && typeof (v as { toDate?: () => Date }).toDate === 'function'
              ? (v as { toDate: () => Date }).toDate()
              : undefined
        setForm({
          title: d.title ?? '',
          category: (d.category as AuctionCategory) ?? 'Residential',
          location: d.location ?? '',
          city: d.city ?? 'Bangalore',
          description: d.description ?? '',
          startingBid: String(d.startingBid ?? ''),
          currentBid: String(d.currentBid ?? ''),
          reservePrice: String(d.reservePrice ?? ''),
          bidIncrement: String(d.bidIncrement ?? '100000'),
          totalBids: String(d.totalBids ?? 0),
          areaSqft: String(d.areaSqft ?? ''),
          propertyType: d.propertyType ?? '',
          khata: d.khata ?? 'A Khata',
          facing: d.facing ?? 'East',
          registeredBidders: String(d.registeredBidders ?? 0),
          status: (d.status as AuctionStatus) ?? 'upcoming',
          isFeatured: Boolean(d.isFeatured),
          startTime: toLocalInputValue(asDate(d.auctionStartTime)),
          endTime: toLocalInputValue(asDate(d.auctionEndTime)),
        })
        setImageUrls(d.images ?? [])
        if (d.map_lat && d.map_lng) {
          setMapPin({
            area: d.location ?? '',
            location: d.location ?? '',
            map_lat: d.map_lat,
            map_lng: d.map_lng,
            maps_link: d.maps_link ?? '',
            city: d.city ?? 'Bangalore',
          })
        }
      } catch (err) {
        console.error('Load auction error:', err)
        setError('Failed to load auction.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])



  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setPendingFiles((prev) => [...prev, ...files])
    setPendingPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
    e.target.value = ''
  }

  const handleAddLinkImage = () => {
    const url = linkInput.trim()
    if (!url) return
    setImageUrls((prev) => (prev.includes(url) ? prev : [...prev, url]))
    setLinkInput('')
  }

  const removeExistingImage = (url: string) => {
    setImageUrls((prev) => prev.filter((u) => u !== url))
    if (isEditing) setRemovedImageUrls((prev) => [...prev, url])
  }

  const removePendingImage = (index: number) => {
    URL.revokeObjectURL(pendingPreviews[index])
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
    setPendingPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }
    if (!form.location.trim()) {
      setError('Location is required — search above or type the locality.')
      return
    }
    if (!form.endTime) {
      setError('Auction end time is required.')
      return
    }

    const startingBid = Number(form.startingBid) || 0
    const endTime = new Date(form.endTime)
    // Only enforce a future end time on new auctions — editing a closed/sold
    // auction must stay possible after its end time has passed.
    if (!isEditing && endTime.getTime() <= Date.now()) {
      setError('Auction end time must be in the future.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        location: form.location.trim(),
        city: form.city.trim() || 'Bangalore',
        description: form.description.trim(),
        startingBid,
        currentBid: Number(form.currentBid) || startingBid,
        reservePrice: Number(form.reservePrice) || startingBid,
        bidIncrement: Number(form.bidIncrement) || 100000,
        totalBids: Number(form.totalBids) || 0,
        areaSqft: form.areaSqft ? Number(form.areaSqft) : undefined,
        propertyType: form.propertyType.trim() || undefined,
        khata: form.khata,
        facing: form.facing,
        registeredBidders: Number(form.registeredBidders) || 0,
        status: form.status,
        isFeatured: form.isFeatured,
        auctionStartTime: form.startTime ? new Date(form.startTime) : undefined,
        auctionEndTime: endTime,
        ...(mapPin?.map_lat && mapPin?.map_lng
          ? {
              map_lat: mapPin.map_lat,
              map_lng: mapPin.map_lng,
              ...(mapPin.maps_link ? { maps_link: mapPin.maps_link } : {}),
            }
          : {}),
      }

      if (isEditing && id) {
        let finalImages = [...imageUrls]
        if (pendingFiles.length > 0) {
          setUploadingImages(true)
          const uploaded = await uploadAuctionImages(
            pendingFiles,
            id,
            auth.currentUser?.uid || 'admin',
          )
          finalImages = [...finalImages, ...uploaded]
        }
        if (useSupabaseData()) {
          await callDataProxy('auction.update', {
            id,
            ...payload,
            images: finalImages,
          })
        } else {
          await setDoc(doc(db, 'auctions', id), { ...payload, images: finalImages }, { merge: true })
          await update(ref(rtdb, `auctions/${id}`), {
            currentBid: payload.currentBid,
            totalBids: payload.totalBids,
          })
        }
      } else {
        let createdId: string
        if (useSupabaseData()) {
          const created = await callDataProxy('auction.create', {
            ...payload,
            images: imageUrls,
          })
          createdId = created.id as string
        } else {
          const created = await addDoc(collection(db, 'auctions'), {
            ...payload,
            images: imageUrls,
            createdAt: serverTimestamp(),
          })
          createdId = created.id
          // Initialise the live mirror right away so the auction is fully usable
          // even if an image upload below fails.
          await set(ref(rtdb, `auctions/${created.id}`), {
            currentBid: payload.currentBid,
            totalBids: payload.totalBids,
          })
        }
        if (pendingFiles.length > 0) {
          setUploadingImages(true)
          const uploaded = await uploadAuctionImages(
            pendingFiles,
            createdId,
            auth.currentUser?.uid || 'admin',
          )
          if (useSupabaseData()) {
            await callDataProxy('auction.update', { id: createdId, images: uploaded })
          } else {
            await updateDoc(doc(db, 'auctions', createdId), { images: [...imageUrls, ...uploaded] })
          }
        }
      }

      // Cleanup: revoke object URLs and delete removed images from storage.
      // Skip any URL that was removed and then re-added before saving.
      pendingPreviews.forEach((url) => URL.revokeObjectURL(url))
      setPendingFiles([])
      setPendingPreviews([])
      const trulyRemoved = removedImageUrls.filter((url) => !imageUrls.includes(url))
      if (trulyRemoved.length > 0) {
        await Promise.all(trulyRemoved.map((url) => deletePropertyImageByUrl(url)))
      }
      setRemovedImageUrls([])
      navigate('/admin/auctions')
    } catch (err) {
      console.error('Save auction error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save auction.')
    } finally {
      setSaving(false)
      setUploadingImages(false)
    }
  }

  const inputClass = 'admin-input-ghost'
  const labelClass = 'admin-label'

  if (loading) {
    return (
      <AdminLayout title="Auction">
        <AdminPageShell>
          <div className="flex h-64 items-center justify-center">
            <Spinner size={28} className="animate-spin text-gray-400" />
          </div>
        </AdminPageShell>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={isEditing ? 'Edit Auction' : 'New Auction'}>
      <AdminPageShell>
        <button
          type="button"
          onClick={() => navigate('/admin/auctions')}
          className="mb-4 flex cursor-pointer items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 transition-colors hover:text-black"
        >
          <ArrowLeft size={14} /> Back to Auctions
        </button>

        <AdminPageHeader
          eyebrow="Marketplace"
          title={isEditing ? 'Edit Auction' : 'New Auction'}
          description="Set the property details, bidding window, and reserve rules for this auction."
        />

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="admin-section">
            <h2 className="admin-section-title">Basic Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              <div className="sm:col-span-2">
                <label className={labelClass}>Title *</label>
                <input
                  className={inputClass}
                  placeholder="e.g. 2BHK Apartment in Koramangala 4th Block"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Category *</label>
                <select
                  className="admin-select"
                  value={form.category}
                  onChange={(e) => setField('category', e.target.value as AuctionCategory)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Property Type</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Apartment, Villa, Plot"
                  value={form.propertyType}
                  onChange={(e) => setField('propertyType', e.target.value)}
                />
              </div>

              {/* Area / Locality */}
              <div className="sm:col-span-2">
                <label className="block font-sans text-xs text-gray-500 mb-2">
                  Area / Locality *
                </label>
                <select
                  value={form.location}
                  onChange={(e) => {
                    setField('location', e.target.value)
                    setField('city', 'Bangalore')
                  }}
                  className={inputClass}
                >
                  <option value="">Select Area / Locality</option>
                  {BANGALORE_AREAS.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Images</label>
                <p className="mb-3 text-xs text-gray-500">
                  Upload photos or paste image links. The first image is used as the auction cover.
                </p>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {imageUrls.map((url) => (
                    <div
                      key={url}
                      className="relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50/50"
                    >
                      <LazyImage src={url} alt="Auction" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(url)}
                        className="absolute right-1 top-1 cursor-pointer rounded-lg bg-black/80 p-1 text-white transition-colors hover:bg-black"
                        aria-label="Remove image"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {pendingPreviews.map((url, index) => (
                    <div
                      key={url}
                      className="relative aspect-square overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50/30"
                    >
                      <LazyImage
                        src={url}
                        alt="Pending upload"
                        className="h-full w-full object-cover opacity-90"
                      />
                      <button
                        type="button"
                        onClick={() => removePendingImage(index)}
                        className="absolute right-1 top-1 cursor-pointer rounded-lg bg-black/80 p-1 text-white transition-colors hover:bg-black"
                        aria-label="Remove pending image"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/30 text-center transition hover:border-gray-500 hover:bg-gray-50">
                    <Upload size={22} className="text-gray-300" />
                    <span className="mt-1 text-[11px] text-gray-500">Upload Photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={handleImageSelect}
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    placeholder="Paste an image URL and press Add"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddLinkImage()
                      }
                    }}
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={handleAddLinkImage}
                    disabled={!linkInput.trim()}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Link size={14} /> Add by link
                  </button>
                </div>
                {uploadingImages && (
                  <p className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <Spinner size={14} className="animate-spin" /> Uploading images…
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea
                  className={`${inputClass} min-h-[120px] resize-y`}
                  placeholder="Describe the property, legal status, and auction terms..."
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Auction Details */}
          <div className="admin-section-muted">
            <h2 className="admin-section-title mb-2">Auction Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              <div>
                <label className={labelClass}>Status</label>
                <select
                  className="admin-select"
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value as AuctionStatus)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {AUCTION_STATUS_CONFIG[s].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Featured</label>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setField('isFeatured', !form.isFeatured)}
                    className={`admin-toggle ${form.isFeatured ? 'admin-toggle-on' : 'admin-toggle-off'}`}
                    aria-pressed={form.isFeatured}
                  >
                    <span
                      className="admin-toggle-knob"
                      style={{ transform: form.isFeatured ? 'translateX(22px)' : 'translateX(4px)' }}
                    />
                  </button>
                  <span className="text-sm text-gray-600">
                    {form.isFeatured ? 'Featured on homepage' : 'Not featured'}
                  </span>
                </div>
              </div>
              <div>
                <label className={labelClass}>Auction Start Time</label>
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={form.startTime}
                  onChange={(e) => setField('startTime', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Auction End Time *</label>
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={form.endTime}
                  onChange={(e) => setField('endTime', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="admin-section">
            <h2 className="admin-section-title">Pricing & Bids</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              <div>
                <label className={labelClass}>Starting Bid (₹)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.startingBid}
                  onChange={(e) => setField('startingBid', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Current Bid (₹)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.currentBid}
                  onChange={(e) => setField('currentBid', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Reserve Price (₹)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.reservePrice}
                  onChange={(e) => setField('reservePrice', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Bid Increment (₹)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.bidIncrement}
                  onChange={(e) => setField('bidIncrement', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Total Bids</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.totalBids}
                  onChange={(e) => setField('totalBids', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Registered Bidders</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.registeredBidders}
                  onChange={(e) => setField('registeredBidders', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="admin-section">
            <h2 className="admin-section-title">Property Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              <div>
                <label className={labelClass}>Area (sq.ft)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.areaSqft}
                  onChange={(e) => setField('areaSqft', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Khata</label>
                <select
                  className="admin-select"
                  value={form.khata}
                  onChange={(e) => setField('khata', e.target.value)}
                >
                  {KHATA_OPTIONS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Facing</label>
                <select
                  className="admin-select"
                  value={form.facing}
                  onChange={(e) => setField('facing', e.target.value)}
                >
                  {FACING_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/auctions')}
              className="admin-btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingImages}
              className="flex flex-1 items-center justify-center gap-2 min-h-[44px] rounded-xl bg-black px-5 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-gray-900 disabled:opacity-50"
            >
              {saving || uploadingImages ? (
                <>
                  <Spinner size={14} className="animate-spin" /> Saving...
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Auction'
              )}
            </button>
          </div>
        </form>
      </AdminPageShell>
    </AdminLayout>
  )
}
