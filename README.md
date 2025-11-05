# react-holiday-banner

Lightweight, dependency‑free **React** banner component that automatically shows a holiday/special‑day strip at the **top of the page** based on the **client’s local time**. No server time, no SSR coupling. Configure entirely with TypeScript data (or JSON) and drop a single client component into any React/Next.js app.

> ✅ Always uses **browser time** after hydration.  
> ✅ Works with **React 18+** and Next.js (App/Pages Router), Vite, CRA.  
> ✅ No CSS framework required; **inline styles + optional class hooks**.  
> ✅ **Zero** external runtime dependencies.  
> ✅ Single visible banner at a time (highest **priority** wins).

---

## Install

```bash
npm i react-holiday-banner
# or
yarn add react-holiday-banner
# or
pnpm add react-holiday-banner
```

**Peer dependency:** `react >= 18`

---

## Quick Start (TypeScript)

Create a `holidays.ts` file next to your component:

```ts
// holidays.ts
import type { Holiday } from "react-holiday-banner";

const holidays: Holiday[] = [
  {
    id: "new-year",
    active: true,
    range: {
      start: { month: 12, day: 31 },
      end: { month: 1, day: 1 },
      inclusive: true,
    },
    display: { layout: "full", position: "sticky" },
    content: {
      text: "Happy New Year! 🎉",
      image: {
        src: "/confetti.png",
        alt: "Confetti",
        position: "right",
        maxHeight: "32px",
      },
    },
    style: {
      background: "#eef6ff",
      textColor: "#0b63ce",
      height: "56px",
      paddingX: "24px",
      fontSize: "16px",
      gap: "12px",
      align: "center",
      zIndex: 50,
    },
    priority: 10,
  },
];

export default holidays;
```

Use it in your app header/layout:

```tsx
import { HolidayBanner } from "react-holiday-banner";
import holidaysData from "./holidays";

export default function Header() {
  // Optional: freeze time for testing
  const testTime = new Date("2026-01-01T10:00:00");

  return (
    <HolidayBanner
      holidaysData={holidaysData}
      holidaysDateOverride={
        process.env.NODE_ENV === "development" ? testTime : undefined
      }
    />
  );
}
```

> The banner renders **after hydration** using **client time** (or `holidaysDateOverride` when provided).

---

## Why client time? (SSR/Next.js behaviour)

- On SSR environments (Next.js, Remix), we **do not** render the banner on the server.
- After hydration on the client, the component reads the **browser’s local time** and decides which holiday to show.
- This avoids timezone drift, DST issues, and “server time vs user time” inconsistencies.
- You can still **force** a time in dev/preview via `holidaysDateOverride` for deterministic testing.

---

## Data Model (Types)

```ts
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface DateSingle {
  type: "single";
  month: Month;
  day: number; // 1–31
}

export interface DateRange {
  start: { month: Month; day: number };
  end: { month: Month; day: number };
  inclusive?: boolean; // default: true
}

export interface DateMultiEntry {
  month: Month;
  day: number;
}

export interface DateMulti {
  type: "multi";
  entries: DateMultiEntry[];
}

export interface Schedule {
  years?: number[]; // limit to specific years
  daysOfWeek?: (1 | 2 | 3 | 4 | 5 | 6 | 7)[]; // ISO: Mon=1..Sun=7
  timeWindow?: { start: string; end: string }; // "HH:mm" local time
}

export interface Display {
  placement?: "top"; // reserved for future
  layout?: "full" | "container"; // visual width intent (no CSS required)
  position?: "static" | "sticky" | "fixed";
}

export interface ContentImage {
  src: string;
  alt: string;
  position?: "left" | "right";
  maxHeight?: string; // e.g. "32px"
  width?: string; // e.g. "24px"
}

export interface StyleOptions {
  background?: string;
  textColor?: string;
  linkColor?: string;
  height?: string; // e.g. "56px"
  paddingX?: string; // e.g. "24px"
  fontSize?: string | number;
  fontWeight?: number | string;
  gap?: string; // e.g. "12px"
  border?: string; // e.g. "1px solid #e5e5e5"
  customClass?: string; // applied to inner row
  containerClass?: string; // applied to outer wrapper
  inlineStyle?: React.CSSProperties; // merged last
  align?: "left" | "center" | "right";
  textAlign?: "left" | "center" | "right";
  zIndex?: number;
}

export interface Holiday {
  id: string;
  title?: string;
  active?: boolean; // default: true
  date?: DateSingle;
  range?: DateRange;
  multi?: DateMultiEntry[];
  schedule?: Schedule;
  display?: Display;
  content?: { text?: string; image?: ContentImage };
  style?: StyleOptions;
  priority?: number; // higher wins on collisions (default 0)
  tags?: string[];
  notes?: string;
}

export interface HolidayProps {
  holidaysData: Holiday[];
  holidaysDateOverride?: Date; // test helper
  className?: string; // extra class on outer wrapper
}
```

---

## Matching Rules (How a banner is chosen)

1. The component computes `today = { month, day }` from **client** `Date`.
2. A record **matches** if:
   - `active !== false`, **and**
   - **one** of the date shapes matches:
     - `date` (single day) **or**
     - `range` (may wrap year end; inclusive by default) **or**
     - `multi` (any of listed month/day pairs),
   - **and** the optional `schedule` matches:
     - `years`: include current year
     - `daysOfWeek`: include today’s ISO weekday (Mon=1..Sun=7)
     - `timeWindow`: “HH:mm” in local time; supports windows that cross midnight.
3. If multiple records match, the component picks the one with the **highest `priority`**.  
   Ties are broken by `id` (alphabetically).

---

## Examples

### Single day

```ts
{ id: "republic-day", active: true, date: { type: "single", month: 10, day: 29 } }
```

### Range (wraps over New Year)

```ts
{
  id: "new-year",
  range: { start: { month: 12, day: 31 }, end: { month: 1, day: 1 }, inclusive: true }
}
```

### Multi

```ts
{
  id: "payday",
  multi: [{ month: 1, day: 15 }, { month: 2, day: 15 }, { month: 3, day: 15 }]
}
```

### With schedule (specific weekdays + hours)

```ts
{
  id: "friday-promo",
  date: { type: "single", month: 11, day: 7 },
  schedule: {
    daysOfWeek: [5],                 // Fridays only (Mon=1..Fri=5)
    timeWindow: { start: "09:00", end: "17:30" }
  }
}
```

### Styling & Positioning

```ts
{
  id: "sticky-warning",
  date: { type: "single", month: 6, day: 1 },
  display: { layout: "container", position: "sticky" },
  style: {
    background: "#fff7ed",
    textColor: "#9a3412",
    height: "48px",
    paddingX: "16px",
    align: "left",
    textAlign: "left",
    zIndex: 100,
    border: "1px solid #fed7aa",
    containerClass: "max-w-6xl mx-auto",   // Tailwind users
    customClass: "text-sm md:text-base"
  },
  content: {
    text: "Summer schedule is live. Check updates."
  }
}
```

### Image‑only or text‑only

```ts
{ id: "image-only", date: { type: "single", month: 4, day: 23 }, content: { image: { src: "/flag.png", alt: "Flag" } } }
{ id: "text-only", date: { type: "single", month: 5, day: 19 }, content: { text: "Commemoration of Atatürk, Youth and Sports Day" } }
```

---

## Props

| Prop                   | Type        | Default | Description                                                        |
| ---------------------- | ----------- | ------- | ------------------------------------------------------------------ |
| `holidaysData`         | `Holiday[]` | —       | Records to evaluate for **today**.                                 |
| `holidaysDateOverride` | `Date`      | —       | Forces a specific time (testing). Otherwise uses **browser time**. |
| `className`            | `string`    | —       | Extra class on outer wrapper.                                      |

> Only **one** banner is rendered. If nothing matches, component returns `null`.

---

## Styling Notes

- You **don’t need** Tailwind/CSS frameworks.
- `StyleOptions` covers typical needs (`background`, `textColor`, `height`, `gap`, `paddingX`, `border`, etc.).
- For layout constraints (centered content in a max‑width), pass `style.containerClass` (e.g. Tailwind `max-w-7xl mx-auto`).
- `display.position: "sticky" | "fixed"` controls how the bar attaches to the top; use `zIndex` when necessary.

---

## JSON usage

TypeScript source is recommended. If you prefer JSON:

1. Enable JSON imports in your bundler/tsconfig (`"resolveJsonModule": true`).
2. Provide a type assertion when importing to keep types:

```ts
import type { Holiday } from "react-holiday-banner";
import holidaysJson from "./holidays.json";
const holidaysData = holidaysJson as Holiday[];
```

> If your toolchain doesn’t allow JSON imports, convert the file to `holidays.ts` and `export default [...]`.

---

## Troubleshooting

- **“Rendered more hooks than during the previous render”** — ensure hooks are **not** called conditionally. The component already stabilizes inputs and uses a client‑only clock.
- **Banner not visible on SSR** — expected; it’s rendered **after hydration**. Use `holidaysDateOverride` to test in dev.
- **Multiple matches** — increase `priority` to control which banner wins.
- **Positioning/CSS collisions** — set `display.position = "sticky"` and tune `style.zIndex`. For constrained width, set `style.containerClass`.

---

## Versioning & Publishing

- SemVer (`MAJOR.MINOR.PATCH`).
- Public API: `HolidayBanner` + exported types in `index.d.ts`.
- No runtime deps; if we add one in the future, it will be declared properly.

---

## Contributing

PRs welcome. Please run local build & typecheck:

```bash
npm run build
```

---

## License

MIT © 2025 Erhan Akkaya
