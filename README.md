# react-holiday-banner

Hafif, bağımlılıksız **React** banner bileşeni. Özel günler/haftalar için JSON verisiyle yönetilir. **Client saati** baz alınır, SSR ortamında bile tarayıcı zamanı kullanır.

## Kurulum

```bash
npm i react-holiday-banner
```

## Kullanım

```tsx
import { HolidayBanner } from "react-holiday-banner";
import holidaysData from "./holidays"; // TS dosyası

export default function Header() {
  // Test için sabit saat (opsiyonel)
  const testTime = new Date("2026-01-01T10:00:00");

  return (
    <HolidayBanner
      holidaysData={holidaysData}
      holidaysDateOverride={testTime} // kaldırırsan cihaz saati kullanılır
    />
  );
}
```

## Data Şeması (özet)

- **Tarih:** `date: { type: "single", month, day }` | `range: { start: {month,day}, end: {month,day}, inclusive? }` | `multi: [{month,day}, ...]`
- **Schedule:** `years?: number[]`, `daysOfWeek?: (1..7)[]`, `timeWindow?: { start: "HH:mm", end: "HH:mm" }`
- **Display:** `layout?: "full" | "container"`, `position?: "static" | "sticky" | "fixed"`
- **Content:** `text?: string`, `image?: { src, alt, position?: "left"|"right", maxHeight?, width? }`
- **Style:** `background?`, `textColor?`, `height?`, `paddingX?`, `fontSize?`, `fontWeight?`, `gap?`, `border?`, `align?`, `textAlign?`, `zIndex?`, `customClass?`, `containerClass?`, `inlineStyle?`
- **priority:** sayısal; çakışmada **yüksek** olan kazanır.

> `content.text` ve `content.image` **opsiyonel**dir. Sadece yazı, sadece görsel veya ikisi birden kullanılabilir.

## Notlar

- SSR’de ilk karede render edilmez; hydrate sonrası **tarayıcı saatine göre** görünür.
- Harici bağımlılık yok; **React >= 18** peer dependency’dir.
