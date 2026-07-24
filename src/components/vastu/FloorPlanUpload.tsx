import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Check, Compass } from '@phosphor-icons/react';

export default function FloorPlanUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [orientation, setOrientation] = useState(0);
  const [showOrientation, setShowOrientation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOut = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) processFile(files[0]);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFile(e.target.files[0]);
  };

  const processFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setShowOrientation(false);
    if (preview) URL.revokeObjectURL(preview);
  };

  return (
    <div className="mx-auto max-w-xl">
      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onDragOver={handleDrag}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
              isDragging
                ? 'border-[#0f766e] bg-[#0f766e]/10'
                : 'border-white/20 bg-white/[0.03] hover:border-white/40 hover:bg-white/[0.05]'
            }`}
          >
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Upload size={28} weight="duotone" className="text-white/70" />
            </div>
            <p className="text-lg font-semibold text-white">Upload Your Floor Plan</p>
            <p className="mt-2 text-sm text-[#777]">Drag & drop or click to browse</p>
            <p className="mt-4 text-xs text-[#555]">Supported formats: JPG, PNG, PDF (Max 5MB)</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleChange}
            />
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
          >
            <div className="relative">
              <div className="aspect-[4/3] bg-white/[0.04]">
                {preview && (
                  <img src={preview} alt="Floor plan" className="h-full w-full object-contain" />
                )}
              </div>
              <button
                onClick={removeFile}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <X size={16} />
              </button>
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-sm">
                <Check size={14} weight="bold" className="text-green-400" />
                {file.name}
              </div>
            </div>

            {!showOrientation ? (
              <div className="p-6 text-center">
                <p className="mb-4 text-sm text-[#888]">Set your floor plan's directional orientation</p>
                <button
                  onClick={() => setShowOrientation(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-gray-100"
                >
                  <Compass size={18} weight="duotone" />
                  Set Orientation
                </button>
              </div>
            ) : (
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-white">Orientation</span>
                  <span className="text-sm text-[#888]">{orientation}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={orientation}
                  onChange={(e) => setOrientation(Number(e.target.value))}
                  className="w-full accent-[#0f766e]"
                />
                <div className="mt-4 flex justify-center gap-4 text-xs text-[#666]">
                  <span>N (0°)</span>
                  <span>E (90°)</span>
                  <span>S (180°)</span>
                  <span>W (270°)</span>
                </div>
                <button className="mt-6 w-full rounded-xl bg-[#0f766e] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0d9488]">
                  Analyze My Home Now
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
