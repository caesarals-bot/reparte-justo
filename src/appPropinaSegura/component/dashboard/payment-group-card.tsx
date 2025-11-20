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
  const cardClassName = (
    variant === "compact"
      ? "flex flex-col max-w-sm bg-[rgba(24,27,45,0.9)]"
      : "flex flex-col bg-[rgba(24,27,45,0.9)]"
  ) +
    " border border-white/10 shadow-[0_25px_60px_rgba(4,7,26,0.55)] backdrop-blur-xl"

  return (
    <Card className={cardClassName}>
      <CardHeader className="pb-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-accent/30 text-primary shadow-inner shadow-primary/20">
              <UsersIcon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-white">{group.groupName}</CardTitle>
              <CardDescription className="mt-0.5 text-xs text-white/60">{group.description}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4 text-white shadow-inner shadow-black/30">
          <div className="text-xs uppercase tracking-[0.25em] text-white/60">Total del Grupo</div>
          <div
            className={`mt-2 text-3xl font-semibold tracking-tight ${
              isDeductionGroup ? "text-destructive" : "text-white"
            }`}
          >
            {isDeductionGroup ? `-$${group.totalAmount.toLocaleString("es-CL")}` : `$${group.totalAmount.toLocaleString("es-CL")}`}
          </div>
        </div>

        {/* Vista compacta tipo tabla para grupos de deducción */}
        {isDeductionGroup && variant === "compact" ? (
          <div className="space-y-2 text-xs text-white/80">
            <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-medium text-white/60">
              <span className="flex-1">Detalle</span>
              <span className="w-20 text-right">Monto</span>
            </div>
            <Separator className="mb-1 border-white/10" />
            <div className="space-y-1.5">
              {group.breakdown.map((member) => (
                <div key={member.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">{member.name}</div>
                    {member.deductionLabel ? (
                      <div className="truncate text-[11px] text-white/60">
                        {member.deductionLabel}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <Badge
                      variant="outline"
                      className="border-destructive/60 bg-destructive/10 font-mono text-[11px] text-destructive"
                    >
                      -${member.amount.toLocaleString("es-CL")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`space-y-3 ${variant === "compact" ? "text-sm" : ""}`}>
            <div className="text-xs font-medium uppercase tracking-[0.35em] text-white/60">
              {isDeductionGroup ? "Detalle" : "Desglose por integrante"}
            </div>
            {group.breakdown.map((member, index) => (
              <div key={member.id}>
                {index > 0 && variant !== "compact" && <Separator className="my-2.5 border-white/10" />}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-pretty text-white">{member.name}</div>
                    {member.totalDescuentos > 0 && !isDeductionGroup && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
                        <AlertCircleIcon className="h-3 w-3 shrink-0" />
                        <span>Descuentos: ${member.totalDescuentos.toLocaleString("es-CL")}</span>
                      </div>
                    )}
                    {isDeductionGroup && member.deductionLabel ? (
                      <div className="mt-1 text-xs text-white/60">{member.deductionLabel}</div>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant={isDeductionGroup ? "outline" : "secondary"}
                      className={
                        "font-mono text-xs" +
                        (isDeductionGroup
                          ? " text-destructive border-destructive/60 bg-destructive/10"
                          : " bg-primary/15 text-primary")
                      }
                    >
                      {isDeductionGroup
                        ? `-$${member.amount.toLocaleString("es-CL")}`
                        : `$${member.amount.toLocaleString("es-CL")}`}
                    </Badge>
                    {!isDeductionGroup && member.totalDescuentos > 0 && (
                      <span className="text-[10px] text-white/60">
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
