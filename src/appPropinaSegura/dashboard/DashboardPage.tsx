import { Dashboard } from "../component/dashboard/dashboard"
import {
  mockDashboardLiquidacionMode,
  mockDashboardRestaurantName,
  mockHistoricalDashboardSettlements,
  mockPendingDashboardData,
} from "@/data/dashboard"

export default function Page() {
  return (
    <Dashboard
      restaurantName={mockDashboardRestaurantName}
      liquidacionMode={mockDashboardLiquidacionMode}
      pendingData={mockPendingDashboardData}
      historicalData={mockHistoricalDashboardSettlements}
    />
  )
}
