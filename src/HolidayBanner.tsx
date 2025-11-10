"use client";

/**
 * HolidayBanner
 * - SSR güvenli: Zaman sadece client'ta (useEffect) set edilir → her zaman tarayıcı saati kullanılır.
 * - TypeScript verisi (holidaysData) “bugün”e göre filtrelenir; çakışmada en yüksek priority gösterilir.
 * - Harici bağımlılık yok; tüm stiller inline/opsiyonel class üzerinden verilir.
 *
 * Preflight Notu (Android/Chrome ilk paint sorunları için):
 * - SSR çıktısında, hydration’dan ÖNCE çalışan minik bir inline <script> ile
 *   bugün eşleşme VARSA (ve display.position === "static") sarmalayıcıya inline
 *   olarak `min-height` yazılır.
 * - Dış sarmalayıcıya `suppressHydrationWarning` eklenmiştir; bu sayede hydration öncesi
 *   inline style farkı uyarı oluşturmaz.
 * - Eşleşme yoksa: min-height = 0 → boşluk yok.
 * - Eşleşme varsa: ilk boyamadan itibaren doğru yükseklik rezerve → CLS=0.
 * - Root (documentElement) yerine sadece .rhb-preflight wrapper değiştirilir.
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
  // ————————————————————————————————————————————————————————
  const preflightJson = React.useMemo(() => {
    try {
      return JSON.stringify(holidaysData ?? []);
    } catch {
      return "[]";
    }
  }, [holidaysData]);

  const preflightScript = `
  (function(){
    try {
      var list = ${preflightJson};
      if(!Array.isArray(list) || list.length===0) return;

      function jsDayToIso(d){ return ((d+6)%7)+1; }
      function cmpMonthDay(a,b){ return a.month!==b.month ? a.month-b.month : a.day-b.day; }
      function parseHm(hm){ var m=/(\\d{1,2}):(\\d{2})/.exec((hm||"").trim()); if(!m) return null; var h=+m[1], mi=+m[2]; if(h<0||h>23||mi<0||mi>59) return null; return h*60+mi; }
      function matchSingle(today,spec){ return today.month===spec.month && today.day===spec.day; }
      function matchMulti(today,multi){ if(!multi||!multi.length) return false; for(var i=0;i<multi.length;i++){ var e=multi[i]; if(today.month===e.month && today.day===e.day) return true; } return false; }
      function matchRange(today,range){
        if(!range) return false; var inc = range.inclusive!==false;
        var s=range.start, e=range.end;
        var startLEEnd = cmpMonthDay(s,e) <= 0;
        if(startLEEnd){
          var L=cmpMonthDay(today,s), R=cmpMonthDay(today,e);
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
          var y=now.getFullYear(); if(sch.years.indexOf(y)===-1) return false;
        }
        if(Array.isArray(sch.daysOfWeek) && sch.daysOfWeek.length>0){
          var iso=jsDayToIso(now.getDay()); if(sch.daysOfWeek.indexOf(iso)===-1) return false;
        }
        if(sch.timeWindow){
          var sMin=parseHm(sch.timeWindow.start), eMin=parseHm(sch.timeWindow.end);
          if(sMin==null||eMin==null) return false;
          var minutesNow=now.getHours()*60+now.getMinutes();
          if(sMin<=eMin){ if(minutesNow<sMin||minutesNow>eMin) return false; }
          else { var inLeft=minutesNow>=sMin, inRight=minutesNow<=eMin; if(!inLeft && !inRight) return false; }
        }
        return true;
      }
      function isActive(hol){ return !!hol && hol.active!==false; }
      function matchesToday(hol,now){
        if(!isActive(hol)) return false;
        var today={month:now.getMonth()+1, day:now.getDate()};
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

      var now=new Date(), matches=[];
      for(var i=0;i<list.length;i++){
        var hol=list[i];
        if(hol && hol.display && hol.display.position && hol.display.position!=="static") continue;
        if(matchesToday(hol, now)) matches.push(hol);
      }
      var winner = resolveWinner(matches);
      if(!winner) return;
      var h = (winner.style && winner.style.height) ? String(winner.style.height) : "48px";

      // Root yerine yalnızca rhb-preflight wrapper'a min-height uygula
      var el = document.querySelector(".rhb-preflight");
      if(el && !el.style.minHeight){ el.style.minHeight = h; }
    } catch(e){}
  })();
  `;

  // ————————————————————————————————————————————————————————
  // 1) Client saati garantisi: sadece useEffect içinde set edilir
  // ————————————————————————————————————————————————————————
  const [clientNow, setClientNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setClientNow(holidaysDateOverride ?? new Date());
  }, [holidaysDateOverride]);

  const refNow: Date | null = holidaysDateOverride ?? clientNow;
  const stableData = useStableHolidaysData(holidaysData);
  const normalized = React.useMemo(
    () => normalizeHolidayList(stableData),
    [stableData]
  );

  const hol: Holiday | null = React.useMemo(() => {
    if (!refNow) return null;
    return pickHolidayForNow(normalized, refNow);
  }, [normalized, refNow ? refNow.getTime() : null]);

  // ————————————————————————————————————————————————————————
  // 2) CSS + Script + Wrapper (hydration safe)
  // ————————————————————————————————————————————————————————
  const preflightStyleTag = (
    <style
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: `.rhb-preflight{min-height:0;width:100%}
[data-holiday-banner]{display:block;width:100%}`,
      }}
    />
  );

  // ————————————————————————————————————————————————————————
  // 3) Render
  // ————————————————————————————————————————————————————————
  if (!refNow || !hol) {
    return (
      <>
        {preflightStyleTag}
        <script dangerouslySetInnerHTML={{ __html: preflightScript }} />
        <div className="rhb-preflight" suppressHydrationWarning />
      </>
    );
  }

  const imgPos = hol.content?.image?.position ?? "left";
  const hasImg = Boolean(hol.content?.image?.src);
  const txt = hol.content?.text ?? hol.title ?? "";
  const outerStyle = buildInlineStyle(hol);
  const rowStyle = buildRowStyle(hol);
  const layout = hol.display?.layout ?? "full";

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

  return (
    <>
      {preflightStyleTag}
      <script dangerouslySetInnerHTML={{ __html: preflightScript }} />
      <div className="rhb-preflight" suppressHydrationWarning>
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
