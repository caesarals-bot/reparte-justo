import StaffAsistenciaCard from "../StaffAsistenciaCard"

interface StaffKitchenSectionProps {
    asistenciaCocina: any
    supportAssignedAmounts: number[]
    currencyFormatter: Intl.NumberFormat
    showPonderacion: boolean
}

const StaffKitchenSection = ({
    asistenciaCocina,
    supportAssignedAmounts,
    currencyFormatter,
    showPonderacion,
}: StaffKitchenSectionProps) => {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_15px_35px_rgba(3,6,23,0.35)]">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-white/70">Staff de Cocina</h4>
            <div className="mt-3 space-y-3">
                {asistenciaCocina.fields.map((field: any, index: number) => (
                    <StaffAsistenciaCard
                        key={field.id}
                        field={field}
                        index={index}
                        name="asistenciaCocina"
                        showPonderacion={showPonderacion}
                        assignedAmount={
                            supportAssignedAmounts[index] > 0
                                ? currencyFormatter.format(supportAssignedAmounts[index])
                                : undefined
                        }
                    />
                ))}
            </div>
        </div>
    )
}

export default StaffKitchenSection
