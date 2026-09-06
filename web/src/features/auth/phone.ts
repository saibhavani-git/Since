/** Mirror of the API's PhoneNumber rule so the form can validate before the round-trip. */
export const normalisePhone = (raw: string): string => raw.replace(/[\s\-()]/g, "");
export const isIndianMobile = (raw: string): boolean => /^(\+91)?[6-9]\d{9}$/.test(normalisePhone(raw));
/** Ten digits for display in the field; the API adds +91. */
export const tenDigits = (raw: string): string => normalisePhone(raw).replace(/^\+91/, "").slice(0, 10);
