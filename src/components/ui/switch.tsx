"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type SwitchProps = Omit<React.ComponentProps<"button">, "onChange"> & {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

// The "interrupteur" (e.g. a remark's "visible famille"). A native button with role="switch",
// so it needs no extra dependency and works with the keyboard and screen readers.
function Switch({ checked, defaultChecked = false, onCheckedChange, className, onClick, ...props }: SwitchProps) {
  const [inner, setInner] = React.useState(defaultChecked)
  const on = checked ?? inner

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      data-slot="switch"
      data-state={on ? "checked" : "unchecked"}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented) return
        if (checked === undefined) setInner(!on)
        onCheckedChange?.(!on)
      }}
      className={cn(
        "relative inline-flex h-[22px] w-[38px] shrink-0 rounded-full bg-track transition-colors disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:fill-progress",
        "after:absolute after:top-[3px] after:left-[3px] after:size-4 after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgb(36_33_47/0.2)] after:transition-transform after:duration-250 after:ease-[cubic-bezier(0.16,1,0.3,1)] data-[state=checked]:after:translate-x-4",
        className
      )}
      {...props}
    />
  )
}

export { Switch }
