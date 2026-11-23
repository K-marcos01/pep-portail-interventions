import type { QuoteStatus } from '../types';

const STATUS_CONFIG: Record<
  QuoteStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: 'Brouillon',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  SENT: {
    label: 'Envoyé au client',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  ACCEPTED: {
    label: 'Accepté',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    label: 'Refusé',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  IN_PROGRESS: {
    label: 'Intervention en cours',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  COMPLETED: {
    label: 'Intervention terminée',
    className: 'bg-teal-50 text-teal-700 border-teal-200',
  },
};

export function StatusBadge({ status }: { status: QuoteStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}