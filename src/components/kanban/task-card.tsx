"use client";

import { cn } from "@/lib/utils";
import { StatusSelector, type TaskStatus } from "./status-selector";

interface TaskCardProps {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  onStatusChange: (status: TaskStatus) => void;
  onClick: () => void;
}

export function TaskCard({
  title,
  description,
  status,
  onStatusChange,
  onClick,
}: TaskCardProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: div needed for block content
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "border border-border bg-background p-3 cursor-pointer",
        "hover:border-ring transition-colors",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium line-clamp-2">{title}</h4>
      </div>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
          {description}
        </p>
      )}
      <div className="mt-2">
        <StatusSelector value={status} onChange={onStatusChange} />
      </div>
    </div>
  );
}
