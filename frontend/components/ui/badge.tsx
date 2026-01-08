import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-charcoal text-cream",
        secondary: "border-transparent bg-beige text-charcoal",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-charcoal border-gold/30",
        success: "border-transparent bg-sage/20 text-sage backdrop-blur-sm",
        warning: "border-transparent bg-amber/20 text-amber backdrop-blur-sm",
        gold: "border-transparent bg-gold/20 text-gold backdrop-blur-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
