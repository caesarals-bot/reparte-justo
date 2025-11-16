"use client"

import { useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { FileTextIcon, CheckCircle2Icon, AlertCircleIcon, Users } from "lucide-react"
import { PaymentGroupCard } from "./payment-group-card"
import { DateRangePicker } from "./date-range-picker"
import { HistoricalSettlement } from "./historical-settlement"
import type {
  DashboardPaymentGroup,
  DashboardSettlement,
} from "@/data/dashboard"

type DashboardProps = {
  restaurantName: string
  liquidacionMode: "pool" | "directa"
  pendingData: DashboardPaymentGroup[]
  historicalData: DashboardSettlement[]
}

export function Dashboard({ restaurantName, liquidacionMode, pendingData, historicalData }: DashboardProps) {
  const navigate = useNavigate()
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })

  const distributionGroups = pendingData.filter((group) => group.category !== "deduction")
  const deductionGroups = pendingData.filter((group) => group.category === "deduction")

  const totalPending = distributionGroups.reduce((sum, group) => sum + group.totalAmount, 0)
  const totalDescuentos = deductionGroups.reduce((sum, group) => sum + group.totalAmount, 0)

  const handleSettlement = () => {
    navigate("/dashboard/liquidacion")
  }

  const handleManageStaff = () => {
    navigate("/dashboard/personal")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <FileTextIcon className="h-4 w-4" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-balance">Dashboard de {restaurantName}</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Sistema de gestión de propinas — Modo:{" "}
              <Badge variant="outline" className="ml-1">
                {liquidacionMode === "pool" ? "Pool" : "Directa"}
              </Badge>
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          {/* Pending Payment Section */}
          <section>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Pendiente de Pago</h2>
                <p className="mt-1 text-sm text-muted-foreground">Dinero acumulado desde la última liquidación</p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <div className="text-3xl font-bold tracking-tight">${totalPending.toLocaleString("es-CL")}</div>
                {totalDescuentos > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <AlertCircleIcon className="h-4 w-4" />
                    <span>Descuentos: ${totalDescuentos.toLocaleString("es-CL")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Groups */}
            <div className="grid gap-6 md:grid-cols-2">
              {distributionGroups.map((group) => (
                <PaymentGroupCard key={group.groupName} group={group} />
              ))}
            </div>

            {deductionGroups.length ? (
              <div className="mt-6 flex flex-wrap items-start gap-6">
                {deductionGroups.map((group) => (
                  <PaymentGroupCard key={group.groupName} group={group} variant="compact" />
                ))}
              </div>
            ) : null}

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                variant="outline"
                className="gap-2 px-6"
                onClick={handleManageStaff}
                aria-label="Gestionar personal"
              >
                <Users className="h-5 w-5" />
                Editar personal
              </Button>
              <Button size="lg" className="gap-2 px-8" onClick={handleSettlement}>
                <CheckCircle2Icon className="h-5 w-5" />
                Liquidar y Generar Reporte
              </Button>
            </div>
          </section>

          <Separator className="my-4" />

          {/* Historical Section */}
          <section>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Liquidaciones Pasadas</h2>
                <p className="mt-1 text-sm text-muted-foreground">Historial de pagos realizados</p>
              </div>
              <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
            </div>

            {/* Historical Settlements */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {historicalData.map((settlement) => (
                <HistoricalSettlement key={settlement.id} settlement={settlement} />
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
