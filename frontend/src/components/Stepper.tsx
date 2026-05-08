import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface StepperProps {
  value: number;
  onChange: (val: number) => void;
  max: number;
}

export const Stepper: React.FC<StepperProps> = ({ value, onChange, max }) => {
  return (
    <div className="flex items-center gap-4">
      <button 
        type="button"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        className="w-12 h-12 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 disabled:opacity-30 disabled:bg-gray-100 active:bg-gray-100"
      >
        <Minus size={20} />
      </button>
      <span className="text-2xl font-semibold w-8 text-center">{value}</span>
      <button 
        type="button"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="w-12 h-12 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 disabled:opacity-30 disabled:bg-gray-100 active:bg-gray-100"
      >
        <Plus size={20} />
      </button>
    </div>
  );
};
