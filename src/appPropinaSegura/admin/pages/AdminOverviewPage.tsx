import { Button } from "@/components/ui/button"
import {
    adminEvents,
    adminMetrics,
    adminRestaurants,
} from "@/data/admin"
import AdminOverview from "../components/AdminOverview"

const AdminOverviewPage = () => {
    const totalRestaurants = adminRestaurants.length
    const totalStaff = adminMetrics.find((metric) => metric.id === "staff")?.value ?? "0"

    return (
        <section className="flex flex-col gap-8">
            <header className="flex flex-col gap-3 rounded-xl border border-border bg-card/70 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        Administración
                    </p>
                    <h1 className="text-2xl font-semibold tracking-tight">Panel administrativo</h1>
                    <p className="text-sm text-muted-foreground">
                        Revisa métricas globales, gestiona {totalRestaurants} restaurantes y coordina {totalStaff} colaboradores registrados.
                    </p>
                </div>
                <Button className="gap-2" size="sm" aria-label="Generar reporte general">
                    Generar reporte
                </Button>
            </header>

            <AdminOverview sectionId="overview" metrics={adminMetrics} events={adminEvents} />
        </section>
    )
}

export default AdminOverviewPage
