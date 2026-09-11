'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface Props {
  images: string[];
  alt: string;
}

/** Piste défilable au doigt (mobile) ou à la souris (desktop) — glisser change l'image active. */
function SwipeTrack({
  images,
  alt,
  active,
  setActive,
  onTap,
  priority,
  sizes,
  imageClassName,
}: {
  images: string[];
  alt: string;
  active: number;
  setActive: (i: number) => void;
  onTap?: () => void;
  priority?: boolean;
  sizes: string;
  imageClassName: string;
}) {
  const count = images.length;
  const [dragX, setDragX] = useState(0);
  const dragging = useRef(false);
  const startX = useRef(0);
  const widthRef = useRef(1);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    startX.current = e.clientX;
    widthRef.current = e.currentTarget.clientWidth || 1;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    setDragX(e.clientX - startX.current);
  };

  const release = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const threshold = widthRef.current * 0.15;
    if (dragX <= -threshold && active < count - 1) setActive(active + 1);
    else if (dragX >= threshold && active > 0) setActive(active - 1);
    else if (Math.abs(dragX) < 5) onTap?.();
    setDragX(0);
  };

  const dragPercent = widthRef.current ? (dragX / widthRef.current) * 100 : 0;
  const translate = -(active * 100) + dragPercent;

  return (
    <div
      className="h-full w-full touch-pan-y select-none [-webkit-touch-callout:none]"
      style={{ overflow: 'hidden' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
    >
      <div
        className="flex h-full"
        style={{
          width: `${count * 100}%`,
          transform: `translateX(${translate / count}%)`,
          transition: dragging.current ? 'none' : 'transform 300ms ease',
        }}
      >
        {images.map((src, i) => (
          <div key={src} className="relative h-full shrink-0" style={{ width: `${100 / count}%` }}>
            <Image
              src={src}
              alt={i === active ? alt : ''}
              fill
              priority={priority && i === active}
              draggable={false}
              sizes={sizes}
              className={imageClassName}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductGallery({ images, alt }: Props) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const count = images.length;

  const go = useCallback(
    (dir: 1 | -1) => setActive((i) => (i + dir + count) % count),
    [count],
  );

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoom(false);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [zoom, go]);

  if (count === 0) {
    return (
      <div className="relative aspect-square rounded-[var(--radius-card)] bg-[var(--color-surface-2)]" />
    );
  }

  const arrowBtn =
    'absolute top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white text-xl leading-none backdrop-blur-sm hover:bg-black/65';

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative aspect-square cursor-grab rounded-[var(--radius-card)] overflow-hidden bg-[var(--color-surface-2)] active:cursor-grabbing"
        role="button"
        tabIndex={0}
        aria-label="Agrandir l’image"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setZoom(true);
          }
        }}
      >
        <SwipeTrack
          images={images}
          alt={alt}
          active={active}
          setActive={setActive}
          onTap={() => setZoom(true)}
          priority
          sizes="(max-width:768px) 100vw, 50vw"
          imageClassName="object-cover"
        />
        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className={`${arrowBtn} left-2`}
              aria-label="Image précédente"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className={`${arrowBtn} right-2`}
              aria-label="Image suivante"
            >
              ›
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/45 px-2 py-0.5 text-xs text-white">
              {active + 1} / {count}
            </span>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="grid grid-cols-5 gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Voir l’image ${i + 1}`}
              aria-current={i === active}
              className={`relative aspect-square rounded-md overflow-hidden bg-[var(--color-surface-2)] ${
                i === active
                  ? 'ring-2 ring-[var(--color-brand)]'
                  : 'ring-1 ring-[var(--color-border)] opacity-70 hover:opacity-100'
              }`}
            >
              <Image src={src} alt="" fill sizes="20vw" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      {zoom ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setZoom(false)}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          <button
            type="button"
            onClick={() => setZoom(false)}
            className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
            aria-label="Fermer"
          >
            ×
          </button>
          <div
            className="relative h-full w-full max-w-4xl cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <SwipeTrack
              images={images}
              alt={alt}
              active={active}
              setActive={setActive}
              sizes="100vw"
              imageClassName="object-contain"
            />
            {count > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className={`${arrowBtn} left-0`}
                  aria-label="Image précédente"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className={`${arrowBtn} right-0`}
                  aria-label="Image suivante"
                >
                  ›
                </button>
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm text-white">
                  {active + 1} / {count}
                </span>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
