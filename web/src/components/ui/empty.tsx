import { cx } from "@/lib/cx";

export function Empty({ title, body, action, className }: { title: string; body?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col items-center justify-center rounded-md border border-dashed border-line-2 px-6 py-14 text-center", className)}>
      <p className="display text-[24px] text-text">{title}</p>
      {body ? <p className="mt-2 max-w-[38ch] text-[15px] leading-relaxed text-text-2">{body}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
