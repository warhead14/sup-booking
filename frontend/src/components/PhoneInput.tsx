import React from 'react';
import { Input } from './Input';

interface PhoneInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  className?: string;
}

export const formatPhoneNumber = (input: string): string => {
  // Minimum state is "+7 (9"
  if (input.length < 5 && input.length > 0) {
    return '+7 (9';
  }
  if (input.length === 0) return '';
  
  let digits = input.replace(/\D/g, '');
  
  // Strip the country code (7 or 8)
  if (digits.startsWith('7') || digits.startsWith('8')) {
    digits = digits.substring(1);
  }
  
  // Force start with 9 if not present (safety check)
  if (digits.length > 0 && !digits.startsWith('9')) {
    digits = '9' + digits;
  } else if (digits.length === 0) {
    digits = '9';
  }
  
  digits = digits.substring(0, 10);
  
  let formatted = '+7 (';
  if (digits.length > 0) formatted += digits.substring(0, 3);
  if (digits.length >= 4) formatted += `) ${digits.substring(3, 6)}`;
  if (digits.length >= 7) formatted += `-${digits.substring(6, 8)}`;
  if (digits.length >= 9) formatted += `-${digits.substring(8, 10)}`;
  
  return formatted;
};

export const PhoneInput: React.FC<PhoneInputProps> = ({ 
  label, 
  value, 
  onChange, 
  error, 
  placeholder = '+7 (999) 000-00-00',
  className = ''
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    onChange(formatted);
  };

  const handleFocus = () => {
    if (!value || value.length < 5) {
      onChange('+7 (9');
    }
  };

  return (
    <Input
      label={label}
      type="tel"
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      onFocus={handleFocus}
      error={error}
      className={className}
    />
  );
};
