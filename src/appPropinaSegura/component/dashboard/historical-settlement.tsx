"use client"

import { useNavigate } from "react-router"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarIcon, EyeIcon, AlertCircleIcon } from "lucide-react"
import type { DashboardSettlement } from "@/data/dashboard"

type HistoricalSettlementProps = {
  settlement: DashboardSettlement
}

export function HistoricalSettlement({ settlement }: HistoricalSettlementProps) {
  const navigate = useNavigate()

  const handleViewDetails = () => {
    if (settlement.link) {
      navigate(settlement.link)
      return
    }

    // TODO: Implementar vista de detalles de liquidación
  }

  const statusLabel = settlement.status?.toUpperCase()
  const statusClasses =
    settlement.status === "pagado"
      ? "bg-linear-to-r from-emerald-400/30 to-emerald-500/30 text-emerald-200"
      : "bg-linear-to-r from-amber-300/30 to-amber-400/30 text-amber-200"

  return (
    <Card className="group border border-white/10 bg-[rgba(21,24,40,0.9)] shadow-[0_20px_45px_rgba(5,8,25,0.55)] backdrop-blur-xl transition hover:border-primary/50">
      <CardContent className="space-y-4 p-5 text-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-[0.35em] text-white/60">Período</div>
              <div className="mt-0.5 text-base font-semibold text-pretty">{settlement.dateRange}</div>
            </div>
          </div>

          {statusLabel ? (
            <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClasses}`}>
              {statusLabel}
            </span>
          ) : null}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/30">
          <div className="text-[11px] uppercase tracking-[0.35em] text-white/60">Total Repartido</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">
            ${settlement.totalRepartido.toLocaleString("es-CL")}
          </div>
          {settlement.totalDescuentos > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-white/70">
              <AlertCircleIcon className="h-3 w-3" />
              <span>Descuentos: ${settlement.totalDescuentos.toLocaleString("es-CL")}</span>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 rounded-full border-white/30 bg-white/5 text-white transition hover:bg-white/10 disabled:border-white/10 disabled:text-white/40"
          onClick={handleViewDetails}
          disabled={!settlement.link}
        >
          <EyeIcon className="h-4 w-4" />
          Ver Detalles
        </Button>
      </CardContent>
    </Card>
  )
}
