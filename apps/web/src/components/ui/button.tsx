import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-label font-bold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lmls-electric focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-lmls-black text-lmls-white border-2 border-lmls-black shadow-brutal-sm hover:shadow-brutal-hover hover:translate-x-[2px] hover:translate-y-[2px]",
        destructive:
          "bg-lmls-red text-lmls-white border-2 border-lmls-red shadow-brutal-red hover:shadow-brutal-hover hover:translate-x-[2px] hover:translate-y-[2px]",
        outline:
          "border-2 border-lmls-black bg-lmls-white text-lmls-black shadow-brutal-sm hover:shadow-brutal-hover hover:translate-x-[2px] hover:translate-y-[2px]",
        secondary:
          "bg-lmls-paper text-lmls-black border-2 border-lmls-black shadow-brutal-sm hover:shadow-brutal-hover hover:translate-x-[2px] hover:translate-y-[2px]",
        ghost: "hover:bg-lmls-paper hover:text-lmls-black",
        link: "text-lmls-electric underline-offset-4 hover:underline",
        electric: "bg-lmls-electric text-lmls-white border-2 border-lmls-electric shadow-brutal-electric hover:shadow-brutal-hover hover:translate-x-[2px] hover:translate-y-[2px]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-8 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
