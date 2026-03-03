"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileVideo, Image, X } from "lucide-react";
import { cn } from "@/lib/utils";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoDropzone({ file, onChange, disabled }) {
  const [drag, setDrag] = useState(false);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDrag(false);
      const f = e.dataTransfer.files[0];
      if (f?.type.startsWith("video/")) onChange(f);
    },
    [onChange]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDrag(true);
  }, []);

  const handleDragLeave = useCallback(() => setDrag(false), []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300",
        drag && !disabled
          ? "border-purple-500/50 bg-purple-500/5"
          : file
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-zinc-700/50 bg-zinc-900/30 hover:border-zinc-600 hover:bg-zinc-800/30",
        disabled && "cursor-not-allowed opacity-60"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !disabled && document.getElementById("video-input")?.click()}
    >
      <input
        id="video-input"
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0])}
        disabled={disabled}
      />
      {file ? (
        <>
          <FileVideo className="mb-2 h-12 w-12 text-emerald-400" />
          <p className="text-sm font-medium text-zinc-100">{file.name}</p>
          <p className="text-xs text-zinc-500">{formatSize(file.size)}</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <Upload className="mb-2 h-12 w-12 text-zinc-500" />
          <p className="text-sm font-medium text-zinc-300">Drop video here</p>
          <p className="text-xs text-zinc-500">or click to browse</p>
          <p className="mt-1 text-xs text-zinc-600">MP4, MOV, WebM</p>
        </>
      )}
    </motion.div>
  );
}

export function ImageDropzone({ file, onChange, disabled }) {
  const [drag, setDrag] = useState(false);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDrag(false);
      const f = e.dataTransfer.files[0];
      if (f?.type.startsWith("image/")) onChange(f);
    },
    [onChange]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDrag(true);
  }, []);

  const handleDragLeave = useCallback(() => setDrag(false), []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300",
        drag && !disabled
          ? "border-purple-500/50 bg-purple-500/5"
          : file
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-zinc-700/50 bg-zinc-900/30 hover:border-zinc-600 hover:bg-zinc-800/30",
        disabled && "cursor-not-allowed opacity-60"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !disabled && document.getElementById("image-input")?.click()}
    >
      <input
        id="image-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0])}
        disabled={disabled}
      />
      {file ? (
        <>
          <Image className="mb-2 h-12 w-12 text-emerald-400" />
          <p className="text-sm font-medium text-zinc-100">{file.name}</p>
          <p className="text-xs text-zinc-500">{formatSize(file.size)}</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <Upload className="mb-2 h-12 w-12 text-zinc-500" />
          <p className="text-sm font-medium text-zinc-300">Drop face photo</p>
          <p className="text-xs text-zinc-500">or click to browse</p>
          <p className="mt-1 text-xs text-zinc-600">PNG, JPG, WebP</p>
        </>
      )}
    </motion.div>
  );
}
