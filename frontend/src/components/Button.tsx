import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, loading, className = '', disabled, ...props }) => {
  return (
    <button
      disabled={disabled || loading}
      className={`w-full h-12 rounded-lg font-bold text-white transition-all ${disabled || loading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-teal-base active:bg-teal-active hover:bg-teal-hover'} ${className}`}
      {...props}
    >
      {loading ? 'Загрузка...' : children}
    </button>
  );
};
