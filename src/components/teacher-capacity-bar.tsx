import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TeacherCapacityBarProps {
  workload: number;
  availability: number;
  utilization: number;
  variant?: 'default' | 'compact';
  showTooltip?: boolean;
}

export function TeacherCapacityBar({
  workload,
  availability,
  utilization,
  variant = 'default',
  showTooltip = true,
}: TeacherCapacityBarProps) {
  const getColor = () => {
    if (utilization >= 90) return 'bg-red-500';
    if (utilization >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const barHeight = variant === 'compact' ? 'h-2' : 'h-3';
  const percentage = availability > 0 ? Math.min((workload / availability) * 100, 100) : 0;

  const bar = (
    <div className="w-full">
      {variant === 'default' && (
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>{workload}h used</span>
          <span>{availability}h total</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${barHeight} overflow-hidden`}>
        <div
          className={`${getColor()} ${barHeight} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {variant === 'default' && (
        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
          <span>{Math.round((availability - workload) * 10) / 10}h free</span>
          <span>{utilization}% utilized</span>
        </div>
      )}
    </div>
  );

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">{bar}</div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p><strong>Workload:</strong> {workload}h</p>
              <p><strong>Availability:</strong> {availability}h</p>
              <p><strong>Free:</strong> {Math.round((availability - workload) * 10) / 10}h</p>
              <p><strong>Utilization:</strong> {utilization}%</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return bar;
}

