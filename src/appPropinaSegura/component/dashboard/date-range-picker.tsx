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
  highlightedDates?: Date[]
  settledDates?: Date[]
}

export function DateRangePicker({ dateRange, setDateRange, highlightedDates, settledDates }: DateRangePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-11 w-full max-w-md justify-between gap-3 rounded-lg border-2 px-4 text-left text-sm font-semibold shadow-sm sm:w-[360px]",
            dateRange.from
              ? "border-primary/60 bg-primary/15 text-foreground hover:bg-primary/20"
              : "border-muted-foreground/30 bg-muted/30 text-foreground hover:bg-muted/40",
          )}
        >
          <span className="flex items-center gap-2">
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
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wide">
            {dateRange.from ? "Cambiar" : "Elegir"}
          </span>
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
          modifiers={{
            pendingClosure: highlightedDates ?? [],
            settledClosure: settledDates ?? [],
          }}
          disabled={settledDates ?? []}
          modifiersClassNames={{
            pendingClosure:
              "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 data-[selected]:bg-emerald-600 data-[selected]:text-emerald-50",
            settledClosure:
              "bg-muted-foreground/20 text-muted-foreground/70 pointer-events-none line-through",
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
