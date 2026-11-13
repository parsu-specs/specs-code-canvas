import type { ReactNode } from "react";
import type { Icon } from "@phosphor-icons/react";

type NoticeBannerProps = {
  icon: Icon;
  title: ReactNode;
  description: ReactNode;
  tone?: "success" | "secondary";
  className?: string;
  children?: ReactNode;
};

const toneClasses = {
  success: "bg-success",
  secondary: "bg-secondary",
};

export default function NoticeBanner({
  icon: Icon,
  title,
  description,
  tone = "success",
  className = "",
  children,
}: NoticeBannerProps) {
  return (
    <div
      className={`min-w-0 toon-card toon-paper flex flex-col flex-wrap items-start gap-4 p-6 sm:flex-row sm:items-center ${toneClasses[tone]} ${className} max-w-full`}
    >
      <Icon size={32} weight="duotone" className="shrink-0" />
      <div className="w-full min-w-[min(100%,20rem)] sm:w-auto sm:flex-1">
        <h3 className="text-xl font-black">{title}</h3>
        <p className="mt-1 text-sm font-bold text-body">{description}</p>
      </div>
      {children && (
        <div className="min-w-0 flex max-w-full shrink-0 flex-wrap gap-2">{children}</div>
      )}
    </div>
  );
}
