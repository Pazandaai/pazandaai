import { Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useApp } from "../../context/AppContext";
import { API_BASE, uploadImage } from "../../lib/api";
import { hapticNotification } from "../../lib/telegram";
import ModalShell from "../ui/ModalShell";

function PremiumInner() {
  const { closeModal, format } = useApp();

  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<{ card_number?: string; card_holder?: string } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/payment-card`)
      .then((r) => r.json())
      .then((j) => { if (j?.ok && j.value) setCard(j.value); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];

    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setError(format("Faqat rasm fayli yuklang"));
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setDone(false);
    setPending(false);
    setError(null);
  };

  const submit = async () => {
    if (!file || uploading) return;

    setUploading(true);
    setError(null);

    try {
      const response = await uploadImage(file, "premium_screenshot");

      if (response.alreadyPending) {
        setPending(true);
      } else {
        setDone(true);
      }

      hapticNotification("success");
    } catch (err: any) {
      setError(err?.message ?? format("Xatolik yuz berdi"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <ModalShell
      open
      title={format("💎 Premium")}
      onClose={() => closeModal()}
    >
      <div className="space-y-4">
        <div className="rounded-3xl bg-[#DB2777]/5 p-4">
          <p className="text-sm leading-6 text-slate-700">
            {format(
              "Premium obuna: oyiga 25 000 so‘m. To‘lov screenshotini yuboring. Admin tekshirgandan so‘ng Premium faollashadi.",
            )}
          </p>
        </div>

        {card?.card_number ? (
          <div className="rounded-3xl bg-slate-900 p-4 text-white shadow-md">
            <p className="text-[10px] font-bold text-slate-400">{format("To'lov kartasi")}</p>
            <p className="mt-1 font-mono text-base font-extrabold tracking-wider">{card.card_number}</p>
            {card.card_holder ? <p className="mt-0.5 text-xs text-slate-300">{card.card_holder}</p> : null}
          </div>
        ) : null}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />

        {preview ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <img
              src={preview}
              alt={format("To‘lov screenshot")}
              className="max-h-64 w-full object-cover"
            />
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-slate-500"
          >
            <Upload size={22} />
            <span className="text-sm font-semibold">
              {format("Screenshot tanlash")}
            </span>
          </button>
        )}

        {error ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        ) : null}

        {done ? (
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-600">
            {format("Screenshot yuborildi. Admin tekshiruvi kutilmoqda.")}
          </div>
        ) : null}

        {pending ? (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-600">
            {format(
              "Sizda allaqachon ko‘rib chiqilayotgan premium so‘rov bor.",
            )}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            className="h-12 rounded-2xl bg-slate-100 text-sm font-bold text-slate-700"
          >
            {format("Tanlash")}
          </button>

          <button
            onClick={submit}
            disabled={!file || uploading}
            className="h-12 rounded-2xl bg-[#DB2777] text-sm font-bold text-white disabled:opacity-40"
          >
            {uploading
              ? format("Yuklanmoqda...")
              : format("Yuborish")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export default function PremiumModal() {
  const { activeModal } = useApp();

  if (activeModal !== "premium") return null;

  return <PremiumInner />;
}
