import { setHours, setMinutes } from 'date-fns'

export type TimeInterval = {
  hour: number
  minute: number
  index: number
}

const buildTimeIntervals = () => {
  const intervals: TimeInterval[] = []
  let index = 0

  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      intervals.push({ hour, minute, index })
      index++
    }
  }

  return intervals
}

export const TIME_INTERVALS = buildTimeIntervals()

export const getIntervalRange = (date: Date, startIndex: number, endIndex: number) => {
  const normalizedStart = Math.min(startIndex, endIndex)
  const normalizedEnd = Math.max(startIndex, endIndex) + 1

  const startInterval = TIME_INTERVALS[normalizedStart]
  const startTime = setMinutes(setHours(date, startInterval.hour), startInterval.minute)

  if (normalizedEnd >= TIME_INTERVALS.length) {
    const endTime = setMinutes(setHours(date, 23), 59)
    return { start: startTime, end: endTime }
  }

  const endInterval = TIME_INTERVALS[normalizedEnd]
  const endTime = setMinutes(setHours(date, endInterval.hour), endInterval.minute)

  return { start: startTime, end: endTime }
}

