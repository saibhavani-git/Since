/**
 * Browsers only let an <audio> element play with sound if it was first
 * played inside a user gesture. Our narration fetches audio asynchronously,
 * so the gesture is long gone by the time the real clip arrives. Call this
 * synchronously inside the click that opens the player: it plays a silent
 * clip on a fresh element, which unlocks that element for later `play()`.
 */
const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

export function primeAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  const el = new Audio(SILENT_WAV);
  el.preload = "auto";
  el.play().catch(() => undefined);
  return el;
}
