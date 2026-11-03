import { CONFIG } from './pricing-config.js';

const DAY_MS = 86400000;

export function parseDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const d = new Date(`${str}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== str) return null;
  return d;
}

export function businessDaysBetween(from, to) {
  let count = 0;
  for (let t = from.getTime() + DAY_MS; t <= to.getTime(); t += DAY_MS) {
    if (!CONFIG.closedWeekdays.includes(new Date(t).getUTCDay())) count++;
  }
  return count;
}
