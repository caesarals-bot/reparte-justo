import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CalendarIcon } from "lucide-react"
import CalendarLegend from "./CalendarLegend"

interface ClosureCalendarProps {
    selectedDate: Date | undefined
    onDateSelect: (date: Date | undefined) => void
    calendarModifiers: {
        pendingClosure: Date[]
        settledClosure: Date[]
        latestClosure: Date[]
    }
    calendarModifiersClassNames: {
        pendingClosure: string
        settledClosure: string
        latestClosure: string
    }
    disabledDates: Date[]
    dateLabel: string
    className?: string
}

const calendarModifiersClassNames = {
    pendingClosure:
        "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 data-[selected]:bg-emerald-600 data-[selected]:text-emerald-50",
    settledClosure:
        "bg-muted text-foreground/70 hover:bg-muted data-[selected]:bg-muted data-[selected]:text-foreground",
    latestClosure: "ring-2 ring-primary ring-offset-1",
}

const ClosureCalendar = ({
    selectedDate,
    onDateSelect,
    calendarModifiers,
    disabledDates,
    dateLabel,
    className = "",
}: ClosureCalendarProps) => {
    return (
        <div className={`space-y-2 ${className}`}>
            <Label>Fecha</Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="flex w-full items-center justify-start gap-2 rounded-2xl border-white/20 bg-white/5 px-4 py-3 text-white">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{dateLabel}</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="space-y-2 rounded-2xl border border-white/10 bg-[rgba(12,15,28,0.95)] p-3 text-white" align="start">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={onDateSelect}
                        initialFocus
                        modifiers={calendarModifiers}
                        modifiersClassNames={calendarModifiersClassNames}
                        disabled={disabledDates}
                    />
                    <CalendarLegend />
                </PopoverContent>
            </Popover>
        </div>
    )
}

export default ClosureCalendar
