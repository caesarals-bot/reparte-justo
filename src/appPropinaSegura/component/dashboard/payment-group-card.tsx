import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { UsersIcon, AlertCircleIcon } from "lucide-react"
import type { DashboardPaymentGroup } from "@/data/dashboard"

type PaymentGroupCardProps = {
  group: DashboardPaymentGroup
}

export function PaymentGroupCard({ group }: PaymentGroupCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <UsersIcon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">{group.groupName}</CardTitle>
              <CardDescription className="mt-0.5 text-xs">{group.description}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="mb-4 rounded-lg bg-muted/50 p-3">
          <div className="text-xs text-muted-foreground">Total del Grupo</div>
          <div className="mt-1 text-2xl font-bold tracking-tight">${group.totalAmount.toLocaleString("es-CL")}</div>
        </div>

        <div className="space-y-2.5">
          <div className="text-xs font-medium text-muted-foreground">Desglose por Miembro</div>
          {group.breakdown.map((member, index) => (
            <div key={member.id}>
              {index > 0 && <Separator className="my-2.5" />}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-pretty">{member.name}</div>
                  {member.totalDescuentos > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
                      <AlertCircleIcon className="h-3 w-3 flex-shrink-0" />
                      <span>Descuentos: ${member.totalDescuentos.toLocaleString("es-CL")}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <Badge variant="secondary" className="font-mono text-xs">
                    ${member.amount.toLocaleString("es-CL")}
                  </Badge>
                  {member.totalDescuentos > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      (bruto: ${(member.amount + member.totalDescuentos).toLocaleString("es-CL")})
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
