import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'

interface DataItem {
  name: string
  value: number
  fill?: string
}

interface BarChartCardProps {
  title: string
  data: DataItem[]
  valueFormatter?: (n: number) => string
  barColors?: string[]
}

const DEFAULT_COLORS = ['#C9A962', '#B8953F', '#9C8B7A']

export default function BarChartCard({
  title,
  data,
  valueFormatter = (n) => String(n),
  barColors = DEFAULT_COLORS,
}: BarChartCardProps) {
  const safeData =
    Array.isArray(data) && data.length > 0
      ? data.filter((d) => typeof d.value === 'number' && Number.isFinite(d.value))
      : []

  const hasData = safeData.length > 0

  return (
    <div
      className="rounded-[4px] p-5 transition-all duration-300"
      style={{
        backgroundColor: '#251E19',
        border: '1px solid #4A3F35',
      }}
    >
      <h3
        className="mb-4 text-sm"
        style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}
      >
        {title}
      </h3>
      <div className="h-[200px] min-h-[200px] w-full min-w-0">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
            <BarChart
              data={safeData}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#9C8B7A', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9C8B7A', fontFamily: 'var(--font-display)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={valueFormatter}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '4px',
                  border: '1px solid #4A3F35',
                  backgroundColor: '#251E19',
                  color: '#E8DFD4',
                  fontSize: '11px',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.05em',
                }}
                cursor={{ fill: 'rgba(201,169,98,0.04)' }}
                formatter={(value: unknown) => {
                  const n = Array.isArray(value) ? value[0] : value
                  const num = typeof n === 'number' ? n : Number(n)
                  if (!Number.isFinite(num)) return ['—', '']
                  return [valueFormatter(num), '']
                }}
                labelFormatter={(label) => (label != null ? String(label) : '')}
              />
              <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={56}>
                {safeData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={barColors[index % barColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="flex h-full items-center justify-center text-xs italic"
            style={{ fontFamily: 'var(--font-body)', color: '#4A3F35' }}
          >
            No data available
          </div>
        )}
      </div>
    </div>
  )
}
