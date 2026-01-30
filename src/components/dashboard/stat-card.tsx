import Link from "next/link";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  description?: string;
  className?: string;
  iconClassName?: string;
  href?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  className,
  iconClassName,
  href,
}: StatCardProps) {
  const cardClassName = cn(
    "group relative overflow-hidden rounded-3xl p-5 transition-all duration-300",
    "glass-interactive",
    href && "cursor-pointer",
    className,
  );

  const content = (
    <>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-105",
            "glass-icon",
            iconClassName,
          )}
        >
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground/80">{title}</p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">
            {value.toLocaleString()}
          </p>
        </div>
      </div>
      {description && (
        <p className="mt-3 text-xs text-muted-foreground">{description}</p>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardClassName}>
        {content}
      </Link>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}
