// src/lib/style.ts
// Banner’ın dış sarmalayıcı, içerik satırı, görsel ve metin stilini üretir.

import type { Holiday } from "../types";
import * as React from "react";

/** Dış sarıcı (layout + arka plan + konum) stilleri */
export function buildInlineStyle(o: Holiday): React.CSSProperties {
  const s = o.style ?? {};
  const pos = o.display?.position ?? "static";

  const base: React.CSSProperties = {
    width: "100%",
    display: "block",
    background: s.background,
    color: s.textColor,
    border: s.border,
    zIndex: s.zIndex,
    position: pos as React.CSSProperties["position"],
  };

  if (pos === "sticky") {
    (base as any).top = 0;
  } else if (pos === "fixed") {
    (base as any).top = 0;
    (base as any).left = 0;
    (base as any).right = 0;
  }

  if (s.inlineStyle) Object.assign(base, s.inlineStyle);
  return base;
}

/** İç satır (görsel + metin) hizalama ve aralıklar */
export function buildRowStyle(o: Holiday): React.CSSProperties {
  const s = o.style ?? {};
  const gap = s.gap ?? "8px";
  const px = s.paddingX ?? "16px";
  const height = s.height;

  let justify: React.CSSProperties["justifyContent"] = "center";
  if (s.align === "left") justify = "flex-start";
  else if (s.align === "right") justify = "flex-end";

  const row: React.CSSProperties = {
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: justify,
    gap,
    paddingInline: px,
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    height,
    lineHeight: height ? height : undefined,
  };

  return row;
}

/** Görselin boyutlandırma kuralları */
export function imageStyle(o: Holiday): React.CSSProperties {
  const h = o.style?.height;
  const im = o.content?.image;
  return {
    maxHeight: im?.maxHeight ?? (h ? h : undefined),
    width: im?.width,
    objectFit: "contain",
    display: "block",
  };
}

/** Dış sarıcı className üretimi (kullanıcı containerClass ile ekleyebilir) */
export function outerClassName(o: Holiday, extra?: string): string {
  const cont = o.style?.containerClass?.trim();
  return [extra ?? "", cont ?? ""].filter(Boolean).join(" ").trim();
}

/** İç satıra className üretimi (kullanıcı customClass ile ekleyebilir) */
export function innerClassName(o: Holiday): string {
  const cc = o.style?.customClass?.trim();
  return [cc ?? ""].filter(Boolean).join(" ").trim();
}

/** Metin bloğuna ait yazım stil kuralları */
export function textBlockStyle(o: Holiday): React.CSSProperties {
  const s = o.style ?? {};
  return {
    display: "inline-block",
    whiteSpace: "pre-wrap",
    textAlign: s.textAlign,
  };
}
