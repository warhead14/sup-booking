/**
 * Normalizes a phone number to a canonical format: 7XXXXXXXXXX (11 digits, no + prefix).
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return '';

  if (digits.length === 10 && digits.startsWith('9')) {
    return '7' + digits;
  }
  if (digits.length === 11 && digits.startsWith('8')) {
    return '7' + digits.slice(1);
  }
  if (digits.length === 11 && digits.startsWith('7')) {
    return digits;
  }
  return digits;
}
