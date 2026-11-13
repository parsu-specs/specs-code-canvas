import { useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Images } from "@phosphor-icons/react";
import { Button } from "./Button";
import ProjectImage from "./ProjectImage";

export default function ScreenshotCarousel({
  title,
  images,
  onOpen,
}: {
  title: string;
  images: string[];
  onOpen: (index: number) => void;
}) {
  const id = useId();
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const index = Math.min(active, images.length - 1);

  if (!images.length) return null;

  const navigate = (next: number) => {
    const viewport = track.current;
    if (!viewport) return;
    const slides = viewport.children;
    const target = Math.max(0, Math.min(next, images.length - 1));
    viewport.scrollTo({
      left: (slides[target] as HTMLElement).offsetLeft - (slides[0] as HTMLElement).offsetLeft,
    });
  };

  return (
    <section
      aria-labelledby={`${id}-heading`}
      aria-roledescription="carousel"
      className="mt-5 min-w-0"
    >
      <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h3 id={`${id}-heading`} className="flex items-center gap-2 text-lg font-black">
          <Images size={20} weight="duotone" className="shrink-0" />
          Screenshots
        </h3>
        {images.length > 1 && (
          <div className="flex items-center gap-2">
            <span aria-live="polite" aria-atomic="true" className="text-xs font-bold text-muted">
              {index + 1} / {images.length}
            </span>
            <Button
              variant="icon"
              className="size-11"
              aria-label="Previous screenshot"
              aria-controls={`${id}-track`}
              disabled={index === 0}
              onClick={() => navigate(index - 1)}
            >
              <ArrowLeft size={18} weight="bold" />
            </Button>
            <Button
              variant="icon"
              className="size-11"
              aria-label="Next screenshot"
              aria-controls={`${id}-track`}
              disabled={index === images.length - 1}
              onClick={() => navigate(index + 1)}
            >
              <ArrowRight size={18} weight="bold" />
            </Button>
          </div>
        )}
      </div>
      <div
        ref={track}
        id={`${id}-track`}
        role="group"
        aria-label="Project screenshots. Use left and right arrow keys to browse."
        tabIndex={images.length > 1 ? 0 : undefined}
        className="relative flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain rounded-xl pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden motion-safe:scroll-smooth focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-secondary"
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            navigate(index + (event.key === "ArrowRight" ? 1 : -1));
          }
        }}
        onScroll={() => {
          const viewport = track.current;
          if (!viewport) return;
          const first = (viewport.children[0] as HTMLElement).offsetLeft;
          let nearest = 0;
          let distance = Infinity;
          Array.from(viewport.children).forEach((slide, slideIndex) => {
            const delta = Math.abs((slide as HTMLElement).offsetLeft - first - viewport.scrollLeft);
            if (delta < distance) {
              distance = delta;
              nearest = slideIndex;
            }
          });
          setActive(nearest);
        }}
      >
        {images.map((src, imageIndex) => (
          <div
            key={`${imageIndex}-${src.slice(0, 64)}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${imageIndex + 1} of ${images.length}`}
            className="min-w-0 shrink-0 basis-full snap-center"
          >
            <Button
              variant="plain"
              onClick={() => onOpen(imageIndex)}
              aria-label={`View ${title} screenshot ${imageIndex + 1} full size`}
              className="toon-card block w-full cursor-zoom-in overflow-hidden bg-inverse p-0"
            >
              <span className="relative block aspect-video w-full overflow-hidden">
                <ProjectImage
                  src={src}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
                />
                <ProjectImage
                  src={src}
                  alt={`${title} screenshot ${imageIndex + 1}`}
                  loading="lazy"
                  className="relative h-full w-full object-contain object-center"
                />
              </span>
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
