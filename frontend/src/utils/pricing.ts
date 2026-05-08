/**
 * Pricing calculation utility.
 * - Weekdays: 800 ₽/sup
 * - Weekends: 1000 ₽/sup
 * - Prepayment: 50% of the cost of the FIRST day only.
 * - Range is inclusive.
 */

export const isWeekend = (dateStr: string): boolean => {
  // Use a fixed time at noon to avoid timezone issues when checking day of week
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
};

export const getPriceForDay = (dateStr: string): number => {
  return isWeekend(dateStr) ? 1000 : 800;
};

export const calculatePricing = (startDate: string, endDate: string, quantity: number) => {
  if (!startDate || !endDate || quantity <= 0) {
    return { totalPrice: 0, prepayment: 0, explanation: '' };
  }

  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');

  // Safety check, avoid infinite loops if dates are somehow inverted
  if (end < start) {
    return { totalPrice: 0, prepayment: 0, explanation: '' };
  }

  let totalCost = 0;
  let firstDayCost = 0;
  let isFirstDay = true;
  let weekdaysCount = 0;
  let weekendsCount = 0;

  // Iterate day by day, inclusive
  const current = new Date(start);
  while (current <= end) {
    // Format current date back to YYYY-MM-DD
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const currentDateStr = `${yyyy}-${mm}-${dd}`;

    const isWeekEndDay = isWeekend(currentDateStr);
    const dailyCost = (isWeekEndDay ? 1000 : 800) * quantity;
    totalCost += dailyCost;

    if (isWeekEndDay) {
      weekendsCount++;
    } else {
      weekdaysCount++;
    }

    if (isFirstDay) {
      firstDayCost = dailyCost;
      isFirstDay = false;
    }

    current.setDate(current.getDate() + 1);
  }

  const prepayment = Math.round(firstDayCost / 2);

  const supWord = (q: number) => {
    const mod10 = q % 10;
    const mod100 = q % 100;
    if (mod10 === 1 && mod100 !== 11) return `${q} сапборд`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${q} сапборда`;
    return `${q} сапбордов`;
  };

  const dayWord = (d: number) => {
    const mod10 = d % 10;
    const mod100 = d % 100;
    if (mod10 === 1 && mod100 !== 11) return `${d} день`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${d} дня`;
    return `${d} дней`;
  };

  let explanation = '';
  if (weekdaysCount > 0 && weekendsCount === 0) {
    explanation = `${supWord(quantity)} × 800 ₽ × ${dayWord(weekdaysCount)}`;
  } else if (weekendsCount > 0 && weekdaysCount === 0) {
    explanation = `${supWord(quantity)} × 1000 ₽ × ${dayWord(weekendsCount)}`;
  } else {
    explanation = `${supWord(quantity)} × (${weekdaysCount} будн. + ${weekendsCount} вых.)`;
  }

  return {
    totalPrice: totalCost,
    prepayment,
    explanation
  };
};
