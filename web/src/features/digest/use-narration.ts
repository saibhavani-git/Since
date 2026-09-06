"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { ScriptSegment } from "@/lib/api/types";
import { NarrationEngine, type NarrationState } from "./narration-engine";

export interface Narration extends NarrationState {
  segment: ScriptSegment;
  go: (i: number) => void;
  next: () => void;
  prev: () => void;
  toggle: () => void;
  setMuted: (m: boolean) => void;
  retryVoice: () => void;
}

const idle: NarrationState = { index: 0, playing: false, progress: 0, hasAudio: false, loading: false, muted: false, ended: false };

/**
 * Binds a NarrationEngine to React for the lifetime of the component.
 * The engine is created once on mount; later prop changes are ignored, so
 * remount (with a key) to play a different script or start point.
 */
export function useNarration(script: ScriptSegment[], speechEnabled: boolean, audio: HTMLAudioElement | null = null, startIndex = 0): Narration {
  const [engine] = useState(() => new NarrationEngine(script, speechEnabled, audio, startIndex));
  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot, () => idle);

  useEffect(() => {
    engine.start();
    return () => engine.dispose();
  }, [engine]);

  return {
    ...state,
    segment: script[state.index]!,
    go: engine.go,
    next: engine.next,
    prev: engine.prev,
    toggle: engine.toggle,
    setMuted: engine.setMuted,
    retryVoice: engine.retryVoice,
  };
}
