interface CalendarLegendProps {
    className?: string
}

const CalendarLegend = ({ className = "" }: CalendarLegendProps) => {
    return (
        <p className={`text-[11px] text-white/70 ${className}`}>
            <span className="font-medium text-emerald-300">Verde</span> = cierre pendiente •
            <span className="ml-1 font-medium text-white/70"> Gris</span> = cierre liquidado •
            <span className="ml-1 font-medium text-primary">Borde</span> = último cierre guardado
        </p>
    )
}

export default CalendarLegend
