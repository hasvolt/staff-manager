import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
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
        }
        setIsCompressing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      {value ? (
        <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-[var(--border)] group">
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isCompressing}
          className="flex flex-col items-center justify-center w-full p-4 border border-dashed border-[var(--border)] rounded-2xl bg-[var(--surface-2)]/60 hover:border-[var(--accent)] hover:bg-[var(--surface-2)] transition cursor-pointer text-center"
        >
          {isCompressing ? (
            <span className="text-xs text-[var(--accent)] animate-pulse">Compressing photo...</span>
          ) : (
            <>
              <div className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] mb-2 shadow-2xs">
                <Upload className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-[var(--text)]">{label}</span>
              <span className="text-[10px] text-[var(--text-muted)] mt-0.5">JPEG/PNG auto-compressed</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
