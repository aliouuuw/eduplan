import { useMemo } from 'react'
import { isSameDay } from 'date-fns'

import { useCalendarContext } from '../../calendar-context'
import { hours } from './calendar-body-margin-day-margin'
import CalendarBodyHeader from '../calendar-body-header'
import CalendarEvent from '../../calendar-event'
import { useCalendarDrag } from '../../drag/calendar-drag-manager'
import { TIME_INTERVALS } from '../utils/time-intervals'

export default function CalendarBodyDayContent({ date }: { date: Date }) {
  const { events } = useCalendarContext()
  const {
    handleSlotMouseDown,
    handleSlotMouseEnter,
    isSlotSelected,
    isDragging,
    previewEvent,
  } = useCalendarDrag()

  const dayEvents = events.filter((event) => isSameDay(event.start, date))

  const intervalsByHour = useMemo(() => {
    const grouped: Record<number, typeof TIME_INTERVALS> = {}
    TIME_INTERVALS.forEach((interval) => {
      if (!grouped[interval.hour]) {
        grouped[interval.hour] = []
      }
      grouped[interval.hour].push(interval)
    })
    return grouped
  }, [])

  return (
    <div className="flex flex-col flex-grow">
      <CalendarBodyHeader date={date} />

      <div className="flex-1 relative select-none">
        {hours.map((hour) => (
          <div key={hour} className="h-32 border-b border-border/50 flex flex-col">
            {intervalsByHour[hour]?.map((interval) => (
              <div
                key={interval.index}
                data-calendar-interval
                data-calendar-date={date.toISOString()}
                className={`flex-1 group transition-colors relative ${
                  interval.minute === 0 ? '' : 'border-t border-border/20'
                } ${
                  isSlotSelected(date, interval.index)
                    ? 'bg-green-500/30 border-green-500 cursor-default'
                    : 'cursor-pointer hover:bg-muted/20'
                }`}
                onMouseDown={() => handleSlotMouseDown(date, interval.index)}
                onMouseEnter={() => handleSlotMouseEnter(date, interval.index)}
              >
                {!isDragging && interval.minute === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-md border">
                      Click & drag to select
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {previewEvent && isSameDay(previewEvent.start, date) && (
          <CalendarEvent key="preview" event={previewEvent} className="opacity-70 pointer-events-none" />
        )}

        {dayEvents.map((event) => (
          <CalendarEvent key={event.id} event={event} />
        ))}
      </div>
    </div>
  )
}
