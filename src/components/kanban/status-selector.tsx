"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type TaskStatus =
  | "todo"
  | "processing"
  | "in_review"
  | "done"
  | "cancel";

export const statusConfig: Record<
  TaskStatus,
  { label: string; color: string }
> = {
  todo: { label: "Todo", color: "bg-gray-500" },
  processing: { label: "Processing", color: "bg-blue-500" },
  in_review: { label: "In Review", color: "bg-yellow-500" },
  done: { label: "Done", color: "bg-green-500" },
  cancel: { label: "Cancelled", color: "bg-red-500" },
};

interface StatusSelectorProps {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
}

export function StatusSelector({ value, onChange }: StatusSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={(val) => {
        if (val) onChange(val as TaskStatus);
      }}
    >
      <SelectTrigger size="sm" onClick={(e) => e.stopPropagation()}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(statusConfig).map(([status, config]) => (
          <SelectItem key={status} value={status}>
            {config.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface StatusBadgeProps {
  status: TaskStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs px-2 py-0.5",
        "text-white",
        config.color,
      )}
    >
      {config.label}
    </span>
  );
}
