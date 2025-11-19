export type DashboardMember = {
  id: string
  name: string
  amount: number
  totalDescuentos: number
  link?: string
  totalAjustes?: number
  deductionLabel?: string
}

export type DashboardPaymentGroup = {
  groupName: string
  description: string
  totalAmount: number
  breakdown: DashboardMember[]
  category?: "distribution" | "deduction"
}

export type DashboardSettlement = {
  id: string
  dateRange: string
  totalRepartido: number
  totalDescuentos: number
  link?: string
  status?: string
}

export const mockDashboardRestaurantName = "Restaurante La Transparencia"

export const mockDashboardLiquidacionMode: "pool" | "directa" = "pool"

export const mockPendingDashboardData: DashboardPaymentGroup[] = [
  {
    groupName: "Servicio (Garzones y Bar)",
    description: "Total acumulado para el personal de servicio desde la última liquidación.",
    totalAmount: 450000,
    breakdown: [
      {
        id: "g1",
        name: "María Rojas",
        amount: 55000,
        totalDescuentos: 5000,
      },
      { id: "g2", name: "Jorge Sáez", amount: 48000, totalDescuentos: 0 },
      { id: "b1", name: "Ana (Bar)", amount: 42000, totalDescuentos: 0 },
    ],
  },
  {
    groupName: "Cocina",
    description: "Total acumulado para el personal de cocina.",
    totalAmount: 150000,
    breakdown: [
      {
        id: "c1",
        name: "Lucas González",
        amount: 75000,
        totalDescuentos: 0,
      },
      {
        id: "c2",
        name: "Valentina Ortiz",
        amount: 75000,
        totalDescuentos: 0,
      },
    ],
  },
]

export const mockHistoricalDashboardSettlements: DashboardSettlement[] = [
  {
    id: "liq_1",
    dateRange: "20/10/2025 - 27/10/2025",
    totalRepartido: 605000,
    totalDescuentos: 15000,
  },
  {
    id: "liq_2",
    dateRange: "13/10/2025 - 19/10/2025",
    totalRepartido: 590000,
    totalDescuentos: 5000,
  },
]
