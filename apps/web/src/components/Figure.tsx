import { cn } from '@/lib/cn';

/** Cifra tabular. Num razão os dígitos empilham; aqui também. */
export function Figure({
  value,
  className,
  decimals = 0,
  sign = false,
}: {
  value: number;
  className?: string;
  decimals?: number;
  sign?: boolean;
}) {
  const text = Math.abs(value).toFixed(decimals);
  return (
    <span className={cn('figure', className)}>
      {sign && (value >= 0 ? '+' : '−')}
      {text}
    </span>
  );
}
