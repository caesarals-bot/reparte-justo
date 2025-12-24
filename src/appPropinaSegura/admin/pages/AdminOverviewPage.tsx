import { Button } from "@/components/ui/button"
import AdminOverview from "../components/AdminOverview"
import { useAdminOverview } from "../hooks/useAdminOverview"

const AdminOverviewPage = () => {
    const { heroStats, metrics, restaurants, isLoading, error, refresh } = useAdminOverview()

    const totalRestaurants = restaurants.length
    const staffMetric = metrics.find((metric) => metric.id === "staff")

    return (
        <section className="space-y-8">
            <header className="rounded-3xl border border-white/10 bg-linear-to-br from-[#161b36]/95 via-[#0f142a]/95 to-[#080b16]/95 p-6 text-white shadow-[0_35px_80px_rgba(3,6,23,0.55)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/60">Administración</p>
                        <h1 className="text-3xl font-semibold tracking-tight">Visión general</h1>
                        <p className="text-sm text-white/70">
                            Revisa métricas globales, gestiona {totalRestaurants} restaurantes y coordina {staffMetric?.value ?? "0"} colaboradores registrados.
                        </p>
                    </div>
                    <Button
                        className="gap-2"
                        size="sm"
                        aria-label="Actualizar datos administrativos"
                        onClick={() => refresh()}
                        disabled={isLoading}
                    >
                        {isLoading ? "Actualizando..." : "Actualizar datos"}
                    </Button>
                </div>

                <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {heroStats.map((stat) => (
                        <div
                            key={stat.id}
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
                        >
                            <dt className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/60">{stat.label}</dt>
                            <dd className="mt-2 text-2xl font-semibold text-white">{stat.value}</dd>
                            <p className="text-xs text-white/60">{stat.helper}</p>
                        </div>
                    ))}
                </dl>

                {error ? (
                    <p className="mt-4 text-sm text-red-200" role="alert">
                        {error}
                    </p>
                ) : null}
            </header>

            <AdminOverview sectionId="overview" metrics={metrics} restaurants={restaurants} />
        </section>
    )
}

export default AdminOverviewPage
