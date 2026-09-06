import { createHash, randomInt, randomUUID } from "node:crypto";

export const newId = (): string => randomUUID();

export const newOtpCode = (): string => randomInt(0, 1_000_000).toString().padStart(6, "0");

export const sha256 = (input: string): string => createHash("sha256").update(input).digest("hex");
