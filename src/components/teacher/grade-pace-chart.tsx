import { cn } from '@/lib/utils';

import { expectedGradeEntriesAtWeek } from '@/lib/data/teacher-home-math';

// Studio home chart: cumulative grades from the DB vs the council pace line.
export function GradePaceChart({
  week,
  weeks,
  entered,
  expected,
  gradesTarget,
  gradesByWeek,
  className,
}: {
  week: number;
  weeks: number;
  entered: number;
  expected: number;
  gradesTarget: number;
  gradesByWeek: number[];
  className?: string;
}) {
  const behind = expected - entered;
  const x = (w: number) => (w / weeks) * 800;
  const y = (n: number) => (gradesTarget > 0 ? 108 - (n / gradesTarget) * 96 : 108);
  const points = gradesByWeek.slice(0, week).map((value, index) => `${x(index + 1).toFixed(1)} ${y(value).toFixed(1)}`);
  const path = points.length ? `M0 108 L${points.join(' L')} L${x(week).toFixed(1)} 108 Z` : '';
  const line = points.length ? `M0 108 L${points.join(' L')}` : 'M0 108';
  const last = points[points.length - 1]?.split(' ') ?? ['0', '108'];
  const paceY = (w: number) => y(expectedGradeEntriesAtWeek(w, gradesTarget, weeks));

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
          <path
            d={`M0 ${paceY(1).toFixed(1)} L800 ${paceY(weeks).toFixed(1)}`}
            className="stroke-progress"
            strokeWidth={1.6}
            strokeDasharray="5 6"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
          {points.length > 0 && (
            <path d={line} className="stroke-now" strokeWidth={3} fill="none" vectorEffect="non-scaling-stroke" />
          )}
          {points.length > 0 && (
            <circle cx={last[0]} cy={last[1]} r={5.5} className="fill-card stroke-now" strokeWidth={3} vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        <div className="mt-1.5 flex justify-between text-[12.5px] text-muted-foreground">
          {Array.from({ length: weeks }, (_, index) => index + 1).map((label) => (
            <span key={label} className={label === week ? 'font-medium text-foreground' : undefined}>
              {label === weeks ? 'Conseil' : `S${label}`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
