import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Sparkline } from "@/components/charts/sparkline";

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  changePositive?: boolean;
  changeNeutral?: boolean;
  description?: string;
  icon?: ReactNode;
  iconColor?: string;
  sparklineData?: number[];
  trendPct?: number;
}

export function KpiCard({
  title,
  value,
  change,
  changePositive,
  changeNeutral,
  description,
  icon,
  iconColor = "#bb9a4c",
  sparklineData,
  trendPct,
}: KpiCardProps) {
  // Derive trend from trendPct when change is not explicitly provided
  let effectiveChange = change;
  let effectivePositive = changePositive;
  let effectiveNeutral = changeNeutral;

  if (trendPct !== undefined && !change) {
    effectiveChange = `${trendPct > 0 ? "+" : ""}${trendPct.toFixed(1)}%`;
    effectivePositive = trendPct > 0;
    effectiveNeutral = trendPct === 0;
  }

  const TrendIcon = effectiveNeutral ? Minus : effectivePositive ? TrendingUp : TrendingDown;

  const trendStyle = effectiveNeutral
    ? { background: "rgba(11,8,5,0.05)", color: "#78695a" }
    : effectivePositive
    ? { background: "rgba(79,122,62,0.1)", color: "#4f7a3e" }
    : { background: "rgba(180,60,40,0.08)", color: "#b43c28" };

  const hasSparkline = sparklineData && sparklineData.length >= 2;

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4 border overflow-hidden"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        boxShadow: "0 1px 3px rgba(11,8,5,0.05), 0 1px 2px rgba(11,8,5,0.04)",
      }}
    >
      {/* Top row: label + icon */}
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.18em] leading-tight"
          style={{ color: "var(--muted-foreground)" }}
        >
          {title}
        </span>
        {icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: `${iconColor}14`,
              color: iconColor,
              border: `1px solid ${iconColor}22`,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Display number — Cormorant Garamond */}
      <div
        className="display-num leading-none"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "2.4rem",
          fontWeight: 500,
          color: "var(--foreground)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>

      {/* Trend + description */}
      <div className="flex items-center gap-2 min-h-[20px]">
        {effectiveChange && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5"
            style={trendStyle}
          >
            <TrendIcon size={10} />
            {effectiveChange}
          </span>
        )}
        {description && (
          <span className="text-[11px] truncate" style={{ color: "var(--muted-foreground)" }}>
            {description}
          </span>
        )}
        {!effectiveChange && !description && trendPct === undefined && (
          <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            &nbsp;
          </span>
        )}
      </div>

      {/* Sparkline — bleeds to card edges at the bottom */}
      {hasSparkline && (
        <div className="-mx-5 -mb-5 mt-0">
          <Sparkline data={sparklineData!} color={iconColor} height={52} />
        </div>
      )}
    </div>
  );
}
