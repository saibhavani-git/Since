/** Port: password hashing. Swappable so the algorithm can be upgraded without touching auth. */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(hashed: string, plain: string): Promise<boolean>;
}
