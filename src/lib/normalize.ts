// src/lib/normalize.ts
// Dış dünyadan gelen gevşek tipleri (HolidayLoose) güvenli, strict tipe çevirir.
// Hatalı kayıtları eler, geçerli olanları normalize eder.

import type {
  Holiday,
  HolidayLoose,
  HolidayInput,
  Month,
  MonthLoose,
  DateSingle,
  DateSingleLoose,
  DateRange,
  DateRangeLoose,
  DateMultiEntry,
  DateMultiEntryLoose,
} from "../types";

function isValidMonth(m: MonthLoose): m is Month {
  return Number.isInteger(m) && m >= 1 && m <= 12;
}

function isValidDay(d: number): boolean {
  return Number.isInteger(d) && d >= 1 && d <= 31;
}

function normalizeSingle(
  src: DateSingleLoose | undefined
): DateSingle | undefined {
  if (!src) return undefined;
  if (src.type !== "single") return undefined;
  if (!isValidMonth(src.month)) return undefined;
  if (!isValidDay(src.day)) return undefined;
  return { type: "single", month: src.month, day: src.day };
}

function normalizeRange(
  src: DateRangeLoose | undefined
): DateRange | undefined {
  if (!src) return undefined;
  const s = src.start;
  const e = src.end;
  if (!s || !e) return undefined;
  if (!isValidMonth(s.month) || !isValidMonth(e.month)) return undefined;
  if (!isValidDay(s.day) || !isValidDay(e.day)) return undefined;
  return {
    start: { month: s.month, day: s.day },
    end: { month: e.month, day: e.day },
    inclusive: src.inclusive,
  };
}

function normalizeMulti(
  arr: DateMultiEntryLoose[] | undefined
): DateMultiEntry[] | undefined {
  if (!arr || arr.length === 0) return undefined;
  const out: DateMultiEntry[] = [];
  for (const it of arr) {
    if (isValidMonth(it.month) && isValidDay(it.day)) {
      out.push({ month: it.month, day: it.day });
    }
  }
  return out.length > 0 ? out : undefined;
}

function normalizeOne(src: HolidayLoose | Holiday): Holiday | null {
  // Zaten strict ise olduğun gibi geri dönebiliriz (minimum maliyet)
  const maybeStrict = src as Holiday;
  if (
    (maybeStrict.date === undefined || maybeStrict.date.type === "single") &&
    (maybeStrict.range === undefined ||
      (maybeStrict.range.start && maybeStrict.range.end)) &&
    (maybeStrict.multi === undefined || Array.isArray(maybeStrict.multi))
  ) {
    // yine de alanların temel doğruluğunu kontrol et
    const d = normalizeSingle(
      maybeStrict.date as unknown as DateSingleLoose | undefined
    );
    const r = normalizeRange(
      maybeStrict.range as unknown as DateRangeLoose | undefined
    );
    const m = normalizeMulti(
      maybeStrict.multi as unknown as DateMultiEntryLoose[] | undefined
    );

    if (!d && !r && !m) return null; // hiç tarih bilgisi yoksa at
    return {
      ...src,
      date: d,
      range: r,
      multi: m,
    } as Holiday;
  }

  // Loose → Strict
  const loose = src as HolidayLoose;
  const date = normalizeSingle(loose.date);
  const range = normalizeRange(loose.range);
  const multi = normalizeMulti(loose.multi);

  if (!date && !range && !multi) return null;

  const out: Holiday = {
    id: loose.id,
    title: loose.title,
    active: loose.active,
    date,
    range,
    multi,
    schedule: loose.schedule,
    display: loose.display,
    content: loose.content,
    style: loose.style,
    priority: loose.priority,
    tags: loose.tags,
    notes: loose.notes,
  };
  return out;
}

/** Dışa açık: listeyi normalize et + hatalıları ele */
export function normalizeHolidayList(
  input: HolidayInput[] | undefined
): Holiday[] {
  if (!input || input.length === 0) return [];
  const out: Holiday[] = [];
  for (const item of input) {
    const n = normalizeOne(item);
    if (n) out.push(n);
  }
  return out;
}
