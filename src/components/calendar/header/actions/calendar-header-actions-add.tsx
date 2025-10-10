import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useCalendarContext } from '../../calendar-context'
import { useGlobalSaving } from '@/lib/global-saving-context'

export default function CalendarHeaderActionsAdd() {
  const { setNewEventDialogOpen } = useCalendarContext()
  const { isSaving } = useGlobalSaving()

  return (
    <Button
      className="flex items-center gap-1 bg-primary text-background"
      onClick={() => setNewEventDialogOpen(true)}
      disabled={isSaving}
    >
      <Plus />
      Add Availability
    </Button>
  )
}
