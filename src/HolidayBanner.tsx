"use client";

/**
 * HolidayBanner
 * - SSR güvenli: Zaman sadece client'ta (useEffect) set edilir → her zaman tarayıcı saati kullanılır.
 * - TypeScript verisi (holidaysData) “bugün”e göre filtrelenir; çakışmada en yüksek priority gösterilir.
 * - Harici bağımlılık yok; tüm stiller inline/opsiyonel class üzerinden verilir.
 */

import * as React from "react";
import type { HolidayProps, Holiday } from "./types";
import { pickHolidayForNow } from "./lib/match";
import {
  buildInlineStyle,
  buildRowStyle,
  imageStyle,
  outerClassName,
  innerClassName,
  textBlockStyle,
} from "./lib/style";
import { useStableHolidaysData } from "./hooks/useStableHolidaysData";
import { normalizeHolidayList } from "./lib/normalize"; // ✅ EKLENDİ

export function HolidayBanner(props: HolidayProps) {
  const { holidaysData, holidaysDateOverride, className } = props;

  // ————————————————————————————————————————————————————————
  // 1) Client saati garantisi: sadece useEffect içinde set edilir
  // ————————————————————————————————————————————————————————
  const [clientNow, setClientNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setClientNow(holidaysDateOverride ?? new Date());
  }, [holidaysDateOverride]);

  // Effect set edene kadar refNow yok → render etmeyiz (SSR'da da boş)
  const refNow: Date | null = holidaysDateOverride ?? clientNow;

  // ✅ Kullanıcı her render'da yeni array üretse bile içerik değişmediyse referansı sabitle
  const stableData = useStableHolidaysData(holidaysData);

  // ✅ Gevşek tipleri strict tipe çek (runtime normalize) — mevcut iş mantığına dokunmadan
  const normalized = React.useMemo(
    () => normalizeHolidayList(stableData),
    [stableData]
  );

  // ————————————————————————————————————————————————————————
  // 2) Bugüne uyan kaydı seç (hook sırası bozulmasın diye koşulsuz useMemo)
  //    refNow dependency'sini timestamp ile stabilize ediyoruz
  // ————————————————————————————————————————————————————————
  const hol: Holiday | null = React.useMemo(() => {
    if (!refNow) return null;
    return pickHolidayForNow(normalized, refNow);
  }, [normalized, refNow ? refNow.getTime() : null]);

  // Zaman hazır değilse veya eşleşme yoksa render etme
  if (!refNow || !hol) return null;

  // ————————————————————————————————————————————————————————
  // 3) İçerik/işaretlemeler
  // ————————————————————————————————————————————————————————
  const imgPos = hol.content?.image?.position ?? "left";
  const hasImg = Boolean(hol.content?.image?.src);
  const txt = hol.content?.text ?? hol.title ?? "";

  const outerStyle = buildInlineStyle(hol);
  const rowStyle = buildRowStyle(hol);

  const inner = (
    <div
      className={innerClassName(hol)}
      style={rowStyle}
      role="status"
      aria-live="polite"
      data-holiday-id={hol.id}
    >
      {imgPos === "left" && hasImg ? (
        <img
          src={hol.content!.image!.src}
          alt={hol.content!.image!.alt}
          style={imageStyle(hol)}
          draggable={false}
        />
      ) : null}

      {txt ? <span style={textBlockStyle(hol)}>{txt}</span> : null}

      {imgPos === "right" && hasImg ? (
        <img
          src={hol.content!.image!.src}
          alt={hol.content!.image!.alt}
          style={imageStyle(hol)}
          draggable={false}
        />
      ) : null}
    </div>
  );

  const layout = hol.display?.layout ?? "full";
  return (
    <div
      className={outerClassName(hol, className)}
      style={outerStyle}
      data-holiday-layout={layout}
      data-holiday-banner
    >
      {inner}
    </div>
  );
}
