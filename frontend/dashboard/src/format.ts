// Dates and numbers for the tables, in Arabic (Egypt) with Latin digits like the app
const dateFormat = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' });
const dayFormat = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'numeric' });

export const formatDate = (iso: string | null) => (iso ? dateFormat.format(new Date(iso)) : '');
export const formatDay = (isoDay: string) => dayFormat.format(new Date(isoDay));
export const formatNumber = (n: number) => new Intl.NumberFormat('en-US').format(n);

const DAY = 24 * 60 * 60 * 1000;
export const isWithinDays = (iso: string | null, days: number) => !!iso && Date.now() - new Date(iso).getTime() < days * DAY;

// Looks like an email address (spaces and capitals don't matter)
export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
