"use client";

import { useRef, useState } from "react";

/**
 * The two-minute film. A poster with one play button; native controls the
 * moment it starts, because after that the player should get out of the way.
 */
export function DemoVideo() {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-line bg-ink shadow-float">
      <video
        ref={ref}
        className="block aspect-video w-full"
        src="/media/since-demo.mp4"
        poster="/media/since-demo-poster.jpg"
        controls={playing}
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
      />
      {!playing && (
        <button
          type="button"
          aria-label="Play the demo video"
          onClick={() => {
            setPlaying(true);
            void ref.current?.play();
          }}
          className="group absolute inset-0 flex cursor-pointer items-center justify-center"
        >
          <span className="absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100" aria-hidden />
          <span className="relative flex size-16 items-center justify-center rounded-full bg-white text-ink shadow-float transition-transform duration-200 group-hover:scale-110 sm:size-20">
            <svg width="20" height="24" viewBox="0 0 22 26" fill="currentColor" aria-hidden className="translate-x-[2px]">
              <path d="M1.5 2.4c0-1.2 1.3-2 2.4-1.4l17 10.6c1 .6 1 2.1 0 2.7l-17 10.6c-1.1.7-2.4-.1-2.4-1.4V2.4Z" />
            </svg>
          </span>
          <span className="absolute bottom-5 left-6 hidden items-center gap-2 sm:flex" aria-hidden>
            <span className="inline-flex h-7 items-center rounded-full bg-white/90 px-3 text-[10.5px] font-bold uppercase tracking-[0.07em] text-ink backdrop-blur">2 minutes</span>
            <span className="inline-flex h-7 items-center rounded-full bg-white/90 px-3 text-[10.5px] font-bold uppercase tracking-[0.07em] text-ink backdrop-blur">With sound</span>
          </span>
        </button>
      )}
    </div>
  );
}
