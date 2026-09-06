/**
 * Port: delivery of one‑time codes.
 *
 * The service layer only knows this interface. Adding an SMS vendor means one
 * new adapter file and one line in `index.ts`.
 */
export interface OtpSender {
  /** Human name for logs and health output. */
  readonly name: string;
  /**
   * Generate and deliver a code. Returns the plaintext code (to be hashed and
   * stored by the caller) and whether the client may be shown it — only
   * development senders say yes.
   */
  send(phone: string): Promise<OtpDelivery>;
}

export interface OtpDelivery {
  code: string;
  echoToClient: boolean;
}
