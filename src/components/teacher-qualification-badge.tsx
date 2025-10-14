import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface TeacherQualificationBadgeProps {
  isQualified: boolean;
  variant?: 'default' | 'compact';
  showIcon?: boolean;
}

export function TeacherQualificationBadge({ 
  isQualified, 
  variant = 'default',
  showIcon = true 
}: TeacherQualificationBadgeProps) {
  if (isQualified) {
    return (
      <Badge 
        variant="secondary" 
        className="bg-green-100 text-green-800 border-green-300 gap-1"
      >
        {showIcon && <CheckCircle2 className="h-3 w-3" />}
        {variant === 'default' ? 'Qualified' : 'Q'}
      </Badge>
    );
  }

  return (
    <Badge 
      variant="secondary" 
      className="bg-yellow-100 text-yellow-800 border-yellow-300 gap-1"
    >
      {showIcon && <AlertTriangle className="h-3 w-3" />}
      {variant === 'default' ? 'Not Qualified' : 'NQ'}
    </Badge>
  );
}

