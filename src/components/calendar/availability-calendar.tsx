import type { CalendarProps } from './calendar-types';
import CalendarHeader from './header/calendar-header';
import CalendarBody from './body/calendar-body';
import CalendarHeaderActions from './header/actions/calendar-header-actions';
import CalendarHeaderDate from './header/date/calendar-header-date';
import CalendarHeaderActionsMode from './header/actions/calendar-header-actions-mode';
import CalendarHeaderActionsAdd from './header/actions/calendar-header-actions-add';
import CalendarHeaderActionsTemplates from './header/actions/calendar-header-actions-templates';
import CalendarProvider from './calendar-provider';
import CalendarAvailabilityNewDialog from './dialog/calendar-availability-new-dialog';
import CalendarAvailabilityManageDialog from './dialog/calendar-availability-manage-dialog';

export default function AvailabilityCalendar({
  events,
  setEvents,
  mode,
  setMode,
  date,
  setDate,
  calendarIconIsToday = false,
}: CalendarProps) {
  return (
    <CalendarProvider
      events={events}
      setEvents={setEvents}
      mode={mode}
      setMode={setMode}
      date={date}
      setDate={setDate}
      calendarIconIsToday={calendarIconIsToday}
    >
      <CalendarHeader>
        <CalendarHeaderDate />
        <CalendarHeaderActions>
          <CalendarHeaderActionsTemplates />
          <CalendarHeaderActionsMode />
          <CalendarHeaderActionsAdd />
        </CalendarHeaderActions>
      </CalendarHeader>
      <CalendarBody />
      <CalendarAvailabilityNewDialog />
      <CalendarAvailabilityManageDialog />
    </CalendarProvider>
  );
}

