import type { InputHTMLAttributes, ReactNode } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import Input from "./Input";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children"> & {
  "aria-label": string;
  children?: ReactNode;
};

/** Search and optional actions share a field without nesting buttons in a label. */
export default function SearchField({ children, className = "", ...props }: Props) {
  return (
    <div className="flex min-w-0 w-full items-center gap-1 rounded-2xl border-[3px] border-outline bg-surface pl-3 pr-1 shadow-[4px_4px_0_var(--color-outline)] transition-colors hover:border-primary focus-within:border-primary">
      <MagnifyingGlass size={18} weight="bold" aria-hidden="true" className="shrink-0 text-muted" />
      <Input
        {...props}
        type="search"
        variant="minimal"
        className={`min-h-11 flex-1 py-2 text-base ${className}`}
      />
      {children}
    </div>
  );
}
