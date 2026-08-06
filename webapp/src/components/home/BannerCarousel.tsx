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
  const touchX = useRef<number | null>(null);

  const count = slides.length;

  // Avto aylanish — har 5 soniyada
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

  if (count === 0) return null;

  const slide = slides[Math.min(index, count - 1)];
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
      {slide.image_url ? (
        <img
          key={slide.id}
          src={slide.image_url}
          alt={format(slide.title || "Pazanda AI")}
          className="h-full w-full object-cover transition-all duration-500"
        />
      ) : null}

      <div className="banner-overlay absolute inset-0" />

      <div className="absolute inset-x-0 bottom-0 p-4">
        <h2 className="font-display text-xl font-extrabold leading-6 text-white drop-shadow-sm">
          {format(slide.title || "Pazanda AI")}
        </h2>

        {slide.subtitle ? (
          <p className="mt-1 line-clamp-1 text-xs font-medium text-white/85">
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

      {count > 1 ? (
        <>
          <button
            onClick={() => setIndex((i) => (i - 1 + count) % count)}
            aria-label="Oldingi"
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur active:scale-95"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            onClick={() => setIndex((i) => (i + 1) % count)}
            aria-label="Keyingi"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur active:scale-95"
          >
            <ChevronRight size={16} />
          </button>

          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 backdrop-blur">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setIndex(i)}
                aria-label={`Slayd ${i + 1}`}
                className={
                  i === index
                    ? "h-1.5 w-4 rounded-full bg-white transition-all"
                    : "h-1.5 w-1.5 rounded-full bg-white/50 transition-all"
                }
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
