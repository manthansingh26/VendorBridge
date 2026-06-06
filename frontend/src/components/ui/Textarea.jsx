import { forwardRef } from "react";

const Textarea = forwardRef(({
  label,
  error,
  icon: Icon,
  className = "",
  rows = 4,
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute top-3 left-0 pl-3 pointer-events-none">
            <Icon className="h-4 w-4 text-gray-400" />
          </div>
        )}
        <textarea
          ref={ref}
          rows={rows}
          className={`
            w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm
            placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            disabled:bg-gray-50 disabled:cursor-not-allowed
            transition-colors duration-200
            ${Icon ? "pl-10" : ""}
            ${error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : ""}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

Textarea.displayName = "Textarea";

export default Textarea;
