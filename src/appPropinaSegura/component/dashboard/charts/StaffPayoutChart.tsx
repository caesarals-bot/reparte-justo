import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts"

export type StaffPayoutDatum = {
    name: string
    amount: number
    group?: string
}

type StaffPayoutChartProps = {
    data: StaffPayoutDatum[]
}

const colors = [
    "#7c3aed",
    "#38bdf8",
    "#f59e0b",
    "#22c55e",
    "#f472b6",
    "#14b8a6",
    "#fb7185",
    "#a78bfa",
]

const formatCurrency = (value: number) => `$${value.toLocaleString("es-CL")}`

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { value: number; payload: StaffPayoutDatum }[] }) => {
    if (!active || !payload || !payload.length) {
        return null
    }

    const { value, payload: datum } = payload[0]
    return (
        <div className="rounded-lg border border-border bg-background/90 px-3 py-2 text-xs shadow-lg">
            <div className="font-semibold text-foreground">{datum.name}</div>
            {datum.group ? <div className="text-muted-foreground">{datum.group}</div> : null}
            <div className="font-semibold text-primary">{formatCurrency(value)}</div>
        </div>
    )
}

const StaffPayoutChart = ({ data }: StaffPayoutChartProps) => {
    if (!data.length) {
        return null
    }

    const chartData = [...data].reverse()

    return (
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                    <XAxis type="number" tickFormatter={formatCurrency} axisLine={false} tickLine={false} fontSize={11} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={120} fontSize={12} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="amount" radius={[6, 6, 6, 6]}>
                        {chartData.map((entry, index) => (
                            <Cell key={entry.name} fill={colors[index % colors.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

export default StaffPayoutChart
