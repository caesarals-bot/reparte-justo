type LiquidationTrendDatum = {
  label: string
  total: number
  deductions?: number
}

type LiquidationTrendChartProps = {
  data: LiquidationTrendDatum[]
}

const LiquidationTrendChart = ({ data }: LiquidationTrendChartProps) => {
  if (!data.length) {
    return null
  }

  // Calcular valores para escalas
  const maxValue = Math.max(...data.map(d => d.total))
  const minValue = 0
  
  // Calcular puntos para el SVG
  const width = 100
  const height = 100
  
  const xScale = (index: number) => (index / (data.length - 1)) * width
  const yScale = (value: number) => height - ((value - minValue) / (maxValue - minValue)) * height

  // Generar path para el área
  const areaPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)},${yScale(d.total)}`)
    .join(' ') + ` L ${xScale(data.length - 1)},${height} L ${xScale(0)},${height} Z`

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)},${yScale(d.total)}`)
    .join(' ')

  return (
    <div className="h-72 w-full">
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="h-full w-full"
        preserveAspectRatio="none"
      >
        {/* Grid */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Gradientes */}
        <defs>
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        
        {/* Área del gráfico */}
        <path
          d={areaPath}
          fill="url(#colorTotal)"
          stroke="none"
        />
        
        {/* Línea del gráfico */}
        <path
          d={linePath}
          fill="none"
          stroke="#7c3aed"
          strokeWidth="2"
        />
        
        {/* Puntos de datos */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={xScale(i)}
            cy={yScale(d.total)}
            r="2"
            fill="#7c3aed"
            className="hover:r-3 transition-all"
          />
        ))}
      </svg>
      
      {/* Tooltip personalizado (implementación simplificada) */}
      <div className="mt-2 text-center">
        <div className="text-xs text-muted-foreground">
          Últimos {data.length} períodos
        </div>
      </div>
    </div>
  )
}

export default LiquidationTrendChart
