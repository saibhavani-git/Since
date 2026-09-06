import { cx } from "@/lib/cx";

export function Card({ className, children, as: Tag = "div", ...rest }: React.HTMLAttributes<HTMLElement> & { as?: "div" | "article" | "section" }) {
  return (
    <Tag className={cx("rounded-lg border border-line bg-surface shadow-card", className)} {...rest}>
      {children}
    </Tag>
  );
}
