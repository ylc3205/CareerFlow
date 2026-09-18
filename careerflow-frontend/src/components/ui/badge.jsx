import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/utils/index"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-indigo-50 text-indigo-700",
        default:
          "border-transparent bg-slate-100 text-slate-700",
        secondary:
          "border-transparent bg-slate-100 text-slate-600",
        outline: "border-border bg-white text-foreground",
        success:
          "border-transparent bg-emerald-50 text-emerald-700",
        warning:
          "border-transparent bg-amber-50 text-amber-700",
        destructive:
          "border-transparent bg-red-50 text-red-700",
        danger:
          "border-transparent bg-red-50 text-red-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
