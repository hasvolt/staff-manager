import React, { useRef, useState } from 'react';
import { Upload, Camera, Image as ImageIcon, X, RefreshCw, AlertCircle } from 'lucide-react';

export interface FileUploadProps {
  value?: string;
  onChange: (base64OrPath: string) => void;
  label?: string;
  maxDimension?: number;
  quality?: number;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  value,
  onChange,
  label = 'Upload Photo',
  maxDimension = 800,
  quality = 0.75,
  className = '',
}) => {
  // Separate refs for gallery/files and direct camera capture
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processFile = (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    setErrorMessage(null);
    setIsCompressing(true);

    const reader = new FileReader();

    reader.onerror = () => {
      setIsCompressing(false);
      setErrorMessage('Failed to read image file. Please try another photo.');
    };

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => {
        setIsCompressing(false);
        setErrorMessage('Could not load image. Please select a valid photo.');
      };

      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            onChange(compressedDataUrl);
          } else {
            setErrorMessage('Image compression error. Please try again.');
          }
        } catch {
          setErrorMessage('Could not process photo.');
        } finally {
          setIsCompressing(false);
        }
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset file input value so user can select the same file again if needed
    e.target.value = '';
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setErrorMessage(null);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className={`w-full ${className}`}>
      {/* 1. Gallery / Files input (NO capture attribute - opens native gallery/file picker) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 2. Direct Camera input (WITH capture attribute - opens device camera) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {value ? (
        /* Preview Card with Change and Remove Options */
        <div className="flex flex-col sm:flex-row items-center gap-3 p-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40">
          <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface)] shrink-0 shadow-2xs group">
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-black/90 transition cursor-pointer shadow-xs"
              title="Remove photo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 w-full space-y-2 text-left">
            <div className="text-xs font-semibold text-[var(--text)] flex items-center justify-between">
              <span>{label}</span>
              <span className="text-[10px] text-emerald-500 font-medium">Ready</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isCompressing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)] text-xs font-medium transition cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Change (Gallery)</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isCompressing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)] text-xs font-medium transition cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Retake (Camera)</span>
              </button>

              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[var(--expense)] hover:bg-[var(--expense)]/10 text-xs font-medium transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State with Both Gallery & Camera Buttons */
        <div className="p-3.5 border border-dashed border-[var(--border)] rounded-2xl bg-[var(--surface-2)]/40 hover:border-[var(--accent)]/60 transition space-y-2.5 text-center">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-[var(--text)] block">{label}</span>
            <span className="text-[11px] text-[var(--text-muted)] block">
              Choose an existing image from Gallery or snap a photo with Camera
            </span>
          </div>

          {isCompressing ? (
            <div className="py-3 flex items-center justify-center gap-2 text-xs text-[var(--accent)]">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Optimizing photo...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 flex-wrap pt-0.5">
              {/* Option 1: Gallery / Files */}
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text)] text-xs font-medium transition shadow-2xs cursor-pointer active:scale-95"
              >
                <ImageIcon className="w-4 h-4 text-[var(--accent)]" />
                <span>Gallery / Files</span>
              </button>

              {/* Option 2: Live Camera */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text)] text-xs font-medium transition shadow-2xs cursor-pointer active:scale-95"
              >
                <Camera className="w-4 h-4 text-[var(--accent)]" />
                <span>Camera</span>
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--expense)] pt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
