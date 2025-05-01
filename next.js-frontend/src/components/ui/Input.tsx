import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, fullWidth = false, className = "", ...props }, ref) => {
    const baseClasses = "px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
    const errorClasses = error ? "border-red-300 text-red-900 placeholder-red-300" : "border-gray-300 placeholder-gray-400";
    const disabledClasses = props.disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white";
    const widthClass = fullWidth ? "w-full" : "";
    
    const classes = `${baseClasses} ${errorClasses} ${disabledClasses} ${widthClass} ${className}`;
    
    return (
      <div className={fullWidth ? "w-full" : ""}>
        {label && (
          <label 
            htmlFor={props.id} 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        <input 
          ref={ref}
          className={classes}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
