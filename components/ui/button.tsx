import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants = {
      default: "bg-legal-navy text-white hover:bg-legal-navy-light",
      outline: "border border-border bg-white text-ink hover:bg-legal-cream",
      ghost: "text-ink hover:bg-paper-dark",
    };
    const sizes = {
      default: "px-5 py-2.5 text-sm",
      sm: "px-3 py-1.5 text-xs",
      lg: "px-7 py-3.5 text-base",
    };
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-sans font-semibold rounded-xl transition-all duration-200 select-none disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
