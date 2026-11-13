import { formatBRL } from '../lib/utils';

interface StatCardProps {
  label: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  trend?: number;
}

export function StatCard({ label, value, prefix, suffix, trend }: StatCardProps) {
  const isMoney = prefix === 'R$';
  const display = isMoney ? formatBRL(value as number) : (value ?? 0).toLocaleString('pt-BR');

  return (
    <div className="stat-card bg-gradient-to-br from-brand-500 to-brand-700">
      <div className="text-xs uppercase tracking-wide text-white/80">{label}</div>
      <div className="mt-1 text-2xl font-bold">
        {prefix && !isMoney ? prefix : ''}{display}{suffix || ''}
      </div>
      {trend !== undefined && (
        <div className={`mt-1 text-xs ${trend >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}