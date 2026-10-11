import type { Unit } from '@/data/fakeHousehold';
import { t } from '@/i18n';

export function formatQuantity(qty: number, unit: Unit): string {
  return t(`units.${unit}`, { n: qty });
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function isToday(iso: string, now = new Date()): boolean {
  return isSameDay(new Date(iso), now);
}

export function formatRelativeTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);

  if (minutes < 1) return t('time.justNow');
  if (minutes < 60) return t('time.minutesAgo', { n: minutes });
  if (isSameDay(date, now)) return t('time.hoursAgo', { n: Math.floor(minutes / 60) });

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return t('time.yesterday');

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.ceil((startOfToday.getTime() - date.getTime()) / 86_400_000);
  return t('time.daysAgo', { n: days });
}

// "5:12م" — 12-hour clock with the am/pm marker from i18n
export function formatClock(date: Date): string {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes}${t(hours < 12 ? 'time.am' : 'time.pm')}`;
}

// "اليوم 5:12م" / "أمس 6:30م" / "8/10 6:30م"
export function formatTimestamp(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const time = formatClock(date);
  if (isSameDay(date, now)) return t('time.todayAt', { time });

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return t('time.yesterdayAt', { time });

  return t('time.dateAt', { date: `${date.getDate()}/${date.getMonth() + 1}`, time });
}
