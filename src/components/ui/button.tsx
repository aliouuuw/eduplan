import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { LoaderCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[15px] font-medium transition-[background-color,box-shadow,color,scale] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-[18px] shrink-0 [&_svg]:shrink-0 outline-none",
  {
    variants: {
      variant: {
        // The one primary action per screen: the ink capsule with a warm glow beneath it.
        default: "fill-primary text-primary-foreground shadow-glow-primary hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_16px_26px_-12px_rgb(214_90_64/0.65),0_4px_10px_-6px_rgb(36_33_47/0.5)]",
        destructive:
          // Tonal on purpose: A+ never fills a surface with saturated coral.
          "bg-now-soft text-now-ink hover:bg-[#fbd9d0]",
        outline:
          "bg-card text-foreground shadow-lift hover:bg-progress-faint [&_svg]:text-progress-ink",
        secondary:
          "bg-progress-faint text-foreground hover:bg-progress-soft",
        ghost:
          "text-ink-2 hover:bg-progress-faint hover:text-foreground",
        link: "h-auto px-0 text-sm text-progress-ink underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 has-[>svg]:pl-4",
        sm: "h-9 gap-1.5 px-4 text-sm has-[>svg]:pl-3",
        lg: "h-[52px] px-6 text-base has-[>svg]:pl-5",
        icon: "size-11",
        "icon-sm": "size-9",
        "icon-lg": "size-[52px]",
      },
    },
    // A link stays inline whatever size it is given.
    compoundVariants: [{ variant: "link", className: "h-auto px-0 has-[>svg]:px-0" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Busy after a click (saving, sending): disabled, with a spinner in place of the icon. */
    loading?: boolean
  }) {
  if (asChild) {
    return (
      <Slot data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props}>
        {children}
      </Slot>
    )
  }

  return (
    <button
      data-slot="button"
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }), loading && "disabled:opacity-80 [&>svg:not(.spinner)]:hidden")}
      {...props}
    >
      {loading && <LoaderCircle className="spinner animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export { Button, buttonVariants }
