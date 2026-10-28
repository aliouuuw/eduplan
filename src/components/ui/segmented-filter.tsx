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
  // Always controlled underneath: Radix sends "" when the active item is clicked again, and a filter
  // must always have one segment on, so that value is ignored instead of clearing the selection.
  const [inner, setInner] = React.useState(defaultValue ?? items[0]?.value ?? "")
  const current = value ?? inner

  return (
    <ToggleGroup
      type="single"
      aria-label={label}
      value={current}
      onValueChange={(v) => {
        if (!v) return
        setInner(v)
        onValueChange?.(v)
      }}
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
