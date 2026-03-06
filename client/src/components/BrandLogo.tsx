/**
 * BrandLogo.tsx
 * Tries multiple logo sources in order, falls back to styled letter.
 * Sources tried: Google Favicon (very reliable), DuckDuckGo, Clearbit
 */
import { useState } from "react";

interface BrandLogoProps {
  name: string;
  website?: string;
  color: string;
  size?: "sm" | "md" | "lg";
}

function getDomain(website: string): string {
  try {
    return new URL(website).hostname.replace("www.", "");
  } catch {
    return website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
  }
}

const SIZE_MAP = { sm: { outer: "w-10 h-10", img: "w-7 h-7", text: "text-base" }, md: { outer: "w-12 h-12", img: "w-9 h-9", text: "text-xl" }, lg: { outer: "w-20 h-20", img: "w-14 h-14", text: "text-3xl" } };

export function BrandLogo({ name, website, color, size = "md" }: BrandLogoProps) {
  const sz = SIZE_MAP[size];
  const domain = website ? getDomain(website) : "";

  // Try sources in order
  const sources = domain ? [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://logo.clearbit.com/${domain}`,
  ] : [];

  const [srcIdx, setSrcIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  const tryNext = () => {
    if (srcIdx + 1 < sources.length) {
      setSrcIdx(i => i + 1);
    } else {
      setFailed(true);
    }
  };

  return (
    <div
      className={`${sz.outer} rounded-xl flex items-center justify-center overflow-hidden border-2 border-white shadow-sm shrink-0`}
      style={{ backgroundColor: color }}
    >
      {!failed && sources.length > 0 ? (
        <img
          src={sources[srcIdx]}
          alt={`${name} logo`}
          className={`${sz.img} object-contain`}
          onError={tryNext}
        />
      ) : (
        <span className={`${sz.text} font-black text-white`}>
          {name.charAt(0)}
        </span>
      )}
    </div>
  );
}
