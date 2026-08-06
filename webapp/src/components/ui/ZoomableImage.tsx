import { X } from "lucide-react";
import { useRef, useState } from "react";

interface ZoomableImageProps {
  src: string;
  alt?: string;
  className?: string;
}

export default function ZoomableImage({ src, alt, className = "" }: ZoomableImageProps) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const pinchDist = useRef<number | null>(null);
  const startScale = useRef(1);

  const openViewer = () => { setOpen(true); setScale(1); setPos({ x: 0, y: 0 }); };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      startScale.current = scale;
    } else if (e.touches.length === 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDist.current) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      setScale(Math.min(4, Math.max(1, startScale.current * (d / pinchDist.current))));
    } else if (e.touches.length === 1 && lastTouch.current && scale > 1) {
      const t = e.touches[0];
      const last = lastTouch.current;
      setPos((p) => ({ x: p.x + t.clientX - last.x, y: p.y + t.clientY - last.y }));
      lastTouch.current = { x: t.clientX, y: t.clientY };
    }
  };

  const onTouchEnd = () => {
    pinchDist.current = null;
    lastTouch.current = null;
    if (scale <= 1) setPos({ x: 0, y: 0 });
  };

  return (
    <>
      <button type="button" onClick={openViewer} className={`block w-full overflow-hidden ${className}`}>
        <img src={src} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[120] bg-black/95"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
          >
            <X size={20} />
          </button>
          <div className="flex h-full w-full items-center justify-center overflow-hidden">
            <img
              src={src}
              alt={alt}
              draggable={false}
              onClick={() => { setScale((s) => (s > 1 ? 1 : 2.5)); setPos({ x: 0, y: 0 }); }}
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                transition: pinchDist.current ? "none" : "transform 0.25s ease",
              }}
              className="max-h-full max-w-full select-none object-contain"
            />
          </div>
          <p className="absolute bottom-4 w-full text-center text-[11px] font-semibold text-white/60">
            Bosing — yaqinlashtirish • Ikki barmoq — pinch • ✕ — yopish
          </p>
        </div>
      ) : null}
    </>
  );
}
