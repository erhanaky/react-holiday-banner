// src/lib/match.ts
// Tarih/saat kurallarına göre "şu an" gösterilecek banner kaydını seçme yardımcıları.

import type { Holiday, DateRange, DateSingle, DateMultiEntry } from "../types";

/** JS getDay(): 0=Sun..6=Sat -> istediğimiz: 1=Mon..7=Sun */
function jsDayToIso(d: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  return (((d + 6) % 7) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

/** "HH:mm" -> toplam dakika (geçersizse null) */
function parseHmToMinutes(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (isNaN(h) || isNaN(min) || h < 0 || h > 23 || min < 0 || min > 59)
    return null;
  return h * 60 + min;
}

/** (month,day) ikilisi ile leksikografik karşılaştırma */
function cmpMonthDay(
  a: { month: number; day: number },
  b: { month: number; day: number }
): number {
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

/** Tek gün eşleşmesi */
function matchSingle(
  today: { month: number; day: number },
  spec: DateSingle
): boolean {
  return today.month === spec.month && today.day === spec.day;
}

/** Çoklu günlerden herhangi biriyle eşleşme */
function matchMulti(
  today: { month: number; day: number },
  multi: DateMultiEntry[] | undefined
): boolean {
  if (!multi || multi.length === 0) return false;
  return multi.some((e) => today.month === e.month && today.day === e.day);
}

/** Ay sonunu aşabilen aralık eşleşmesi (örn: 31/12 -> 01/01) */
function matchRange(
  today: { month: number; day: number },
  range: DateRange | undefined
): boolean {
  if (!range) return false;
  const inc = range.inclusive !== false; // default true
  const s = range.start;
  const e = range.end;

  const startLEEnd = cmpMonthDay(s, e) <= 0;
  if (startLEEnd) {
    // aynı yıl içinde normal aralık
    const left = cmpMonthDay(today, s);
    const right = cmpMonthDay(today, e);
    if (inc) return left >= 0 && right <= 0;
    return left > 0 && right < 0;
  } else {
    // yıl sonunu aşıyor (örn 12/31 -> 1/01)
    const leftPart = cmpMonthDay(today, s) >= (inc ? 0 : 1);
    const rightPart = cmpMonthDay(today, e) <= (inc ? 0 : -1);
    return leftPart || rightPart;
  }
}

/** Yıl/hafta günü/saat penceresi kuralları */
function matchSchedule(now: Date, schedule?: Holiday["schedule"]): boolean {
  if (!schedule) return true;

  // years
  if (schedule.years && schedule.years.length > 0) {
    const y = now.getFullYear();
    if (!schedule.years.includes(y)) return false;
  }

  // daysOfWeek (1..7)
  if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
    const iso = jsDayToIso(now.getDay());
    if (!schedule.daysOfWeek.includes(iso)) return false;
  }

  // timeWindow "HH:mm"
  if (schedule.timeWindow) {
    const { start, end } = schedule.timeWindow;
    const sMin = parseHmToMinutes(start);
    const eMin = parseHmToMinutes(end);
    if (sMin == null || eMin == null) return false; // hatalı saat => eşleşme yok

    const minutesNow = now.getHours() * 60 + now.getMinutes();

    if (sMin <= eMin) {
      if (minutesNow < sMin || minutesNow > eMin) return false;
    } else {
      // geceyarısı devrilen pencere (örn 22:00 - 02:00)
      const inLeft = minutesNow >= sMin;
      const inRight = minutesNow <= eMin;
      if (!inLeft && !inRight) return false;
    }
  }

  return true;
}

/** Kayıt aktif mi? */
function isActive(hol: Holiday | null | undefined): hol is Holiday {
  return !!hol && hol.active !== false;
}

/** Bugün için tarih/saat kurallarına uyan kayıt mı? */
function matchesToday(hol: Holiday, now: Date): boolean {
  if (!isActive(hol)) return false;

  const today = { month: now.getMonth() + 1, day: now.getDate() };

  let dateOk = false;

  if (hol.date && hol.date.type === "single") {
    dateOk = matchSingle(today, hol.date);
  } else if (hol.range) {
    dateOk = matchRange(today, hol.range);
  } else if (hol.multi && hol.multi.length > 0) {
    dateOk = matchMulti(today, hol.multi);
  } else {
    // Tarih tanımı yoksa bu kaydı at
    dateOk = false;
  }

  if (!dateOk) return false;
  return matchSchedule(now, hol.schedule);
}

/** Eşleşenler arasından priority en yükseği seçilir. Eşitse id alfabetik */
function resolveWinner(matches: Holiday[]): Holiday | null {
  if (matches.length === 0) return null;
  const sorted = [...matches].sort((a, b) => {
    const pa = a.priority ?? 0;
    const pb = b.priority ?? 0;
    if (pb !== pa) return pb - pa;
    const ia = a.id.toLowerCase();
    const ib = b.id.toLowerCase();
    return ia < ib ? -1 : ia > ib ? 1 : 0;
  });
  return sorted[0] ?? null;
}

/** Dışa açık: Şu anki tarihe göre gösterilecek kaydı seçer */
export function pickHolidayForNow(list: Holiday[], now: Date): Holiday | null {
  if (!Array.isArray(list) || list.length === 0) return null;
  const matches = list.filter((o) => matchesToday(o, now));
  return resolveWinner(matches);
}
