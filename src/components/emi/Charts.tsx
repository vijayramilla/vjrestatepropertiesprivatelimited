import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import type { AmortRow } from './types';
import { formatIndianFull } from './calculations';

interface ChartsProps {
  amortization: AmortRow[];
  isDark: boolean;
}

export function StackedBarChart({ amortization, isDark }: ChartsProps) {
  const data = amortization.map((r) => ({
    year: `Y${r.year}`,
    Principal: r.principalPaid,
    Interest: r.interestPaid,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#e5e7eb'} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 10, fill: isDark ? '#9ca3af' : '#6b7280' }}
            interval={Math.max(0, Math.floor(data.length / 15) - 1)}
          />
          <YAxis tick={{ fontSize: 10, fill: isDark ? '#9ca3af' : '#6b7280' }} />
          <Tooltip
            contentStyle={{
              background: isDark ? '#1f2937' : '#fff',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              color: isDark ? '#fff' : '#111',
            }}
            formatter={(v) => formatIndianFull(Number(v))}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: isDark ? '#d1d5db' : '#6b7280' }}
          />
          <Bar dataKey="Principal" stackId="a" fill="#000" radius={[2, 2, 0, 0]} />
          <Bar dataKey="Interest" stackId="a" fill="#d97706" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BalanceLineChart({ amortization, isDark }: ChartsProps) {
  const data = amortization.map((r) => ({
    year: `Y${r.year}`,
    Balance: r.balance,
    Principal: r.principalPaid,
    Interest: r.interestPaid,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#000" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#000" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#e5e7eb'} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 10, fill: isDark ? '#9ca3af' : '#6b7280' }}
            interval={Math.max(0, Math.floor(data.length / 15) - 1)}
          />
          <YAxis tick={{ fontSize: 10, fill: isDark ? '#9ca3af' : '#6b7280' }} />
          <Tooltip
            contentStyle={{
              background: isDark ? '#1f2937' : '#fff',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              color: isDark ? '#fff' : '#111',
            }}
            formatter={(v) => formatIndianFull(Number(v))}
          />
          <Area
            type="monotone"
            dataKey="Balance"
            stroke="#000"
            strokeWidth={2}
            fill="url(#balanceGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PaymentComparisonChart({ amortization, isDark }: ChartsProps) {
  const data = amortization.map((r) => ({
    year: `Y${r.year}`,
    Principal: r.principalPaid,
    Interest: r.interestPaid,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#e5e7eb'} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 10, fill: isDark ? '#9ca3af' : '#6b7280' }}
            interval={Math.max(0, Math.floor(data.length / 15) - 1)}
          />
          <YAxis tick={{ fontSize: 10, fill: isDark ? '#9ca3af' : '#6b7280' }} />
          <Tooltip
            contentStyle={{
              background: isDark ? '#1f2937' : '#fff',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              color: isDark ? '#fff' : '#111',
            }}
            formatter={(v) => formatIndianFull(Number(v))}
          />
          <Legend wrapperStyle={{ fontSize: '11px', color: isDark ? '#d1d5db' : '#6b7280' }} />
          <Line type="monotone" dataKey="Principal" stroke="#000" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Interest" stroke="#d97706" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
