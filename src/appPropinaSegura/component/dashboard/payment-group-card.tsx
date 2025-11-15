import { Link } from "react-router"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { UsersIcon, AlertCircleIcon } from "lucide-react"
import type { DashboardPaymentGroup } from "@/data/dashboard"

type PaymentGroupCardProps = {
  group: DashboardPaymentGroup
  variant?: "default" | "compact"
}

export function PaymentGroupCard({ group, variant = "default" }: PaymentGroupCardProps) {
  const isDeductionGroup = group.category === "deduction"
  const cardClassName = variant === "compact" ? "flex flex-col max-w-sm" : "flex flex-col"

  return (
    <Card className={cardClassName}>
      <CardHeader className="pb-1">
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
      <CardContent className="flex-1 pt-0">
        <div className="mb-3 rounded-lg bg-muted/50 p-3">
          <div className="text-xs text-muted-foreground">Total del Grupo</div>
          <div className={`mt-1 text-2xl font-bold tracking-tight ${isDeductionGroup ? "text-destructive" : ""}`}>
            {isDeductionGroup ? `-$${group.totalAmount.toLocaleString("es-CL")}` : `$${group.totalAmount.toLocaleString("es-CL")}`}
          </div>
        </div>

        {/* Vista compacta tipo tabla para grupos de deducción */}
        {isDeductionGroup && variant === "compact" ? (
          <div className="space-y-2 text-xs">
            <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
              <span className="flex-1">Detalle</span>
              <span className="w-20 text-right">Monto</span>
            </div>
            <Separator className="mb-1" />
            <div className="space-y-1.5">
              {group.breakdown.map((member) => (
                <div key={member.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{member.name}</div>
                    {member.deductionLabel ? (
                      <div className="text-[11px] text-muted-foreground truncate">
                        {member.deductionLabel}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <Badge
                      variant="outline"
                      className="font-mono text-[11px] text-destructive border-destructive/60 bg-destructive/5"
                    >
                      -${member.amount.toLocaleString("es-CL")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`space-y-2.5 ${variant === "compact" ? "text-sm" : ""}`}>
            <div className="text-xs font-medium text-muted-foreground">
              {isDeductionGroup ? "Detalle" : "Desglose por integrante"}
            </div>
            {group.breakdown.map((member, index) => (
              <div key={member.id}>
                {index > 0 && variant !== "compact" && <Separator className="my-2.5" />}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-pretty">{member.name}</div>
                    {member.totalDescuentos > 0 && !isDeductionGroup && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
                        <AlertCircleIcon className="h-3 w-3 shrink-0" />
                        <span>Descuentos: ${member.totalDescuentos.toLocaleString("es-CL")}</span>
                      </div>
                    )}
                    {isDeductionGroup && member.deductionLabel ? (
                      <div className="mt-1 text-xs text-muted-foreground">{member.deductionLabel}</div>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant={isDeductionGroup ? "outline" : "secondary"}
                      className={
                        "font-mono text-xs" +
                        (isDeductionGroup ? " text-destructive border-destructive/60 bg-destructive/5" : "")
                      }
                    >
                      {isDeductionGroup
                        ? `-$${member.amount.toLocaleString("es-CL")}`
                        : `$${member.amount.toLocaleString("es-CL")}`}
                    </Badge>
                    {!isDeductionGroup && member.totalDescuentos > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        (bruto: ${(member.amount + member.totalDescuentos).toLocaleString("es-CL")})
                      </span>
                    )}
                    {member.link ? (
                      <Link
                        to={member.link}
                        className="text-[11px] font-medium text-primary transition hover:text-primary/80"
                      >
                        Ver detalles
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
