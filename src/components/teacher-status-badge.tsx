import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface TeacherStatusBadgeProps {
  status: 'available' | 'busy' | 'full' | 'no-schedule' | 'overallocated';
  showIcon?: boolean;
  variant?: 'default' | 'compact';
}

export function TeacherStatusBadge({ 
  status, 
  showIcon = true,
  variant = 'default' 
}: TeacherStatusBadgeProps) {
  const config = {
    available: {
      label: variant === 'compact' ? 'Avail' : 'Available',
      className: 'bg-green-100 text-green-800 border-green-300',
      icon: CheckCircle2,
    },
    busy: {
      label: variant === 'compact' ? 'Busy' : 'Busy',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      icon: Clock,
    },
    full: {
      label: variant === 'compact' ? 'Full' : 'At Capacity',
      className: 'bg-red-100 text-red-800 border-red-300',
      icon: AlertCircle,
    },
    'no-schedule': {
      label: variant === 'compact' ? 'No Sched' : 'No Schedule',
      className: 'bg-gray-100 text-gray-800 border-gray-300',
      icon: AlertCircle,
    },
    overallocated: {
      label: variant === 'compact' ? 'Over' : 'Overallocated',
      className: 'bg-red-100 text-red-800 border-red-300',
      icon: AlertTriangle,
    },
  };

  const { label, className, icon: Icon } = config[status];

  return (
    <Badge variant="secondary" className={`${className} gap-1`}>
      {showIcon && <Icon className="h-3 w-3" />}
      {label}
    </Badge>
  );
}

export function getTeacherStatus(teacher: {
  availability?: { hasAvailability: boolean; totalWeeklyHours: number };
  capacity?: { isOverallocated: boolean; utilizationPercentage: number };
}): 'available' | 'busy' | 'full' | 'no-schedule' | 'overallocated' {
  if (!teacher.availability?.hasAvailability) {
    return 'no-schedule';
  }

  if (teacher.capacity?.isOverallocated) {
    return 'overallocated';
  }

  const utilization = teacher.capacity?.utilizationPercentage || 0;

  if (utilization >= 90) {
    return 'full';
  } else if (utilization >= 75) {
    return 'busy';
  } else {
    return 'available';
  }
}

