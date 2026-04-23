import React from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';

const CATEGORY_COLORS = {
  pothole: '#6366F1',
  garbage: '#10B981',
  streetlight: '#F59E0B',
  waterleakage: '#3B82F6',
  encroachment: '#EF4444',
  other: '#8B5CF6',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontWeight: 600, fontSize: 14, margin: 0 }}>
            {p.value} {p.name}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const CategoryBarChart = ({ data }) => {
  if (!data?.length) return <div className="empty-state"><p>No category data</p></div>;

  const chartData = data.map((d) => ({
    name: d.category.charAt(0).toUpperCase() + d.category.slice(1),
    count: d.count,
    key: d.category,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#64748B', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#64748B', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" name="reports" radius={[6, 6, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={CATEGORY_COLORS[entry.key] || '#6366F1'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export const TrendLineChart = ({ data }) => {
  if (!data?.length) return <div className="empty-state"><p>No trend data</p></div>;

  const chartData = data.map((d) => ({
    date: d.date.slice(5), // MM-DD
    count: d.count,
  }));

  // Show every 5th label to avoid crowding
  const tickFormatter = (val, index) => (index % 5 === 0 ? val : '');

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#64748B', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={tickFormatter}
        />
        <YAxis
          tick={{ fill: '#64748B', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="count"
          name="reports"
          stroke="#6366F1"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 6, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export const ResolutionTable = ({ data }) => {
  if (!data?.length) return <div className="empty-state"><p>No resolved data yet</p></div>;

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Avg Resolution Time</th>
            <th>Reports Resolved</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>
                <span style={{ textTransform: 'capitalize', color: CATEGORY_COLORS[row.category] || 'var(--accent)', fontWeight: 500 }}>
                  {row.category}
                </span>
              </td>
              <td>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {row.avgHours}h
                </span>
              </td>
              <td style={{ color: 'var(--text-primary)' }}>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default { CategoryBarChart, TrendLineChart, ResolutionTable };
