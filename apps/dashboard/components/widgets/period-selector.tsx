"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const PERIODS = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

const GOLD = "#bb9a4c";

export function PeriodSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = Number(searchParams.get("days"));
  const current = [7, 30, 90].includes(raw) ? raw : 30;

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg p-0.5"
      style={{ background: "rgba(11,8,5,0.06)", border: "1px solid var(--border)" }}
    >
      {PERIODS.map(({ label, value }) => {
        const active = current === value;
        return (
          <button
            key={value}
            onClick={() => router.push(`${pathname}?days=${value}`)}
            className="rounded-md px-3 py-1 text-[12px] font-medium transition-all duration-150"
            style={
              active
                ? {
                    background: "var(--card)",
                    color: GOLD,
                    boxShadow: "0 1px 3px rgba(11,8,5,0.08)",
                    border: `1px solid ${GOLD}30`,
                  }
                : {
                    color: "var(--muted-foreground)",
                    border: "1px solid transparent",
                  }
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
