// Utility for timezone calculations
export const getKrasnoyarskDate = (): Date => {
  // UTC+7
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 7));
};

export const getKrasnoyarskDateString = (): string => {
  return getKrasnoyarskDate().toISOString().split('T')[0];
};

export const getDatesInRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const currDate = new Date(startDate);
  const lastDate = new Date(endDate);
  
  // Guard against invalid dates
  if (isNaN(currDate.getTime()) || isNaN(lastDate.getTime())) return dates;
  // Guard against astronomical ranges (max 365 days)
  if (lastDate.getTime() - currDate.getTime() > 365 * 24 * 60 * 60 * 1000) return dates;

  while (currDate <= lastDate) {
    dates.push(currDate.toISOString().split('T')[0]);
    // Safely increment strictly via UTC to completely avoid Local Timezone DST bugs
    currDate.setUTCDate(currDate.getUTCDate() + 1);
  }
  return dates;
};
