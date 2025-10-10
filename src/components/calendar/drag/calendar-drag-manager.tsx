import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { isSameDay } from 'date-fns'
import { toast } from 'sonner'

import { useCalendarContext } from '../calendar-context'
import type { CalendarEvent } from '../calendar-types'
import { calendarEventToAvailability } from '@/lib/availability-calendar-adapter'
import { getIntervalRange } from '../body/utils/time-intervals'

type CalendarDragContextValue = {
  isDragging: boolean
  activeDate: Date | null
  previewEvent: CalendarEvent | null
  handleSlotMouseDown: (date: Date, intervalIndex: number) => void
  handleSlotMouseEnter: (date: Date, intervalIndex: number) => void
  isSlotSelected: (date: Date, intervalIndex: number) => boolean
}

const CalendarDragContext = createContext<CalendarDragContextValue | undefined>(
  undefined
)

type DragSelectionState = {
  isDragging: boolean
  date: Date | null
  startIndex: number | null
  currentIndex: number | null
}

const INITIAL_SELECTION: DragSelectionState = {
  isDragging: false,
  date: null,
  startIndex: null,
  currentIndex: null,
}

export default function CalendarDragManager({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const { events, setEvents } = useCalendarContext()

  const [selection, setSelection] = useState<DragSelectionState>(INITIAL_SELECTION)
  const [previewEvent, setPreviewEvent] = useState<CalendarEvent | null>(null)

  const eventsRef = useRef(events)
  const saveInProgressRef = useRef(false) // Prevent concurrent saves
  const dragCompletedRef = useRef(false) // GLOBAL flag - prevents duplicate processing
  const selectionRef = useRef(selection) // Store selection to avoid stale closures

  useEffect(() => {
    eventsRef.current = events
  }, [events])

  useEffect(() => {
    selectionRef.current = selection
  }, [selection])

  const resetSelection = useCallback(() => {
    setSelection(INITIAL_SELECTION)
    setPreviewEvent(null)
    // Reset drag completion flag
    dragCompletedRef.current = false
  }, [])

  const handleSlotMouseDown = useCallback((date: Date, intervalIndex: number) => {
    console.log('[MOUSEDOWN] Starting drag on', date.toDateString(), 'interval', intervalIndex)
    setSelection({
      isDragging: true,
      date,
      startIndex: intervalIndex,
      currentIndex: intervalIndex,
    })
  }, [])

  const handleSlotMouseEnter = useCallback((date: Date, intervalIndex: number) => {
    setSelection((prev) => {
      if (!prev.isDragging || !prev.date || !isSameDay(prev.date, date)) {
        return prev
      }

      if (prev.currentIndex === intervalIndex) {
        return prev
      }

      return {
        ...prev,
        currentIndex: intervalIndex,
      }
    })
  }, [])

  const isSlotSelected = useCallback(
    (date: Date, intervalIndex: number) => {
      if (!selection.isDragging || !selection.date) return false
      if (!isSameDay(selection.date, date)) return false

      const { startIndex, currentIndex } = selection
      if (startIndex === null || currentIndex === null) return false

      const min = Math.min(startIndex, currentIndex)
      const max = Math.max(startIndex, currentIndex)

      return intervalIndex >= min && intervalIndex <= max
    },
    [selection]
  )

  useEffect(() => {
    if (
      !selection.isDragging ||
      !selection.date ||
      selection.startIndex === null ||
      selection.currentIndex === null
    ) {
      setPreviewEvent(null)
      return
    }

    const { start, end } = getIntervalRange(
      selection.date,
      selection.startIndex,
      selection.currentIndex
    )

    setPreviewEvent({
      id: 'preview-temp',
      title: 'Available',
      color: 'green',
      start,
      end,
    })
  }, [selection])

  const saveAvailability = useCallback(
    async (date: Date, startIndex: number, currentIndex: number) => {
      // CRITICAL: Atomic lock check and set
      if (saveInProgressRef.current) {
        console.log('🚫 [BLOCKED] Save already in progress')
        return
      }

      console.log('🔒 [LOCK] Acquiring save lock')
      // Set lock BEFORE any async work
      saveInProgressRef.current = true

      const { start, end } = getIntervalRange(date, startIndex, currentIndex)

      const tempEvent: CalendarEvent = {
        id: `temp-${Date.now()}`,
        title: 'Available',
        color: 'green',
        start,
        end,
      }

      // Optimistic update
      const optimisticEvents = [...eventsRef.current, tempEvent]
      setEvents(optimisticEvents)

      const payload = calendarEventToAvailability(
        tempEvent,
        session?.user?.id || '',
        session?.user?.schoolId || ''
      )

      try {
        console.log('🌐 [API] Calling POST /api/teacher-availability')
        const response = await fetch('/api/teacher-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Failed to add availability' }))
          setEvents(eventsRef.current.filter((event) => event.id !== tempEvent.id))
          toast.error(error.error || 'Failed to add availability')
          return
        }

        const savedSlot = await response.json()
        console.log('✅ [API] Success - ID:', savedSlot.id)

        const persistedEvents = eventsRef.current.map((event) =>
          event.id === tempEvent.id ? { ...tempEvent, id: savedSlot.id } : event
        )

        setEvents(persistedEvents)
        toast.success('Availability added')
      } catch (error) {
        console.error('❌ [API] Error:', error)
        setEvents(eventsRef.current.filter((event) => event.id !== tempEvent.id))
        toast.error('An error occurred')
      } finally {
        console.log('🔓 [UNLOCK] Releasing save lock')
        saveInProgressRef.current = false
      }
    },
    [session?.user?.id, session?.user?.schoolId, setEvents]
  )

  // GLOBAL MOUSEUP HANDLER - attached once and handles all drag completions
  useEffect(() => {
    if (!selection.isDragging) return

    const globalMouseUpHandler = () => {
      // CRITICAL: Check if this drag was already processed
      if (dragCompletedRef.current) {
        console.log('🚫 [BLOCKED] Drag already processed')
        return
      }

      console.log('🖱️ [MOUSEUP] Drag completed!')
      dragCompletedRef.current = true // Mark as processed

      // Get current selection values from refs (no stale closures!)
      const currentSelection = selectionRef.current
      if (currentSelection.date && currentSelection.startIndex !== null && currentSelection.currentIndex !== null) {
        const { start, end } = getIntervalRange(
          currentSelection.date,
          currentSelection.startIndex,
          currentSelection.currentIndex
        )

        console.log('📅 [SELECTION] Date:', currentSelection.date.toDateString())
        console.log('⏰ [SELECTION] Start:', start.toTimeString())
        console.log('⏰ [SELECTION] End:', end.toTimeString())
        console.log('🔢 [SELECTION] Intervals:', currentSelection.startIndex, 'to', currentSelection.currentIndex)

        // Save with current values
        saveAvailability(currentSelection.date, currentSelection.startIndex, currentSelection.currentIndex)
      }

      // Reset selection
      resetSelection()
    }

    console.log('🎯 [LISTENER] Adding global mouseup listener')
    document.addEventListener('mouseup', globalMouseUpHandler, { once: true })

    return () => {
      console.log('🧹 [LISTENER] Removing global mouseup listener')
      document.removeEventListener('mouseup', globalMouseUpHandler)
    }
  }, [selection.isDragging, saveAvailability, resetSelection]) // selection removed from deps - using selectionRef for current values

  const value = useMemo<CalendarDragContextValue>(
    () => ({
      isDragging: selection.isDragging,
      activeDate: selection.date,
      previewEvent,
      handleSlotMouseDown,
      handleSlotMouseEnter,
      isSlotSelected,
    }),
    [selection.isDragging, selection.date, previewEvent, handleSlotMouseDown, handleSlotMouseEnter, isSlotSelected]
  )

  return (
    <CalendarDragContext.Provider value={value}>
      {children}
    </CalendarDragContext.Provider>
  )
}

export const useCalendarDrag = () => {
  const context = useContext(CalendarDragContext)
  if (!context) {
    throw new Error('useCalendarDrag must be used within CalendarDragManager')
  }
  return context
}

