import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

import type { LiquidacionGeneralExpenseSummary, LiquidacionMemberSummary } from "./closureCalculations"

type LiquidacionTotalsSnapshot = {
    totalNetAfterDeductions: number
    totalDeductions: number
    totalPropinas: number
    totalTransbank: number
    totalGeneralExpense: number
}

type GenerateLiquidacionPdfArgs = {
    rangeLabel: string
    totals: LiquidacionTotalsSnapshot
    members: LiquidacionMemberSummary[]
    generalExpenses?: LiquidacionGeneralExpenseSummary[]
    closureCount: number
    contactEmail?: string
    responsibleName?: string
    generatedAt?: Date
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(
        Math.round(value),
    )

const sanitizeForFileName = (label: string) =>
    label
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")

export const buildLiquidacionPdfFileName = (rangeLabel: string) => {
    const sanitized = sanitizeForFileName(rangeLabel)

    if (sanitized) {
        return `liquidacion_${sanitized}.pdf`
    }

    const fallback = new Date().toISOString().slice(0, 10)
    return `liquidacion_${fallback}.pdf`
}

export const generateLiquidacionPdf = async ({
    rangeLabel,
    totals,
    members,
    generalExpenses = [],
    closureCount,
    contactEmail,
    responsibleName,
    generatedAt = new Date(),
}: GenerateLiquidacionPdfArgs) => {
    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage()
    const { height } = page.getSize()

    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const margin = 40
    const lineSpacing = 4
    let cursorY = height - margin

    const addPage = () => {
        page = pdfDoc.addPage()
        cursorY = page.getHeight() - margin
    }

    const ensureSpace = (lines = 1, lineHeight = 14) => {
        const needed = lines * lineHeight + lineSpacing
        if (cursorY - needed < margin) {
            addPage()
        }
    }

    const drawText = (
        text: string,
        options: { size?: number; font?: typeof regularFont; color?: { r: number; g: number; b: number } } = {},
    ) => {
        const { size = 11, font = regularFont, color = { r: 0, g: 0, b: 0 } } = options
        ensureSpace(1, size)
        page.drawText(text, {
            x: margin,
            y: cursorY,
            size,
            font,
            color: rgb(color.r, color.g, color.b),
        })
        cursorY -= size + lineSpacing
    }

    const divider = () => {
        ensureSpace(1, 2)
        page.drawLine({
            start: { x: margin, y: cursorY },
            end: { x: page.getWidth() - margin, y: cursorY },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8),
        })
        cursorY -= lineSpacing * 2
    }

    drawText("Resumen de liquidación", { font: boldFont, size: 18 })
    drawText(`Generado el ${generatedAt.toLocaleString("es-CL")}`, { size: 10, color: { r: 0.35, g: 0.35, b: 0.35 } })
    drawText(`Rango seleccionado: ${rangeLabel}`, { font: boldFont, size: 12 })
    drawText(`Cierres incluidos: ${closureCount}`, { size: 11 })

    if (responsibleName || contactEmail) {
        const contactLabel = responsibleName ? `${responsibleName}${contactEmail ? ` • ${contactEmail}` : ""}` : contactEmail
        drawText(`Contacto informado: ${contactLabel ?? "Sin registro"}`, { size: 11 })
    }

    divider()

    drawText("Totales", { font: boldFont, size: 14 })
    drawText(`Netos a pagar: ${formatCurrency(totals.totalNetAfterDeductions)}`)
    drawText(`Propinas generadas: ${formatCurrency(totals.totalPropinas)}`)
    drawText(`Descuentos globales: ${formatCurrency(totals.totalDeductions)}`)
    drawText(`Gasto general: ${formatCurrency(totals.totalGeneralExpense)}`)
    drawText(`Transbank: ${formatCurrency(totals.totalTransbank)}`)

    divider()

    drawText("Gastos generales", { font: boldFont, size: 14 })

    if (!generalExpenses.length) {
        drawText("No se registraron gastos generales en el rango seleccionado.")
    } else {
        generalExpenses.forEach((expense, index) => {
            drawText(`${index + 1}. ${expense.nombre}${expense.tipo ? ` • ${expense.tipo}` : ""}`, { font: boldFont })
            drawText(`Monto: ${formatCurrency(expense.total)}`, { size: 10 })
            cursorY -= lineSpacing
        })
    }

    divider()

    drawText("Integrantes", { font: boldFont, size: 14 })

    if (!members.length) {
        drawText("No hay integrantes con montos pendientes en el rango seleccionado.")
    } else {
        members.forEach((member, index) => {
            drawText(`${index + 1}. ${member.nombre}${member.role ? ` (${member.role})` : ""}`, {
                font: boldFont,
            })
            drawText(`Email: ${member.email ?? "—"}`, { size: 10 })
            drawText(
                `Neto: ${formatCurrency(member.totalNeto)} • Penalizaciones: ${formatCurrency(member.totalPenalizaciones)}`,
                { size: 10 },
            )
            drawText(
                `Deducciones: ${formatCurrency(member.totalDeducciones)} • Ajustes: ${formatCurrency(member.totalAjustes)}`,
                { size: 10 },
            )
            cursorY -= lineSpacing
        })
    }

    return pdfDoc.save()
}
