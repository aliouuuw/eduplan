import { CalendarEvent as CalendarEventType } from '@/components/calendar/calendar-types'
import { useCalendarContext } from '@/components/calendar/calendar-context'
import { format, isSameDay, isSameMonth, differenceInMinutes, addMinutes, setHours, setMinutes as setMins } from 'date-fns'
import { cn } from '@/lib/utils'
import { motion, MotionConfig, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { useMemo, useState } from 'react'
import { hasConflicts } from '@/lib/availability-utils'
import { AlertTriangle, GripVertical, Trash2, Edit3 } from 'lucide-react'
import { toast } from 'sonner'

interface EventPosition {
  left: string
  width: string
  top: string
  height: string
}

function getOverlappingEvents(
  currentEvent: CalendarEventType,
  events: CalendarEventType[]
): CalendarEventType[] {
  return events.filter((event) => {
    if (event.id === currentEvent.id) return false
    return (
      currentEvent.start < event.end &&
      currentEvent.end > event.start &&
      isSameDay(currentEvent.start, event.start)
    )
  })
}

function calculateEventPosition(
  event: CalendarEventType,
  allEvents: CalendarEventType[]
): EventPosition {
  const overlappingEvents = getOverlappingEvents(event, allEvents)
  const group = [event, ...overlappingEvents].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  )
  const position = group.indexOf(event)
  const width = `${100 / (overlappingEvents.length + 1)}%`
  const left = `${(position * 100) / (overlappingEvents.length + 1)}%`

  const startHour = event.start.getHours()
  const startMinutes = event.start.getMinutes()

  let endHour = event.end.getHours()
  let endMinutes = event.end.getMinutes()

  if (!isSameDay(event.start, event.end)) {
    endHour = 23
    endMinutes = 59
  }

  const topPosition = startHour * 128 + (startMinutes / 60) * 128
  const duration = endHour * 60 + endMinutes - (startHour * 60 + startMinutes)
  const height = (duration / 60) * 128

  return {
    left,
    width,
    top: `${topPosition}px`,
    height: `${height}px`,
  }
}

function formatDuration(start: Date, end: Date): string {
  const minutes = differenceInMinutes(end, start)
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export default function CalendarEvent({
  event,
  month = false,
  className,
}: {
  event: CalendarEventType
  month?: boolean
  className?: string
}) {
  const { events, setEvents, setSelectedEvent, setManageEventDialogOpen, date } =
    useCalendarContext()
  const [isDragging, setIsDragging] = useState(false)
  const [showHoverMenu, setShowHoverMenu] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Memoize expensive calculations
  const style = useMemo(
    () => (month ? {} : calculateEventPosition(event, events)),
    [event, events, month]
  )
  
  const duration = useMemo(
    () => formatDuration(event.start, event.end),
    [event.start, event.end]
  )
  
  const hasConflict = useMemo(
    () => hasConflicts(event, events),
    [event, events]
  )

  // Generate a unique key that includes the current month to prevent animation conflicts
  const isEventInCurrentMonth = isSameMonth(event.start, date)
  const animationKey = `${event.id}-${
    isEventInCurrentMonth ? 'current' : 'adjacent'
  }`
  
  // Handle drag to move event
  const handleDragEnd = (_: any, info: any) => {
    if (month) return // Disable drag in month view
    
    setIsDragging(false)
    
    // Calculate time change based on vertical drag
    // Each hour is 128px (h-32 = 128px in Tailwind)
    const pixelsPerHour = 128
    const draggedPixels = info.offset.y
    const hoursChanged = Math.round(draggedPixels / pixelsPerHour)
    
    if (hoursChanged === 0) return
    
    // Update event times
    const newStart = addMinutes(event.start, hoursChanged * 60)
    const newEnd = addMinutes(event.end, hoursChanged * 60)
    
    const updatedEvent: CalendarEventType = {
      ...event,
      start: newStart,
      end: newEnd,
    }
    
    // Update in events array
    const updatedEvents = events.map(e => e.id === event.id ? updatedEvent : e)
    setEvents(updatedEvents)
  }

  // Handle quick delete
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Don't delete temp events
    if (event.id.startsWith('temp-') || event.id === 'preview-temp') return
    
    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/teacher-availability/${event.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setEvents(events.filter(e => e.id !== event.id))
        toast.success('Availability removed', {
          action: {
            label: 'Restore',
            onClick: () => {
              // TODO: Implement restore functionality
              toast.info('Restore not yet implemented')
            },
          },
          duration: 5000,
        })
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete availability')
      }
    } catch (error) {
      console.error('Error deleting availability:', error)
      toast.error('An error occurred')
    } finally {
      setIsDeleting(false)
      setShowHoverMenu(false)
    }
  }

  // Handle edit
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedEvent(event)
    setManageEventDialogOpen(true)
    setShowHoverMenu(false)
  }

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        <motion.div
          className={cn(
            `px-3 py-1.5 rounded-md truncate transition-all duration-300 group relative`,
            isDragging ? 'cursor-grabbing shadow-xl z-50' : event.id.startsWith('temp-') ? 'cursor-default' : 'cursor-grab',
            isDeleting && 'opacity-50',
            hasConflict 
              ? 'bg-yellow-500/20 hover:bg-yellow-500/30 border-2 border-yellow-500 ring-2 ring-yellow-500/30' 
              : `bg-${event.color}-500/10 hover:bg-${event.color}-500/20 border border-${event.color}-500`,
            !month && 'absolute',
            className
          )}
          style={style}
          drag={!month && !event.id.startsWith('temp-') ? 'y' : false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.1}
          dragMomentum={false}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          onMouseEnter={() => !isDragging && setShowHoverMenu(true)}
          onMouseLeave={() => setShowHoverMenu(false)}
          onClick={(e) => {
            if (isDragging || event.id.startsWith('temp-')) return
            // Don't do anything - let hover menu handle actions
          }}
          title={`${event.title}\n${format(event.start, 'h:mm a')} - ${format(event.end, 'h:mm a')} (${duration})${hasConflict ? '\n⚠️ Overlaps with another slot' : ''}\n${!month && !event.id.startsWith('temp-') ? '🖱️ Drag to move | Hover for options' : ''}`}
          initial={{
            opacity: 0,
            y: -3,
            scale: 0.98,
          }}
          animate={{
            opacity: isDeleting ? 0.5 : 1,
            y: 0,
            scale: isDragging ? 1.02 : 1,
          }}
          exit={{
            opacity: 0,
            scale: 0.98,
            transition: {
              duration: 0.15,
              ease: 'easeOut',
            },
          }}
          transition={{
            duration: 0.2,
            ease: [0.25, 0.1, 0.25, 1],
            opacity: {
              duration: 0.2,
              ease: 'linear',
            },
            layout: {
              duration: 0.2,
              ease: 'easeOut',
            },
          }}
          layoutId={`event-${animationKey}-${month ? 'month' : 'day'}`}
          whileHover={{ scale: month ? 1 : 1.01 }}
        >
          {/* Hover tooltip with full details */}
          <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block">
            <div className="bg-popover text-popover-foreground p-2 rounded-md shadow-lg border text-xs whitespace-nowrap">
              <p className="font-semibold">{event.title}</p>
              <p className="text-muted-foreground">
                {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
              </p>
              <p className="text-muted-foreground">Duration: {duration}</p>
              {hasConflict && (
                <p className="text-yellow-600 flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3" />
                  Overlaps with another slot
                </p>
              )}
            </div>
          </div>
          
          {/* Conflict indicator badge */}
          {hasConflict && (
            <div className="absolute -top-1 -right-1 bg-yellow-500 text-white rounded-full p-0.5">
              <AlertTriangle className="h-3 w-3" />
            </div>
          )}
          
          {/* Hover action menu */}
          {showHoverMenu && !isDragging && !event.id.startsWith('temp-') && !month && (
            <motion.div
              className="absolute -top-1 -right-1 flex gap-1 z-[60]"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15 }}
            >
              <button
                onClick={handleEdit}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5 shadow-lg transition-colors"
                title="Edit notes"
              >
                <Edit3 className="h-3 w-3" />
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-colors disabled:opacity-50"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </motion.div>
          )}
          
          <motion.div
            className={cn(
              `flex w-full text-${event.color}-500`,
              month ? 'flex-row items-center justify-between' : 'flex-row items-start gap-1'
            )}
            layout="position"
          >
            {!month && !isDragging && (
              <div className="opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0 mt-0.5">
                <GripVertical className="h-4 w-4" />
              </div>
            )}
            <div className={cn('flex flex-col flex-1 min-w-0', month && 'flex-row items-center justify-between w-full')}>
              <p className={cn('font-bold truncate', month && 'text-xs')}>
                {event.title}
              </p>
              <div className={cn('flex items-center gap-1', month && 'text-xs')}>
                <p className={cn('text-sm', month && 'text-xs')}>
                  <span>{format(event.start, 'h:mm a')}</span>
                  <span className={cn('mx-1', month && 'hidden')}>-</span>
                  <span className={cn(month && 'hidden')}>
                    {format(event.end, 'h:mm a')}
                  </span>
                </p>
                {!month && (
                  <span className="text-xs opacity-70 font-medium">({duration})</span>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  )
}
