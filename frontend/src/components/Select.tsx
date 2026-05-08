import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-sm text-gray-500 font-medium">{label}</label>
      <div className="relative">
        <select
          className="h-12 w-full pl-3.5 pr-10 rounded-lg border border-gray-200 outline-none focus:border-teal-base focus:ring-1 focus:ring-teal-base focus:ring-inset bg-white appearance-none transition-all"
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <ChevronDown size={18} />
        </div>
      </div>
    </div>
  );
};
