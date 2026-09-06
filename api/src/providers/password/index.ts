import { Argon2PasswordHasher } from "./argon2.hasher.js";
import type { PasswordHasher } from "./ports.js";

export type { PasswordHasher } from "./ports.js";

export function createPasswordHasher(): PasswordHasher {
  return new Argon2PasswordHasher();
}
