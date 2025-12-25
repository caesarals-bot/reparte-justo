import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

type LiquidationTrendDatum = {
    label: string
    total: number
    deductions?: number
}

type LiquidationTrendChartProps = {
    data: LiquidationTrendDatum[]
}

const formatCurrency = (value: number) => `$${value.toLocaleString("es-CL")}`

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { value: number; payload: LiquidationTrendDatum }[] }) => {
    if (!active || !payload || !payload.length) {
        return null
    }

    const { payload: datum } = payload[0]

    return (
        <div className="rounded-lg border border-border bg-background/90 px-3 py-2 text-xs shadow-lg">
            <div className="font-semibold text-foreground">{datum.label}</div>
            <div className="text-primary font-semibold">Total: {formatCurrency(datum.total)}</div>
            {typeof datum.deductions === "number" ? (
                <div className="text-muted-foreground">Descuentos: {formatCurrency(datum.deductions)}</div>
            ) : null}
        </div>
    )
}

const LiquidationTrendChart = ({ data }: LiquidationTrendChartProps) => {
    if (!data.length) {
        return null
    }

    return (
        <div className="h-72 w-full">
            <ResponsiveContainer>
                <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#cbd5e1" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11, fill: "#cbd5e1" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="total" stroke="#7c3aed" fill="url(#colorTotal)" strokeWidth={2} />
                    <Area type="monotone" dataKey="deductions" stroke="#f97316" fill="url(#colorDeductions)" strokeWidth={2} />
                    <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="colorDeductions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                        </linearGradient>
                    </defs>
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

export default LiquidationTrendChart
