export const DOC_TYPE_LABELS: Record<string, string> = {
  payment: 'Платёж',
  ownership: 'Право владения',
  accrual: 'Начисление',
  distribution: 'Распределение',
  meter_reading: 'Показание счётчика',
  meter_charge: 'Начисление по счётчику',
  period_close: 'Закрытие периода',
  meter_correction: 'Корректировка счётчика',
}

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  posted: 'Проведён',
  cancelled: 'Отменён',
}

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-500',
  posted: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

export function fmt(amount: number | null): string {
  if (amount === null) return '—'
  return amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' BYN'
}

export function fmtDate(d: string): string {
  return d.split('-').reverse().join('.')
}
