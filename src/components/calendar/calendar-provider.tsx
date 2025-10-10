import { CalendarContext } from './calendar-context'
import { CalendarEvent, Mode } from './calendar-types'
import { useState, useCallback } from 'react'
import CalendarNewEventDialog from './dialog/calendar-new-event-dialog'
import CalendarManageEventDialog from './dialog/calendar-manage-event-dialog'
import { setHours, setMinutes, addHours } from 'date-fns'

export default function CalendarProvider({
  events,
  setEvents,
  mode,
  setMode,
  date,
  setDate,
  calendarIconIsToday = true,
  children,
}: {
  events: CalendarEvent[]
  setEvents: (events: CalendarEvent[]) => void
  mode: Mode
  setMode: (mode: Mode) => void
  date: Date
  setDate: (date: Date) => void
  calendarIconIsToday: boolean
  children: React.ReactNode
}) {
  const [newEventDialogOpen, setNewEventDialogOpen] = useState(false)
  const [manageEventDialogOpen, setManageEventDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [pendingEvent, setPendingEvent] = useState<CalendarEvent | null>(null)

  // Quick create event when clicking on empty slot
  const quickCreateEvent = useCallback((clickDate: Date, hour: number) => {
    const startTime = setMinutes(setHours(clickDate, hour), 0)
    const endTime = addHours(startTime, 1) // Default 1-hour slot

    const newEvent: CalendarEvent = {
      id: `temp-${Date.now()}`,
      title: 'Available',
      color: 'green',
      start: startTime,
      end: endTime,
    }

    setPendingEvent(newEvent)
    setSelectedEvent(newEvent)
    setNewEventDialogOpen(true)
  }, [])

  return (
    <CalendarContext.Provider
      value={{
        events,
        setEvents,
        mode,
        setMode,
        date,
        setDate,
        calendarIconIsToday,
        newEventDialogOpen,
        setNewEventDialogOpen,
        manageEventDialogOpen,
        setManageEventDialogOpen,
        selectedEvent,
        setSelectedEvent,
        quickCreateEvent,
        pendingEvent,
        setPendingEvent,
      }}
    >
      <CalendarNewEventDialog />
      <CalendarManageEventDialog />
      {children}
    </CalendarContext.Provider>
  )
}
