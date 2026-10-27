"use client"

import * as React from "react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

// Filters over a list (Tous 31 · À suivre 1 · Absences 14). The count stays muted next to the label.
function SegmentedFilter({
  items,
  value,
  defaultValue,
  onValueChange,
  label,
}: {
  items: { value: string; label: string; count?: number }[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  label: string
}) {
  return (
    <ToggleGroup
      type="single"
      aria-label={label}
      value={value}
      defaultValue={defaultValue ?? items[0]?.value}
      onValueChange={(v) => v && onValueChange?.(v)}
    >
      {items.map((it) => (
        <ToggleGroupItem key={it.value} value={it.value} className="h-[34px] gap-1.5 px-3.5">
          {it.label}
          {it.count !== undefined && <span className="text-[12.5px] font-normal text-muted-foreground">{it.count}</span>}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export { SegmentedFilter }
