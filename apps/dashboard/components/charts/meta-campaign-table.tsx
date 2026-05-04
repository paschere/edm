"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MetaCampaign } from "@/lib/meta";

interface MetaCampaignTableProps {
  campaigns: MetaCampaign[];
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtNum(n: number, decimals = 0) {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: decimals }).format(n);
}

export function MetaCampaignTable({ campaigns }: MetaCampaignTableProps) {
  if (!campaigns.length) {
    return <p className="text-[13px] text-muted-foreground">No hay campañas activas</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow style={{ borderColor: "rgba(11,8,5,0.07)" }}>
            <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Campaña</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Estado</TableHead>
            <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Gasto</TableHead>
            <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium">ROAS</TableHead>
            <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Compras</TableHead>
            <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium">CPA</TableHead>
            <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium">CPM</TableHead>
            <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Frec.</TableHead>
            <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium">CTR</TableHead>
            <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Alcance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((c) => (
            <TableRow key={c.id} style={{ borderColor: "rgba(11,8,5,0.05)" }}>
              <TableCell className="text-[13px] font-medium max-w-[180px] truncate text-foreground">
                {c.name}
              </TableCell>
              <TableCell>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={
                    c.status === "ACTIVE"
                      ? { background: "rgba(79,122,62,0.1)", color: "#4f7a3e", border: "1px solid rgba(79,122,62,0.2)" }
                      : { background: "rgba(11,8,5,0.05)", color: "#a69880", border: "1px solid rgba(11,8,5,0.08)" }
                  }
                >
                  {c.status === "ACTIVE" ? "Activa" : "Pausada"}
                </span>
              </TableCell>
              <TableCell className="text-right metric text-[12px] tabular-nums text-foreground">
                {fmtMoney(c.spend)}
              </TableCell>
              <TableCell className="text-right metric text-[12px] tabular-nums">
                <span style={{ color: c.roas >= 2 ? "#4f7a3e" : c.roas > 0 ? "#bb9a4c" : "#a69880", fontWeight: c.roas >= 2 ? 600 : 400 }}>
                  {c.roas > 0 ? `${c.roas.toFixed(2)}x` : "—"}
                </span>
              </TableCell>
              <TableCell className="text-right metric text-[12px] tabular-nums text-foreground">
                {c.purchases > 0 ? fmtNum(c.purchases) : "—"}
              </TableCell>
              <TableCell className="text-right metric text-[12px] tabular-nums">
                <span style={{ color: c.cpa > 0 ? "var(--foreground)" : "#a69880" }}>
                  {c.cpa > 0 ? fmtMoney(c.cpa) : "—"}
                </span>
              </TableCell>
              <TableCell className="text-right metric text-[12px] tabular-nums text-foreground">
                {c.cpm > 0 ? fmtMoney(c.cpm) : "—"}
              </TableCell>
              <TableCell className="text-right metric text-[12px] tabular-nums">
                <span style={{ color: c.frequency > 3 ? "#b43c28" : c.frequency > 2 ? "#bb9a4c" : "var(--foreground)" }}>
                  {c.frequency > 0 ? c.frequency.toFixed(2) : "—"}
                </span>
              </TableCell>
              <TableCell className="text-right metric text-[12px] tabular-nums text-foreground">
                {c.ctr.toFixed(2)}%
              </TableCell>
              <TableCell className="text-right metric text-[12px] tabular-nums text-foreground">
                {fmtNum(c.reach)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
