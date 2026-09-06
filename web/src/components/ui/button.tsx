import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "iris" | "danger" | "on-ink";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Awake pills. The primary is an ink fill that empties on hover; the
 * secondary is its outlined sibling that fills. Iris is the electric
 * purple-blue reserved for the one action that matters.
 */
const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white border border-ink hover:bg-transparent hover:text-ink",
  secondary: "bg-transparent text-text border border-ink hover:bg-ink hover:text-white",
  ghost: "bg-transparent text-text-2 border border-transparent hover:bg-canvas-2 hover:text-text",
  iris: "bg-iris text-white border border-iris hover:bg-transparent hover:text-iris",
  danger: "bg-fall-tint text-fall-strong border border-transparent hover:bg-fall hover:text-white",
  "on-ink": "bg-white text-ink border border-white hover:bg-transparent hover:text-white",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-4 text-[13px] gap-1.5",
  md: "h-10 px-5 text-[14px] gap-2",
  lg: "h-12 px-6 text-[15px] gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, block, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center rounded-full font-medium whitespace-nowrap select-none transition-[background-color,color,opacity] duration-200 ease-in-out disabled:opacity-40 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : null}
      {children}
    </button>
  );
});
