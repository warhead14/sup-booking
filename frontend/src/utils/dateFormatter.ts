const MONTHS = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];

export const formatDateUI = (dateString: string): string => {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  
  const day = parseInt(parts[2], 10);
  const monthIndex = parseInt(parts[1], 10) - 1;
  const month = MONTHS[monthIndex];
  return `${day} ${month}`;
};

export const formatRangeUI = (startStr: string, endStr: string): string => {
  if (!startStr || !endStr) return startStr || endStr || '';
  if (startStr === endStr) {
    return formatDateUI(startStr);
  }
  
  const p1 = startStr.split('-');
  const p2 = endStr.split('-');
  if (p1.length !== 3 || p2.length !== 3) return `${startStr} — ${endStr}`;

  const day1 = parseInt(p1[2], 10);
  const month1 = MONTHS[parseInt(p1[1], 10) - 1];
  const day2 = parseInt(p2[2], 10);
  const month2 = MONTHS[parseInt(p2[1], 10) - 1];
  const year2 = p2[0];

  if (month1 === month2) {
    return `${day1} — ${day2} ${month1} ${year2}`;
  }
  return `${day1} ${month1} — ${day2} ${month2} ${year2}`;
};
