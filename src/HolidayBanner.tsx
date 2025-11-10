"use client";

/**
 * HolidayBanner
 * - SSR güvenli: Zaman sadece client'ta (useEffect) set edilir → her zaman tarayıcı saati kullanılır.
 * - TypeScript verisi (holidaysData) “bugün”e göre filtrelenir; çakışmada en yüksek priority gösterilir.
 * - Harici bağımlılık yok; tüm stiller inline/opsiyonel class üzerinden verilir.
 *
 * Preflight Notu (Android/Chrome ilk paint sorunları için):
 * - SSR çıktısında, hydration’dan ÖNCE çalışan minik bir inline <script> ile
 *   bugün eşleşme VARSA (ve display.position === "static") kök’e CSS değişkeni
 *   olarak `--rhb-h` (yükseklik) yazılır.
 * - Dış sarmalayıcıya `minHeight: var(--rhb-h, 0)` verilir. Böylece:
 *    - Eşleşme yoksa: min-height = 0 → hiç boşluk yok.
 *    - Eşleşme varsa: ilk boyamadan itibaren doğru yükseklik rezerve → CLS=0.
 * - Hydration sonrası banner normal şekilde render edilir; min-height rezervasyonu
 *   ekstra boşluk yaratmaz (min-height sadece “en az” yüksekliği garanti eder).
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
import { normalizeHolidayList } from "./lib/normalize";

export function HolidayBanner(props: HolidayProps) {
  const { holidaysData, holidaysDateOverride, className } = props;

  // ————————————————————————————————————————————————————————
  // 0) PRE-FLIGHT: SSR çıktısına "min-height rezervasyonu" yerleştir
  //    - Only static: fixed/sticky için rezervasyon gerekmiyor
  //    - JSON'u inline script içinde kullanırız; küçük bir eşleşme rutiniyle gün/multi/range/schedule kontrolü yapılır
  // ————————————————————————————————————————————————————————
  // Not: holidaysData sabit veri olduğu varsayılır; inline JSON güvenli kullanım (uygulama kontrolünde)
  const preflightJson = React.useMemo(() => {
    try {
      return JSON.stringify(holidaysData ?? []);
    } catch {
      return "[]";
    }
  }, [holidaysData]);

  // İlk HTML parse edilirken çalışacak: bugün eşleşme varsa ve position === "static" ise
  // root'a `--rhb-h: <height>` yazar. Height kaynağı: hol.style.height veya fallback "48px".
  // Range wrap, multi ve schedule saat aralığı desteği basitleştirilmeden korunur.
  const preflightScript = `
  (function(){
    try {
      var list = ${preflightJson};
      if(!Array.isArray(list) || list.length===0) return;

      // Yardımcılar
      function jsDayToIso(d){ return ((d+6)%7)+1; } // 0..6 -> 1..7
      function cmpMonthDay(a,b){ return a.month!==b.month ? a.month-b.month : a.day-b.day; }
      function parseHm(hm){ var m=/^(\\d{1,2}):(\\d{2})$/.exec((hm||"").trim()); if(!m) return null; var h=+m[1], mi=+m[2]; if(h<0||h>23||mi<0||mi>59) return null; return h*60+mi; }

      function matchSingle(today,spec){ return today.month===spec.month && today.day===spec.day; }
      function matchMulti(today,multi){ if(!multi||!multi.length) return false; for(var i=0;i<multi.length;i++){ var e=multi[i]; if(today.month===e.month && today.day===e.day) return true; } return false; }
      function matchRange(today,range){
        if(!range) return false;
        var inc = range.inclusive!==false;
        var s = range.start, e = range.end;
        var startLEEnd = cmpMonthDay(s,e) <= 0;
        if(startLEEnd){
          var L = cmpMonthDay(today,s), R = cmpMonthDay(today,e);
          return inc ? (L>=0 && R<=0) : (L>0 && R<0);
        } else {
          var leftPart = cmpMonthDay(today,s) >= (inc?0:1);
          var rightPart = cmpMonthDay(today,e) <= (inc?0:-1);
          return leftPart || rightPart;
        }
      }
      function matchSchedule(now,sch){
        if(!sch) return true;
        if(Array.isArray(sch.years) && sch.years.length>0){
          var y = now.getFullYear(); if(sch.years.indexOf(y)===-1) return false;
        }
        if(Array.isArray(sch.daysOfWeek) && sch.daysOfWeek.length>0){
          var iso = jsDayToIso(now.getDay()); if(sch.daysOfWeek.indexOf(iso)===-1) return false;
        }
        if(sch.timeWindow){
          var sMin = parseHm(sch.timeWindow.start), eMin = parseHm(sch.timeWindow.end);
          if(sMin==null || eMin==null) return false;
          var minutesNow = now.getHours()*60 + now.getMinutes();
          if(sMin<=eMin){ if(minutesNow<sMin || minutesNow>eMin) return false; }
          else { var inLeft = minutesNow>=sMin, inRight = minutesNow<=eMin; if(!inLeft && !inRight) return false; }
        }
        return true;
      }
      function isActive(hol){ return !!hol && hol.active!==false; }
      function matchesToday(hol,now){
        if(!isActive(hol)) return false;
        var today = { month: now.getMonth()+1, day: now.getDate() };
        var ok=false;
        if(hol.date && hol.date.type==="single") ok = matchSingle(today, hol.date);
        else if(hol.range) ok = matchRange(today, hol.range);
        else if(hol.multi && hol.multi.length>0) ok = matchMulti(today, hol.multi);
        else ok=false;
        if(!ok) return false;
        return matchSchedule(now, hol.schedule);
      }
      function resolveWinner(matches){
        if(!matches.length) return null;
        matches.sort(function(a,b){
          var pa=(a.priority||0), pb=(b.priority||0);
          if(pb!==pa) return pb-pa;
          var ia=(a.id||"").toLowerCase(), ib=(b.id||"").toLowerCase();
          if(ia<ib) return -1; if(ia>ib) return 1; return 0;
        });
        return matches[0]||null;
      }

      var now = new Date();
      var matches = [];
      for(var i=0;i<list.length;i++){
        var hol = list[i];
        if(hol && hol.display && hol.display.position && hol.display.position!=="static") continue; // sadece static için rezervasyon
        if(matchesToday(hol, now)) matches.push(hol);
      }
      var winner = resolveWinner(matches);
      if(!winner) return;

      var h = (winner.style && winner.style.height) ? String(winner.style.height) : "48px";
      // Kök değişkenini set et (ilk paint öncesi min-height uygulanır)
      try { document.documentElement.style.setProperty("--rhb-h", h); } catch(e){}
    } catch(e){ /* sessizce geç */ }
  })();
  `;

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

  // ✅ Gevşek tipleri strict tipe çek (runtime normalize)
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

  // ————————————————————————————————————————————————————————
  // 3) Render
  //    - Preflight: <style> + <script> sadece SSR/ilk yüklemede etkili olacaktır.
  //    - minHeight rezervasyonu: dış sarıcıda `minHeight: var(--rhb-h, 0)`.
  //    - Zaman hazır değilse veya eşleşme yoksa içeriği çizme (null),
  //      ancak min-height rezervasyonu zaten “0” olduğu için boşluk bırakmaz.
  // ————————————————————————————————————————————————————————

  // Preflight CSS: min-height rezervasyonu için basit sınıf
  const preflightStyleTag = (
    <style
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: `.rhb-preflight{min-height:var(--rhb-h,0);width:100%;}
[data-holiday-banner]{display:block;width:100%;}`,
      }}
    />
  );

  const preflightScriptTag = (
    <script
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: preflightScript }}
    />
  );

  // Zaman hazır değilse veya eşleşme yoksa sadece “preflight” + boş dış sarıcı
  if (!refNow || !hol) {
    return (
      <>
        {preflightStyleTag}
        {preflightScriptTag}
        <div className="rhb-preflight {outerClassNamePlaceholder}" />
      </>
    );
  }

  // ————————————————————————————————————————————————————————
  // 4) İçerik/işaretlemeler
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
    <>
      {preflightStyleTag}
      {preflightScriptTag}

      {/* Dış sarıcı: minHeight rezervasyonu (CLS=0) */}
      <div className="rhb-preflight">
        <div
          className={outerClassName(hol, className)}
          style={outerStyle}
          data-holiday-layout={layout}
          data-holiday-banner
        >
          {inner}
        </div>
      </div>
    </>
  );
}
