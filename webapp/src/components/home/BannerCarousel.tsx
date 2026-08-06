import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BannerSlide } from "../../api/home";
import { useApp } from "../../context/AppContext";

interface BannerCarouselProps {
  slides: BannerSlide[];
}

export default function BannerCarousel({ slides }: BannerCarouselProps) {
  const { format } = useApp();
  const [index, setIndex] = useState(0);
  const [imgError, setImgError] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;

  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % count);
    }, 5000);
    return () => clearInterval(id);
  }, [count]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  const slide = count > 0 ? slides[Math.min(index, count - 1)] : null;

  useEffect(() => {
    setImgError(false);
  }, [slide?.id, slide?.image_url]);

  if (!slide) return null;

  const linkUrl = slide.link_url || slide.button_url;
  const linkText = slide.link_text || slide.button_text || "Batafsil";

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0) setIndex((i) => (i + 1) % count);
      else setIndex((i) => (i - 1 + count) % count);
    }
    touchX.current = null;
  };

  return (
    <div
      className="relative aspect-[21/9] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#DB2777] via-rose-500 to-amber-500 soft-shadow"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* 1. Rasm (z-0 layer) */}
      {slide.image_url && !imgError ? (
        <img
          key={slide.id || slide.image_url}
          src={slide.image_url}
          alt={format(slide.title || "Pazanda AI")}
          loading="eager"
          decoding="async"
          onError={() => {
            console.error("[Banner] Rasm yuklanishida xatolik:", slide.image_url);
            setImgError(true);
          }}
          className="absolute inset-0 h-full w-full object-cover z-0 transition-opacity duration-300"
        />
      ) : null}

      {/* 2. Gradient Overlay (z-10 layer) */}
      <div className="banner-overlay absolute inset-0 z-10 pointer-events-none" />

      {/* 3. Matnlar va Tugmalar (z-20 layer) */}
      <div className="absolute inset-x-0 bottom-0 p-4 z-20 pointer-events-auto">
        <h2 className="font-display text-xl font-extrabold leading-6 text-white drop-shadow-md">
          {format(slide.title || "Pazanda AI")}
        </h2>
        {slide.subtitle ? (
          <p className="mt-1 line-clamp-1 text-xs font-medium text-white/90 drop-shadow-sm">
            {format(slide.subtitle)}
          </p>
        ) : null}
        {linkUrl ? (
          <a
            href={linkUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-extrabold text-[#DB2777] shadow active:scale-95 transition-transform"
          >
            <span>{format(linkText)}</span>
            <ExternalLink size={12} />
          </a>
        ) : null}
      </div>

      {/* 4. Karusel Navigatsiyasi (z-30 layer) */}
      {count > 1 ? (
        <>
          <button
            onClick={() => setIndex((i) => (i - 1 + count) % count)}
            aria-label="Oldingi"
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur z-30 active:scale-95 transition-transform"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % count)}
            aria-label="Keyingi"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur z-30 active:scale-95 transition-transform"
          >
            <ChevronRight size={16} />
          </button>
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur z-30">
            {slides.map((s, i) => (
              <button
                key={s.id || i}
                onClick={() => setIndex(i)}
                aria-label={`Slayd ${i + 1}`}
                className={
                  i === index
                    ? "h-1.5 w-4 rounded-full bg-white transition-all duration-300"
                    : "h-1.5 w-1.5 rounded-full bg-white/50 transition-all duration-300"
                }
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
