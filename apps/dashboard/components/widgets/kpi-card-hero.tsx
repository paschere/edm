import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Sparkline } from "@/components/charts/sparkline";

interface Stat {
  icon?: ReactNode;
  label: string;
}

interface KpiCardHeroProps {
  title: string;
  subtitle?: string;
  value: string;
  trendPct?: number;
  stats?: Stat[];
  icon?: ReactNode;
  iconColor?: string;
  sparklineData?: number[];
}

export function KpiCardHero({
  title,
  subtitle,
  value,
  trendPct,
  stats,
  icon,
  iconColor = "#bb9a4c",
  sparklineData,
}: KpiCardHeroProps) {
  const hasTrend = trendPct !== undefined;
  const isPositive = hasTrend && trendPct! >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div
      className="relative rounded-2xl overflow-hidden flex flex-col h-full"
      style={{
        background: "linear-gradient(145deg, #110e07 0%, #1c1409 55%, #110e07 100%)",
        border: "1px solid rgba(187,154,76,0.18)",
        boxShadow:
          "0 12px 48px rgba(11,8,5,0.5), 0 2px 8px rgba(187,154,76,0.06), inset 0 1px 0 rgba(187,154,76,0.10)",
        minHeight: "240px",
      }}
    >
      {/* Dot texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(187,154,76,0.032) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* Warm top-left glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 0,
          left: 0,
          width: "340px",
          height: "220px",
          background: `radial-gradient(ellipse at 15% 20%, ${iconColor}14 0%, transparent 65%)`,
        }}
      />

      {/* Content */}
      <div className="relative flex-1 flex flex-col p-6 gap-0">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            {icon && (
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: `${iconColor}1c`,
                  border: `1px solid ${iconColor}28`,
                  color: iconColor,
                }}
              >
                {icon}
              </div>
            )}
            <div>
              <p
                className="font-semibold leading-tight"
                style={{ fontSize: "15px", color: "#f4eee1" }}
              >
                {title}
              </p>
              {subtitle && (
                <p
                  className="mt-0.5 leading-tight"
                  style={{ fontSize: "12px", color: "rgba(244,238,225,0.40)" }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {hasTrend && (
            <span
              className="inline-flex items-center gap-1.5 font-semibold rounded-full px-3 py-1.5 shrink-0"
              style={{
                fontSize: "12px",
                ...(isPositive
                  ? {
                      background: "rgba(187,154,76,0.14)",
                      color: "#c9a654",
                      border: "1px solid rgba(187,154,76,0.22)",
                    }
                  : {
                      background: "rgba(180,60,40,0.14)",
                      color: "#e06042",
                      border: "1px solid rgba(180,60,40,0.22)",
                    }),
              }}
            >
              <TrendIcon size={11} />
              {trendPct! > 0 ? "+" : ""}
              {trendPct!.toFixed(1)}%
            </span>
          )}
        </div>

        {/* Big KPI number */}
        <div
          className="flex-1"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.8rem, 4.5vw, 4.2rem)",
            fontWeight: 500,
            color: iconColor,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {value}
        </div>

        {/* Supporting stats */}
        {stats && stats.length > 0 && (
          <div className="flex items-center gap-5 mt-4 flex-wrap">
            {stats.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span
                    className="mr-1"
                    style={{ color: "rgba(244,238,225,0.18)" }}
                  >
                    ·
                  </span>
                )}
                {s.icon && (
                  <span
                    className="shrink-0"
                    style={{ color: "rgba(244,238,225,0.32)" }}
                  >
                    {s.icon}
                  </span>
                )}
                <span style={{ fontSize: "12px", color: "rgba(244,238,225,0.50)" }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sparkline — edge-to-edge at the bottom */}
      {sparklineData && sparklineData.length >= 2 && (
        <div className="flex-shrink-0 -mt-4">
          <Sparkline data={sparklineData} color={iconColor} height={80} />
        </div>
      )}
    </div>
  );
}
