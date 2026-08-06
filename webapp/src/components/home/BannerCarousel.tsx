import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { BannerSlide } from "../../api/home";
import { useApp } from "../../context/AppContext";

interface BannerCarouselProps {
  slides: BannerSlide[];
}

export default function BannerCarousel({ slides }: BannerCarouselProps) {
  const { format } = useApp();
  const [index, setIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;

  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % count);
      setImageLoaded(false); // yangi slide uchun reset
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
      <AnimatePresence mode="wait">
        {slide.image_url ? (
          <motion.img
            key={slide.id}
            src={slide.image_url}
            alt={format(slide.title || "Pazanda AI")}
            // OPTIMIZATSIYA: eager loading + high priority
            loading="eager"
            {...({ fetchpriority: "high" } as any)}
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{
              opacity: imageLoaded ? 1 : 0,
              scale: imageLoaded ? 1 : 1.05,
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
              duration: 0.5,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
      </AnimatePresence>

      {/* Skeleton while image loading */}
      {!imageLoaded && slide.image_url ? (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200" />
      ) : null}

      <div className="banner-overlay absolute inset-0" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="absolute inset-x-0 bottom-0 p-4"
      >
        <h2 className="font-display text-xl font-extrabold leading-6 text-white drop-shadow-sm">
          {format(slide.title || "Pazanda AI")}
        </h2>
        {slide.subtitle ? (
          <p className="mt-1 line-clamp-1 text-xs font-medium text-white/85">
            {format(slide.subtitle)}
          </p>
        ) : null}
        {linkUrl ? (
          <motion.a
            href={linkUrl}
            target="_blank"
            rel="noreferrer"
            whileTap={{ scale: 0.95 }}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-extrabold text-[#DB2777] shadow"
          >
            <span>{format(linkText)}</span>
            <ExternalLink size={12} />
          </motion.a>
        ) : null}
      </motion.div>

      {count > 1 ? (
        <>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIndex((i) => (i - 1 + count) % count)}
            aria-label="Oldingi"
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur"
          >
            <ChevronLeft size={16} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIndex((i) => (i + 1) % count)}
            aria-label="Keyingi"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur"
          >
            <ChevronRight size={16} />
          </motion.button>
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 backdrop-blur">
            {slides.map((s, i) => (
              <motion.button
                key={s.id}
                onClick={() => setIndex(i)}
                aria-label={`Slayd ${i + 1}`}
                animate={{
                  width: i === index ? 16 : 6,
                  backgroundColor:
                    i === index
                      ? "rgba(255, 255, 255, 1)"
                      : "rgba(255, 255, 255, 0.5)",
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="h-1.5 rounded-full"
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
