import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import type { HomeBannerSlide } from "../../api/home";
import { useApp } from "../../context/AppContext";

interface BannerCarouselProps {
  slides: HomeBannerSlide[];
  isPremium: boolean;
}

export default function BannerCarousel({ slides, isPremium }: BannerCarouselProps) {
  const { format } = useApp();

  const activeSlides = slides.filter((s) => s.active !== false);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (activeSlides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [activeSlides.length]);

  if (activeSlides.length === 0) {
    return (
      <div className="relative aspect-[21/9] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#DB2777] via-rose-500 to-amber-500 p-5 shadow-lg">
        <div className="banner-overlay absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-center gap-2">
            {isPremium ? (
              <span className="gold-gradient flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold text-slate-900 shadow">
                👑 Premium
              </span>
            ) : null}
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
              {format("Pazanda AI")}
            </span>
          </div>
          <h2 className="mt-2 font-display text-xl font-extrabold leading-6 text-white">
            {format("Mazzali retseptlar va oshxona sirlari")}
          </h2>
        </div>
      </div>
    );
  }

  const currentSlide = activeSlides[currentIndex] || activeSlides[0];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  return (
    <div className="relative aspect-[21/9] w-full overflow-hidden rounded-3xl bg-slate-900 shadow-xl">
      {/* Background Image / Gradient */}
      {currentSlide.image_url ? (
        <img
          key={currentSlide.id}
          src={currentSlide.image_url}
          alt={format(currentSlide.title || "Pazanda AI")}
          className="h-full w-full object-cover transition-all duration-700 ease-in-out"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-[#DB2777] via-rose-500 to-amber-500" />
      )}

      {/* Dark Overlay gradient for contrast */}
      <div className="banner-overlay absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

      {/* Slide Content */}
      <div className="absolute inset-x-0 bottom-0 p-4.5">
        <div className="flex items-center gap-2">
          {isPremium ? (
            <span className="gold-gradient flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold text-slate-900 shadow">
              👑 Premium
            </span>
          ) : null}

          <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
            {format("Bugun nima pishiramiz?")}
          </span>
        </div>

        <h2 className="mt-2 font-display text-xl font-extrabold leading-6 text-white drop-shadow-sm">
          {format(currentSlide.title || "Pazanda AI")}
        </h2>

        {currentSlide.subtitle ? (
          <p className="mt-1 line-clamp-1 text-xs font-medium text-white/90">
            {format(currentSlide.subtitle)}
          </p>
        ) : null}

        {/* Action Button if button_text is present */}
        {currentSlide.button_text && currentSlide.button_url ? (
          <a
            href={currentSlide.button_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-2xl bg-white px-3.5 py-1.5 text-xs font-extrabold text-[#DB2777] shadow-md active:scale-95"
          >
            <span>{format(currentSlide.button_text)}</span>
            <ExternalLink size={13} />
          </a>
        ) : null}
      </div>

      {/* Carousel Navigation Arrows (only if slides > 1) */}
      {activeSlides.length > 1 ? (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white/80 backdrop-blur hover:bg-black/50 active:scale-95"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white/80 backdrop-blur hover:bg-black/50 active:scale-95"
          >
            <ChevronRight size={18} />
          </button>

          {/* Dots Indicator */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 backdrop-blur">
            {activeSlides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
