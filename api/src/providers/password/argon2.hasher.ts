import { hash, verify } from "@node-rs/argon2";
import type { PasswordHasher } from "./ports.js";

/** argon2id with library defaults (OWASP‑recommended parameters). */
export class Argon2PasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return hash(plain);
  }

  async verify(hashed: string, plain: string): Promise<boolean> {
    try {
      return await verify(hashed, plain);
    } catch {
      return false;
    }
  }
}
