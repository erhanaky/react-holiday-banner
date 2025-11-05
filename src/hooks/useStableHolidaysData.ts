// src/hooks/useStableHolidaysData.ts
// Amaç: Kullanıcı her render'da yeni array referansı üretse bile
// içerik eşitse aynı referansı KORU → gereksiz hesapları engelle.

import * as React from "react";
import type { Holiday, HolidayLoose, HolidayInput } from "../types";

// Gevşek+strict birleştirilmiş görünüm
type HolidayLike = Holiday | HolidayLoose;

// Tipler basit olduğu için hafif bir deep-equal yeterli.
// (string/number/boolean, opsiyonel alt nesneler)
function deepEqualHoliday(a: HolidayLike, b: HolidayLike): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  // primitive alanlar
  if (a.id !== b.id) return false;
  if ((a.title ?? "") !== (b.title ?? "")) return false;
  if ((a.active ?? true) !== (b.active ?? true)) return false;
  if ((a.priority ?? 0) !== (b.priority ?? 0)) return false;

  // date
  const ad: any = (a as any).date;
  const bd: any = (b as any).date;
  if (!!ad !== !!bd) return false;
  if (ad && bd) {
    if (ad.type !== bd.type) return false;
    if (ad.month !== bd.month) return false; // Month veya number
    if (ad.day !== bd.day) return false;
  }

  // range
  const ar: any = (a as any).range;
  const br: any = (b as any).range;
  if (!!ar !== !!br) return false;
  if (ar && br) {
    if (ar.start?.month !== br.start?.month) return false;
    if (ar.start?.day !== br.start?.day) return false;
    if (ar.end?.month !== br.end?.month) return false;
    if (ar.end?.day !== br.end?.day) return false;
    if ((ar.inclusive ?? true) !== (br.inclusive ?? true)) return false;
  }

  // multi
  const am = ((a as any).multi ?? []) as Array<{ month: number; day: number }>;
  const bm = ((b as any).multi ?? []) as Array<{ month: number; day: number }>;
  if (am.length !== bm.length) return false;
  for (let i = 0; i < am.length; i++) {
    if (am[i].month !== bm[i].month || am[i].day !== bm[i].day) return false;
  }

  // schedule
  const asch: any = (a as any).schedule;
  const bsch: any = (b as any).schedule;
  if (!!asch !== !!bsch) return false;
  if (asch && bsch) {
    const ay = asch.years ?? [];
    const by = bsch.years ?? [];
    if (ay.length !== by.length) return false;
    for (let i = 0; i < ay.length; i++) if (ay[i] !== by[i]) return false;

    const adw = asch.daysOfWeek ?? [];
    const bdw = bsch.daysOfWeek ?? [];
    if (adw.length !== bdw.length) return false;
    for (let i = 0; i < adw.length; i++) if (adw[i] !== bdw[i]) return false;

    const at = asch.timeWindow;
    const bt = bsch.timeWindow;
    if (!!at !== !!bt) return false;
    if (at && bt) {
      if ((at.start ?? "") !== (bt.start ?? "")) return false;
      if ((at.end ?? "") !== (bt.end ?? "")) return false;
    }
  }

  // display
  const adis: any = (a as any).display;
  const bdis: any = (b as any).display;
  if (!!adis !== !!bdis) return false;
  if (adis && bdis) {
    if ((adis.layout ?? "full") !== (bdis.layout ?? "full")) return false;
    if ((adis.position ?? "static") !== (bdis.position ?? "static"))
      return false;
    if ((adis.placement ?? "top") !== (bdis.placement ?? "top")) return false;
  }

  // content
  const ac: any = (a as any).content;
  const bc: any = (b as any).content;
  if (!!ac !== !!bc) return false;
  if (ac && bc) {
    if ((ac.text ?? "") !== (bc.text ?? "")) return false;
    const ai = ac.image;
    const bi = bc.image;
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
  const as: any = (a as any).style;
  const bs: any = (b as any).style;
  if (!!as !== !!bs) return false;
  if (as && bs) {
    const ks = [
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
    ] as const;
    for (const k of ks) {
      if (as?.[k] !== bs?.[k]) return false;
    }
    // inlineStyle bilinçli olarak karşılaştırılmıyor
  }

  // tags/notes
  const atg = ((a as any).tags ?? []) as string[];
  const btg = ((b as any).tags ?? []) as string[];
  if (atg.length !== btg.length) return false;
  for (let i = 0; i < atg.length; i++) if (atg[i] !== btg[i]) return false;

  if (((a as any).notes ?? "") !== ((b as any).notes ?? "")) return false;

  return true;
}

function deepEqualArray(a: HolidayLike[], b: HolidayLike[]): boolean {
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
export function useStableHolidaysData(
  input: HolidayInput[] | undefined
): HolidayInput[] {
  const ref = React.useRef<HolidayInput[] | undefined>(undefined);

  if (ref.current && input && deepEqualArray(ref.current, input)) {
    return ref.current;
  }
  // içerik farklı → ref'i güncelle ve yeni referansı döndür
  ref.current = input ?? [];
  return ref.current;
}
