import { Loader2 } from "lucide-react";

const variants = {
  primary: "bg-primary-600 hover:bg-primary-700 text-white shadow-sm",
  secondary: "bg-gray-100 hover:bg-gray-200 text-gray-800",
  success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
  warning: "bg-amber-500 hover:bg-amber-600 text-white shadow-sm",
  danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm",
  ghost: "hover:bg-gray-100 text-gray-700",
  outline: "border border-gray-300 hover:bg-gray-50 text-gray-700",
};

const sizes = {
  xs: "px-2 py-1 text-xs",
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  isLoading = false,
  disabled = false,
  className = "",
  ...props
}) {
  const isBusy = loading || isLoading;

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}
      `}
      disabled={disabled || isBusy}
      {...props}
    >
      {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
