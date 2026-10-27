import { cn } from '@/lib/utils';

// Studio home chart: entered grades vs the term pace (coral line + soft area).
export function GradePaceChart({
  week,
  weeks,
  entered,
  expected,
  className,
}: {
  week: number;
  weeks: number;
  entered: number;
  expected: number;
  className?: string;
}) {
  const behind = expected - entered;
  const x = (w: number) => (w / weeks) * 800;
  const y = (n: number) => 108 - (n / 15) * 96;
  const points = Array.from({ length: week }, (_, i) => {
    const w = i + 1;
    const value = Math.round((entered * w) / week);
    return `${x(w).toFixed(1)} ${y(value).toFixed(1)}`;
  });
  const path = points.length ? `M0 108 L${points.join(' L')} L${x(week).toFixed(1)} 108 Z` : '';
  const line = points.length ? `M0 108 L${points.join(' L')}` : 'M0 108';
  const last = points[points.length - 1]?.split(' ') ?? ['0', '108'];
  const labels = Array.from({ length: weeks }, (_, i) => i + 1);

  return (
    <div className={cn('flex flex-col', className)}>
      <p className="text-sm text-muted-foreground">
        {entered} notes saisies, {expected} attendues à ce jour
        {behind > 0 && (
          <>
            {' '}
            · <b className="font-medium text-now-ink">{behind} de retard</b>
          </>
        )}
      </p>
      <div className="relative mt-3.5">
        <svg viewBox="0 0 800 112" preserveAspectRatio="none" className="aspect-[800/112] w-full" aria-hidden>
          {path && <path d={path} className="fill-now/10" />}
          <path d={`M0 108 800 6`} className="stroke-progress" strokeWidth={1.6} strokeDasharray="5 6" fill="none" vectorEffect="non-scaling-stroke" />
          <path d={line} className="stroke-now" strokeWidth={3} fill="none" vectorEffect="non-scaling-stroke" />
          <circle cx={last[0]} cy={last[1]} r={5.5} className="fill-card stroke-now" strokeWidth={3} vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="mt-1.5 flex justify-between text-[12.5px] text-muted-foreground">
          {labels.map((label) => (
            <span key={label} className={label === week ? 'font-medium text-foreground' : undefined}>
              {label === weeks ? 'Conseil' : `S${label}`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
