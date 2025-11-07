"use client"

import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type DateRangePickerProps = {
  dateRange: { from: Date | undefined; to: Date | undefined }
  setDateRange: (range: { from: Date | undefined; to: Date | undefined }) => void
}

export function DateRangePicker({ dateRange, setDateRange }: DateRangePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-start gap-2 text-left font-normal", !dateRange.from && "text-muted-foreground")}
        >
          <CalendarIcon className="h-4 w-4" />
          {dateRange.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, "dd/MM/yyyy", { locale: es })} -{" "}
                {format(dateRange.to, "dd/MM/yyyy", { locale: es })}
              </>
            ) : (
              format(dateRange.from, "dd/MM/yyyy", { locale: es })
            )
          ) : (
            <span>Filtrar por fecha</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={dateRange.from}
          selected={{ from: dateRange.from, to: dateRange.to }}
          onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
          numberOfMonths={2}
          locale={es}
        />
      </PopoverContent>
    </Popover>
  )
}
