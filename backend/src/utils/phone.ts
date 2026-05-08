/**
 * Normalizes a phone number to a canonical format: 7XXXXXXXXXX (11 digits, no + prefix).
 * The following inputs all produce the same result:
 *   +7 (999) 123-45-67  →  79991234567
 *   89991234567          →  79991234567
 *   79991234567          →  79991234567
 *   9991234567           →  79991234567
 */
export function normalizePhone(phone: string): string {
  // Strip everything except digits
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 0) return '';

  // 10 digits starting with 9 → prepend 7
  if (digits.length === 10 && digits.startsWith('9')) {
    return '7' + digits;
  }

  // 11 digits starting with 8 → replace leading 8 with 7
  if (digits.length === 11 && digits.startsWith('8')) {
    return '7' + digits.slice(1);
  }

  // 11 digits starting with 7 → already correct
  if (digits.length === 11 && digits.startsWith('7')) {
    return digits;
  }

  // Fallback: return raw digits (handles unusual formats)
  return digits;
}
