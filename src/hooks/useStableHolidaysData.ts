// src/hooks/useStableHolidaysData.ts
// Amaç: Kullanıcı her render'da yeni array referansı üretse bile
// içerik eşitse aynı referansı KORU → gereksiz hesapları engelle.

import * as React from "react";
import type { Holiday } from "../types";

// Tipler basit olduğu için hafif bir deep-equal yeterli.
// (string/number/boolean, opsiyonel alt nesneler)
function deepEqualHoliday(a: Holiday, b: Holiday): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  // primitive alanlar
  if (a.id !== b.id) return false;
  if ((a.title ?? "") !== (b.title ?? "")) return false;
  if ((a.active ?? true) !== (b.active ?? true)) return false;
  if ((a.priority ?? 0) !== (b.priority ?? 0)) return false;

  // date
  if (!!a.date !== !!b.date) return false;
  if (a.date && b.date) {
    if (a.date.type !== b.date.type) return false;
    if (a.date.month !== b.date.month) return false;
    if (a.date.day !== b.date.day) return false;
  }

  // range
  if (!!a.range !== !!b.range) return false;
  if (a.range && b.range) {
    if (a.range.start.month !== b.range.start.month) return false;
    if (a.range.start.day !== b.range.start.day) return false;
    if (a.range.end.month !== b.range.end.month) return false;
    if (a.range.end.day !== b.range.end.day) return false;
    if ((a.range.inclusive ?? true) !== (b.range.inclusive ?? true))
      return false;
  }

  // multi
  const am = a.multi ?? [];
  const bm = b.multi ?? [];
  if (am.length !== bm.length) return false;
  for (let i = 0; i < am.length; i++) {
    if (am[i].month !== bm[i].month || am[i].day !== bm[i].day) return false;
  }

  // schedule
  if (!!a.schedule !== !!b.schedule) return false;
  if (a.schedule && b.schedule) {
    const ay = a.schedule.years ?? [];
    const by = b.schedule.years ?? [];
    if (ay.length !== by.length) return false;
    for (let i = 0; i < ay.length; i++) if (ay[i] !== by[i]) return false;

    const ad = a.schedule.daysOfWeek ?? [];
    const bd = b.schedule.daysOfWeek ?? [];
    if (ad.length !== bd.length) return false;
    for (let i = 0; i < ad.length; i++) if (ad[i] !== bd[i]) return false;

    const at = a.schedule.timeWindow;
    const bt = b.schedule.timeWindow;
    if (!!at !== !!bt) return false;
    if (at && bt) {
      if ((at.start ?? "") !== (bt.start ?? "")) return false;
      if ((at.end ?? "") !== (bt.end ?? "")) return false;
    }
  }

  // display
  if (!!a.display !== !!b.display) return false;
  if (a.display && b.display) {
    if ((a.display.layout ?? "full") !== (b.display.layout ?? "full"))
      return false;
    if ((a.display.position ?? "static") !== (b.display.position ?? "static"))
      return false;
    if ((a.display.placement ?? "top") !== (b.display.placement ?? "top"))
      return false;
  }

  // content
  if (!!a.content !== !!b.content) return false;
  if (a.content && b.content) {
    if ((a.content.text ?? "") !== (b.content.text ?? "")) return false;
    const ai = a.content.image;
    const bi = b.content.image;
    if (!!ai !== !!bi) return false;
    if (ai && bi) {
      if ((ai.src ?? "") !== (bi.src ?? "")) return false;
      if ((ai.alt ?? "") !== (bi.alt ?? "")) return false;
      if ((ai.position ?? "left") !== (bi.position ?? "left")) return false;
      if ((ai.maxHeight ?? "") !== (bi.maxHeight ?? "")) return false;
      if ((ai.width ?? "") !== (bi.width ?? "")) return false;
    }
  }

  // style
  if (!!a.style !== !!b.style) return false;
  if (a.style && b.style) {
    const ks: (keyof NonNullable<Holiday["style"]>)[] = [
      "background",
      "textColor",
      "linkColor",
      "height",
      "paddingX",
      "fontSize",
      "fontWeight",
      "gap",
      "border",
      "customClass",
      "containerClass",
      "align",
      "textAlign",
      "zIndex",
    ];
    for (const k of ks) {
      if ((a.style as any)?.[k] !== (b.style as any)?.[k]) return false;
    }
    // inlineStyle bilinçli olarak karşılaştırılmıyor: inline objeler kullanıcıda değişebilir.
  }

  // tags/notes (renderi etkilemiyor ama içerik değişikliğine işaret)
  const atg = a.tags ?? [];
  const btg = b.tags ?? [];
  if (atg.length !== btg.length) return false;
  for (let i = 0; i < atg.length; i++) if (atg[i] !== btg[i]) return false;

  if ((a.notes ?? "") !== (b.notes ?? "")) return false;

  return true;
}

function deepEqualArray(a: Holiday[], b: Holiday[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!deepEqualHoliday(a[i], b[i])) return false;
  }
  return true;
}

/**
 * useStableHolidaysData:
 * - Aynı içerik geldikçe aynı REFERANSI döndürür (deep-equal).
 * - Kullanıcı literal array üretse bile gereksiz hesapları engeller.
 */
export function useStableHolidaysData(input: Holiday[] | undefined): Holiday[] {
  const ref = React.useRef<Holiday[] | undefined>(undefined);

  if (ref.current && input && deepEqualArray(ref.current, input)) {
    return ref.current;
  }
  // içerik farklı → ref'i güncelle ve yeni referansı döndür
  ref.current = input ?? [];
  return ref.current;
}
