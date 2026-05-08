import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className={`flex flex-col gap-1 w-full min-w-0 max-w-full ${className}`}>
      <label className="text-sm text-gray-500 font-medium">{label}</label>
      <input
        className={`h-12 w-full min-w-0 max-w-full px-3.5 rounded-lg border outline-none transition-colors ${error ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-teal-base focus:ring-1 focus:ring-teal-base focus:ring-inset'}`}
        {...props}
      />
      {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
    </div>
  );
};
