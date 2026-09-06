/** Tiny class joiner. Falsy values are dropped. */
export const cx = (...parts: Array<string | false | null | undefined>): string => parts.filter(Boolean).join(" ");
