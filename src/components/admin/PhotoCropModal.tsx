import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowsOut, ArrowCounterClockwise, X, Check } from '@phosphor-icons/react';

const VIEWPORT = 320; // px square crop viewport
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const OUTPUT_SIZE = 512; // exported square avatar size

interface Offset {
  x: number;
  y: number;
}

/**
 * Circular photo cropper: drag to reposition, slider/wheel to zoom.
 * Emits a square 512px JPEG blob cropped around the visible circle.
 */
export default function PhotoCropModal({
  open,
  src,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  src: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const dragStart = useRef<Offset>({ x: 0, y: 0 });
  const offsetRef = useRef<Offset>({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const imgEl = useRef<HTMLImageElement | null>(null);

  offsetRef.current = offset;
  zoomRef.current = zoom;

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setError('');
  }, []);

  // Load image and fit it inside the viewport (contain).
  useEffect(() => {
    if (!open || !src) return;
    reset();
    setImgSize(null);
    const img = new Image();
    img.onload = () => {
      const scale = Math.max(VIEWPORT / img.naturalWidth, VIEWPORT / img.naturalHeight);
      setImgSize({ w: img.naturalWidth * scale, h: img.naturalHeight * scale });
    };
    img.onerror = () => setError('Could not load that image. Try another file.');
    img.src = src;
    imgEl.current = img;
  }, [open, src, reset]);

  // Clamp so the image always covers the viewport.
  const clampOffset = useCallback(
    (next: Offset, z: number): Offset => {
      if (!imgSize) return { x: 0, y: 0 };
      const halfW = (imgSize.w * z) / 2;
      const halfH = (imgSize.h * z) / 2;
      const maxX = Math.max(0, halfW - VIEWPORT / 2);
      const maxY = Math.max(0, halfH - VIEWPORT / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y)),
      };
    },
    [imgSize],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragStart.current = { x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset(clampOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }, zoomRef.current));
  };
  const endDrag = () => setDragging(false);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current * (e.deltaY < 0 ? 1.08 : 1 / 1.08)));
    setZoom(next);
    setOffset((o) => clampOffset(o, next));
  };

  const applyZoom = (z: number) => {
    setZoom(z);
    setOffset((o) => clampOffset(o, z));
  };

  const exportCropped = async () => {
    if (!imgSize) return;
    setExporting(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      // Map viewport px → output px, draw the scaled image offset accordingly.
      const k = OUTPUT_SIZE / VIEWPORT;
      ctx.drawImage(
        imgEl.current!,
        OUTPUT_SIZE / 2 - (imgSize.w * zoomRef.current) / 2 * k + offsetRef.current.x * k,
        OUTPUT_SIZE / 2 - (imgSize.h * zoomRef.current) / 2 * k + offsetRef.current.y * k,
        imgSize.w * zoomRef.current * k,
        imgSize.h * zoomRef.current * k,
      );
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92));
      if (!blob) throw new Error('Could not process image');
      onConfirm(blob);
    } catch (err) {
      console.error('Crop export error:', err);
      setError('Could not process that image. Try another.');
    } finally {
      setExporting(false);
    }
  };

  const displayed = imgSize ? { width: imgSize.w * zoom, height: imgSize.h * zoom } : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[160] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => !exporting && onCancel()}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-7">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Photo</p>
                <h2 className="admin-heading mt-0.5 text-lg font-medium text-black sm:text-xl">Position Photo</h2>
              </div>
              <button
                type="button"
                onClick={onCancel}
                disabled={exporting}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-[#C9A84C] hover:text-black disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col items-center gap-5 px-5 py-6 sm:px-7">
              <p className="text-center text-xs text-gray-500">
                Drag the photo to position it, and zoom until the face sits inside the circle.
              </p>

              <div
                role="application"
                aria-label="Photo crop area — drag to move"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerLeave={endDrag}
                onWheel={onWheel}
                className={`relative touch-none select-none overflow-hidden rounded-xl border border-gray-200 bg-gray-100 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                style={{ width: VIEWPORT, height: VIEWPORT, maxWidth: '100%' }}
              >
                {displayed ? (
                  <img
                    src={src}
                    alt="Crop preview"
                    draggable={false}
                    className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                    style={{
                      width: displayed.width,
                      height: displayed.height,
                      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                    }}
                  />
                ) : (
                  !error && <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">Loading…</div>
                )}
                {/* Circular mask */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(circle at center, transparent 0, transparent calc(70.5% - 1.5px), rgba(10,22,40,0.55) calc(70.5% - 1.5px))',
                  }}
                />
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[71%] w-[71%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-white/70" />
              </div>

              {error && (
                <p className="text-center text-[12px] font-medium text-red-600" role="alert">
                  {error}
                </p>
              )}

              <div className="flex w-full items-center gap-3">
                <ArrowsOut size={15} className="shrink-0 text-gray-400" />
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => applyZoom(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer accent-[#C9A84C]"
                  aria-label="Zoom"
                />
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Reset position and zoom"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-[#C9A84C] hover:text-black"
                >
                  <ArrowCounterClockwise size={14} />
                </button>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              <button type="button" onClick={onCancel} disabled={exporting} className="admin-btn-secondary flex-1 disabled:opacity-50 sm:flex-none sm:px-6">
                Cancel
              </button>
              <button
                type="button"
                onClick={exportCropped}
                disabled={exporting || !imgSize || !!error}
                className="admin-btn-primary flex-1 disabled:opacity-50 sm:flex-none sm:px-6"
              >
                {exporting ? 'Processing…' : <><Check size={15} weight="bold" /> Use This Photo</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
