// Dates are always formatted in the site's time zone so the server (UTC on Railway)
// and the browser render identical text (avoids React hydration mismatches).
const safeTz = (tz?: string) => { try { if (tz) { new Intl.DateTimeFormat('en', { timeZone: tz }); return tz; } } catch { /* invalid */ } return 'UTC'; };

export const fmtSize = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b > 0 ? `${Math.max(1, Math.round(b / 1e3))} KB` : '—');
export const fmtDate = (iso: string, tz?: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: safeTz(tz) });
export const fmtDay = (iso: string, tz?: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: safeTz(tz) });
export const fmtDateTime = (iso: string, tz?: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: safeTz(tz) });
export const hourIn = (tz?: string) => Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: safeTz(tz) }).format(new Date()));
