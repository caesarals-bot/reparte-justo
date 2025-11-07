"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarIcon, EyeIcon, AlertCircleIcon } from "lucide-react"
import type { DashboardSettlement } from "@/data/dashboard"

type HistoricalSettlementProps = {
  settlement: DashboardSettlement
}

export function HistoricalSettlement({ settlement }: HistoricalSettlementProps) {
  const handleViewDetails = () => {
    console.log("Ver detalles de liquidación:", settlement.id)
    // Aquí iría la lógica para ver detalles
  }

  return (
    <Card className="group transition-colors hover:border-primary/50">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground">Período</div>
              <div className="mt-0.5 text-sm font-medium text-pretty">{settlement.dateRange}</div>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground">Total Repartido</div>
            <div className="mt-1 text-xl font-bold tracking-tight">
              ${settlement.totalRepartido.toLocaleString("es-CL")}
            </div>
            {settlement.totalDescuentos > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <AlertCircleIcon className="h-3 w-3" />
                <span>Descuentos: ${settlement.totalDescuentos.toLocaleString("es-CL")}</span>
              </div>
            )}
          </div>

          <Button variant="outline" size="sm" className="w-full gap-2 bg-transparent" onClick={handleViewDetails}>
            <EyeIcon className="h-4 w-4" />
            Ver Detalles
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
