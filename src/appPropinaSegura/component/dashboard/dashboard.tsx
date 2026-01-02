"use client"

import { Suspense, lazy } from "react"
import { useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { FileTextIcon, CheckCircle2Icon, AlertCircleIcon, Users, EyeIcon, Loader2 } from "lucide-react"
import { PaymentGroupCard } from "./payment-group-card"
import { DateRangePicker } from "./date-range-picker"
import { HistoricalSettlement } from "./historical-settlement"
import type { DashboardPaymentGroup, DashboardSettlement } from "@/data/dashboard"
import StaffPayoutChart from "./charts/StaffPayoutChart"
const LiquidationTrendChart = lazy(() => import("./charts/LiquidationTrendChart"))

type DashboardProps = {
  restaurantName: string
  liquidacionMode: "pool" | "directa"
  pendingData: DashboardPaymentGroup[]
  pendingHistoricalData: DashboardSettlement[]
  historicalSettlements: DashboardSettlement[]
}

export function Dashboard({ restaurantName, liquidacionMode, pendingData, pendingHistoricalData, historicalSettlements }: DashboardProps) {
  const navigate = useNavigate()
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })

  const distributionGroups = pendingData.filter((group) => group.category !== "deduction")
  const deductionGroups = pendingData.filter((group) => group.category === "deduction")

  const totalPending = distributionGroups.reduce((sum, group) => sum + group.totalAmount, 0)
  const totalDescuentos = deductionGroups.reduce((sum, group) => sum + group.totalAmount, 0)

  const topMembers = distributionGroups
    .flatMap((group) => group.breakdown.map((member) => ({
      name: member.name,
      amount: member.amount,
      group: group.groupName,
    })))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)

  const trendData = historicalSettlements.slice(0, 8).map((settlement) => ({
    label: settlement.dateRange,
    total: settlement.totalRepartido,
    deductions: settlement.totalDescuentos,
  }))

  const handleSettlement = () => {
    navigate("/dashboard/liquidacion")
  }

  const handleAddStaff = () => {
    navigate("/dashboard/personal?section=add")
  }

  const handleEditStaff = () => {
    navigate("/dashboard/personal?section=edit")
  }

  return (
    <div className="min-h-screen bg-transparent text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[rgba(20,23,38,0.85)] backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary/30 to-accent/40 text-white shadow-inner shadow-primary/30">
                <FileTextIcon className="h-4 w-4" />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-balance">Dashboard de {restaurantName}</h1>
            </div>
            <p className="text-sm text-white/70">
              Sistema de gestión de propinas — Modo:{" "}
              <Badge variant="outline" className="ml-2 border-white/30 text-white/80">
                {liquidacionMode === "pool" ? "Pool" : "Directa"}
              </Badge>
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10">
          {/* Pending Payment Section */}
          <section>
            <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-[rgba(21,24,40,0.9)] p-6 shadow-[0_25px_60px_rgba(5,8,25,0.45)] backdrop-blur-xl sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">Pendiente de Pago</p>
                <h2 className="text-3xl font-semibold tracking-tight text-white">
                  ${totalPending.toLocaleString("es-CL")}
                </h2>
                <p className="text-sm text-white/60">Dinero acumulado desde la última liquidación</p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                {totalDescuentos > 0 ? (
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm text-white/80">
                    <AlertCircleIcon className="h-4 w-4" />
                    <span>Descuentos: ${totalDescuentos.toLocaleString("es-CL")}</span>
                  </div>
                ) : null}
                <div className="text-xs uppercase tracking-[0.35em] text-white/60">Acciones rápidas</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="gap-2 rounded-full border-white/30 bg-white/5 px-5 text-white transition hover:bg-white/10"
                    onClick={handleAddStaff}
                    aria-label="Añadir personal"
                  >
                    <Users className="h-4 w-4" />
                    Añadir personal
                  </Button>
                  <Button
                    variant="ghost"
                    className="gap-2 rounded-full border border-white/15 bg-white/10 px-5 text-white transition hover:bg-white/15"
                    onClick={handleEditStaff}
                    aria-label="Editar personal"
                  >
                    <Users className="h-4 w-4" />
                    Editar personal
                  </Button>
                  <Button
                    size="lg"
                    className="gap-2 rounded-full bg-linear-to-r from-primary to-accent px-6 text-primary-foreground shadow-lg shadow-primary/40"
                    onClick={handleSettlement}
                  >
                    <CheckCircle2Icon className="h-5 w-5" />
                    Liquidar y Generar Reporte
                  </Button>
                </div>
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

            {(topMembers.length || trendData.length) ? (
              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                {topMembers.length ? (
                  <Card className="border border-white/10 bg-white/5 text-white">
                    <CardContent className="space-y-4 p-4 sm:p-6">
                      <div>
                        <h3 className="text-lg font-semibold">Distribución por integrante (top 8)</h3>
                        <p className="text-sm text-white/70">Muestra quién concentra mayor propina en los cierres pendientes.</p>
                      </div>
                      <StaffPayoutChart data={topMembers} />
                    </CardContent>
                  </Card>
                ) : null}
                {trendData.length ? (
                  <Card className="border border-white/10 bg-white/5 text-white">
                    <CardContent className="space-y-4 p-4 sm:p-6">
                      <div>
                        <h3 className="text-lg font-semibold">Evolución por liquidación</h3>
                        <p className="text-sm text-white/70">Comparativo de total repartido y descuentos en las últimas liquidaciones.</p>
                      </div>
                      <Suspense fallback={
                        <div className="flex h-72 w-full items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
                        </div>
                      }>
                        <LiquidationTrendChart data={trendData} />
                      </Suspense>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            ) : null}

          </section>

          <Separator className="my-4 border-white/10" />

          {/* Historical Section */}
          <section>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Cierres pendientes de liquidar</h2>
                <p className="mt-1 text-sm text-white/70">Solo mostramos cierres cuyo estado aún no es "pagado".</p>
              </div>
              <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
            </div>

            {pendingHistoricalData.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pendingHistoricalData.map((settlement) => (
                  <HistoricalSettlement key={settlement.id} settlement={settlement} />
                ))}
              </div>
            ) : (
              <Card className="border border-white/10 bg-white/5 text-white">
                <CardContent className="py-10 text-center text-sm text-white/70">
                  No hay cierres pendientes adicionales. Todo lo que aparece aquí ya está incluido en los montos de la sección "Pendiente de Pago".
                </CardContent>
              </Card>
            )}
          </section>

          <section>
            <Card className="border border-white/10 bg-white/5 text-white">
              <CardContent className="flex flex-col gap-4 py-6 text-center text-sm text-white/80 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">¿Necesitas revisar liquidaciones pagadas?</h3>
                  <p className="text-sm text-white/70">Abre la vista histórica completa solo cuando la requieras para no cargar datos innecesarios.</p>
                </div>
                <Button
                  variant="outline"
                  className="mx-auto gap-2 rounded-full border-white/30 bg-white/5 text-white transition hover:bg-white/10 sm:mx-0"
                  onClick={() => navigate("/dashboard/liquidaciones-pagadas")}
                >
                  <EyeIcon className="h-4 w-4" />
                  Ver liquidaciones pagadas
                </Button>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}
