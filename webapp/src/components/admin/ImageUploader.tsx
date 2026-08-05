import { ImagePlus, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

import { useApp } from "../../context/AppContext";
import { uploadImage } from "../../lib/api";
import { hapticNotification } from "../../lib/telegram";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
}

export default function ImageUploader({
  value,
  onChange,
}: ImageUploaderProps) {
  const { format } = useApp();

  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file?: File | Blob | null) => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const response = await uploadImage(file, "admin_image");

      if (response.url) {
        onChange(response.url);
        hapticNotification("success");
      }
    } catch (err: any) {
      setError(err?.message ?? format("Rasm yuklashda xatolik"));
    } finally {
      setUploading(false);
    }
  };

  const onPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const item = Array.from(event.clipboardData.items).find((entry) =>
      entry.type.startsWith("image/"),
    );

    if (!item) return;

    const file = item.getAsFile();

    if (file) {
      event.preventDefault();
      handleFile(file);
    }
  };

  return (
    <div
      tabIndex={0}
      onPaste={onPaste}
      className="rounded-3xl border border-slate-200 bg-white p-3 outline-none focus:border-[#DB2777]/30"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {value ? (
        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <img
            src={value}
            alt={format("Yuklangan rasm")}
            className="h-36 w-full object-cover"
          />
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-500"
        >
          {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
          <span className="text-xs font-semibold">
            {format("Rasm yuklash yoki Ctrl+V bilan qo‘yish")}
          </span>
        </button>
      )}

      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-500">{error}</p>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          className="h-10 rounded-2xl bg-slate-100 text-xs font-bold text-slate-700"
        >
          {format("Fayl tanlash")}
        </button>

        <button
          onClick={() => onChange("")}
          className="h-10 rounded-2xl bg-red-50 text-xs font-bold text-red-500"
        >
          {format("Rasmni tozalash")}
        </button>
      </div>
    </div>
  );
}
