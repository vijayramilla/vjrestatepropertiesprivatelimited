import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";
import {
  UploadCloud,
  File as FileIcon,
  Trash2,
  Loader,
  CheckCircle,
} from "lucide-react";

interface FileWithPreview {
  id: string;
  preview: string;
  progress: number;
  name: string;
  size: number;
  type: string;
  lastModified?: number;
  file?: File;
}

interface FileUploadProps {
  onFilesChange?: (files: File[]) => void;
}

export default function FileUpload({ onFilesChange }: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList).map((file) => ({
      id: `${URL.createObjectURL(file)}-${Date.now()}`,
      preview: URL.createObjectURL(file),
      progress: 0,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      file,
    }));
    setFiles((prev) => {
      const updated = [...prev, ...newFiles];
      onFilesChange?.(updated.map((f) => f.file).filter(Boolean) as File[]);
      return updated;
    });
    newFiles.forEach((f) => simulateUpload(f.id));
  };

  const simulateUpload = (id: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, progress: Math.min(progress, 100) } : f,
        ),
      );
      if (progress >= 100) {
        clearInterval(interval);
        if (navigator.vibrate) navigator.vibrate(100);
      }
    }, 300);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      onFilesChange?.(next.map((f) => f.file).filter(Boolean) as File[]);
      return next;
    });
  };

  const clearAll = () => {
    setFiles([]);
    onFilesChange?.([]);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="w-full">
      <motion.div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        initial={false}
        animate={{
          borderColor: isDragging ? "#3b82f6" : "#ffffff10",
          scale: isDragging ? 1.02 : 1,
        }}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        className={clsx(
          "relative rounded-2xl p-8 md:p-10 text-center cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 shadow-sm hover:shadow-md backdrop-blur group",
          isDragging && "ring-4 ring-blue-400/30 border-blue-500",
        )}
      >
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ y: isDragging ? [-5, 0, -5] : 0 }}
            transition={{
              duration: 1.5,
              repeat: isDragging ? Infinity : 0,
              ease: "easeInOut",
            }}
            className="relative"
          >
            <motion.div
              animate={{
                opacity: isDragging ? [0.5, 1, 0.5] : 1,
                scale: isDragging ? [0.95, 1.05, 0.95] : 1,
              }}
              transition={{
                duration: 2,
                repeat: isDragging ? Infinity : 0,
                ease: "easeInOut",
              }}
              className="absolute -inset-4 bg-blue-400/10 rounded-full blur-md"
              style={{ display: isDragging ? "block" : "none" }}
            />
            <UploadCloud
              className={clsx(
                "w-14 h-14 md:w-16 md:h-16 drop-shadow-sm",
                isDragging
                  ? "text-blue-500"
                  : "text-gray-400 group-hover:text-blue-500 transition-colors duration-300",
              )}
            />
          </motion.div>

          <div className="space-y-1">
            <h3 className="text-lg md:text-xl font-semibold text-gray-800">
              {isDragging
                ? "Drop files here"
                : files.length
                  ? "Add more files"
                  : "Upload property photos"}
            </h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              {isDragging ? (
                <span className="font-medium text-blue-500">
                  Release to upload
                </span>
              ) : (
                <>
                  Drag & drop photos here, or{" "}
                  <span className="text-blue-500 font-medium">browse</span>
                </>
              )}
            </p>
            <p className="text-xs text-gray-400">
              Supports JPG, PNG, WEBP
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={onSelect}
            accept="image/*"
          />
        </div>
      </motion.div>

      <div className="mt-6">
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-between items-center mb-3"
            >
              <p className="text-xs font-medium text-gray-500">
                {files.length} photo{files.length !== 1 ? 's' : ''} selected
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-3 gap-3">
          <AnimatePresence>
            {files.filter((f) => f.progress === 100).map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative aspect-square overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200/50 group"
              >
                <img
                  src={file.preview}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="absolute right-1.5 top-1.5 rounded-lg bg-black/60 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                >
                  ✕
                </button>
                {file.progress < 100 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
                    <Loader className="w-5 h-5 animate-spin text-blue-500" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 text-center transition-all hover:border-gray-400 hover:bg-gray-100/50">
            <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="mt-1.5 text-[10px] font-medium text-gray-400">Add Photos</span>
            <input type="file" accept="image/*" multiple className="sr-only" onChange={onSelect} />
          </label>
        </div>
      </div>
    </div>
  );
}
