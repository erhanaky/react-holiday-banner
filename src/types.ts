// packages/react-holiday-banner/src/types.ts
import type * as React from "react";

/** 1–12 arası ay değerleri */
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** Tek gün tanımı */
export interface DateSingle {
  type: "single";
  month: Month;
  day: number; // 1–31
}

/** Ay-gün aralığı (yıl bağımsız) */
export interface DateRange {
  start: { month: Month; day: number };
  end: { month: Month; day: number };
  /** Varsayılan: true (başlangıç/bitiş dahil) */
  inclusive?: boolean;
}

/** Çoklu tek gün listesi için giriş */
export interface DateMultiEntry {
  month: Month;
  day: number;
}

/** (İleride gerekirse) “multi” şeması */
export interface DateMulti {
  type: "multi";
  entries: DateMultiEntry[];
}

/** Yıl / hafta günü / saat penceresi filtresi */
export interface Schedule {
  /** Boş/undefined ise tüm yıllar geçerlidir */
  years?: number[];
  /** ISO: Pzt=1 .. Paz=7 */
  daysOfWeek?: (1 | 2 | 3 | 4 | 5 | 6 | 7)[];
  /** "HH:mm" formatı; yerel saate göre kontrol edilir */
  timeWindow?: { start: string; end: string };
}

/** Görünüm yerleşimi (genişlik/konum) */
export interface Display {
  /** Şimdilik sabit: top */
  placement?: "top";
  /** Genişlik davranışı */
  layout?: "full" | "container";
  /** Konumlandırma */
  position?: "static" | "sticky" | "fixed";
}

/** Banner içi görsel tanımı */
export interface ContentImage {
  src: string;
  alt: string;
  /** Görselin tarafı */
  position?: "left" | "right";
  /** Boyut opsiyonları */
  maxHeight?: string; // örn: "40px"
  width?: string; // örn: "24px"
}

/** Stil/ sınıf opsiyonları */
export interface StyleOptions {
  background?: string;
  textColor?: string;
  /** Tıklanabilir öğe yok; tematik tutarlılık için bırakıldı */
  linkColor?: string;

  height?: string; // örn: "48px"
  paddingX?: string; // örn: "16px"
  fontSize?: string | number;
  fontWeight?: number | string;
  gap?: string; // örn: "8px"
  border?: string; // örn: "1px solid #e5e5e5"

  /** Kullanıcı framework sınıfları */
  customClass?: string; // içerik satırına eklenir
  containerClass?: string; // dış sarıcıya eklenir

  /** Serbest inline stil birleşimi */
  inlineStyle?: React.CSSProperties;

  /** İçerik hizası */
  align?: "left" | "center" | "right";
  /** Metin hizası */
  textAlign?: "left" | "center" | "right";

  /** Katmanlama kontrolü */
  zIndex?: number;
}

/** Tek bir özel gün / kayıt */
export interface Holiday {
  id: string;
  title?: string;
  /** Varsayılan: true */
  active?: boolean;

  /** Üçünden yalnızca biri dolu olmalı */
  date?: DateSingle;
  range?: DateRange;
  /** Pratikte dizi olarak destekliyoruz */
  multi?: DateMultiEntry[];

  schedule?: Schedule;
  display?: Display;

  content?: {
    text?: string;
    image?: ContentImage;
  };

  style?: StyleOptions;

  /** Çakışmada en yüksek kazanır; varsayılan 0 */
  priority?: number;

  tags?: string[];
  notes?: string;
}

/* ------------------------------------------------------------------ */
/*  GEVŞEK GİRİŞ TİPLERİ (runtime'da normalize edilecek)              */
/*  Amaç: import type { Holiday } ile de çalışsın; JSON/REST de tolere */
/* ------------------------------------------------------------------ */

/** MonthLoose: dış dünyadan gelen sayıları tolere et (örn: 1..12) */
export type MonthLoose = number;

/** Tek gün (loose) */
export interface DateSingleLoose {
  type: "single";
  month: MonthLoose;
  day: number; // 1–31 hedeflenir, normalize kontrolü yapacağız
}

/** Aralık (loose) */
export interface DateRangeLoose {
  start: { month: MonthLoose; day: number };
  end: { month: MonthLoose; day: number };
  inclusive?: boolean;
}

/** Multi giriş (loose) */
export interface DateMultiEntryLoose {
  month: MonthLoose;
  day: number;
}

/** HolidayLoose: dış dünyadan gelen gevşek tip (REST/JSON) */
export interface HolidayLoose {
  id: string;
  title?: string;
  active?: boolean;

  date?: DateSingleLoose;
  range?: DateRangeLoose;
  multi?: DateMultiEntryLoose[];

  schedule?: Schedule;
  display?: Display;

  content?: {
    text?: string;
    image?: ContentImage;
  };

  style?: StyleOptions;
  priority?: number;

  tags?: string[];
  notes?: string;
}

/** Bileşenin kabul ettiği giriş: strict veya loose */
export type HolidayInput = Holiday | HolidayLoose;

/** Bileşen props (holiday standardı) */
export interface HolidayProps {
  /** Banner seçiminde kullanılacak kayıtlar */
  holidaysData: HolidayInput[];

  /** Test için tarih enjeksiyonu (verilmezse tarayıcı saati kullanılır) */
  holidaysDateOverride?: Date;

  /** Dış sarıcıya ekstra class */
  className?: string;
}
