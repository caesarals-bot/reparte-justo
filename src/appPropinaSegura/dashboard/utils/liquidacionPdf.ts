// Dynamic import para pdf-lib - solo se carga cuando se necesita generar PDF
import type { LiquidacionGeneralExpenseSummary, LiquidacionMemberSummary } from "./closureCalculations"

type LiquidacionTotalsSnapshot = {
    totalNetAfterDeductions: number
    totalDeductions: number
    totalPropinas: number
    totalTransbank: number
    totalGeneralExpense: number
    totalKitchen: number
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
    // Dynamic import de pdf-lib solo cuando se necesita generar PDF
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
    
    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage()

    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    // Colores de marca
    const primaryColor = { r: 0.07, g: 0.09, b: 0.16 } // Azul oscuro (#151829)
    const accentColor = { r: 0.1, g: 0.46, b: 0.82 } // Azul primario
    const lightGray = { r: 0.9, g: 0.9, b: 0.9 }
    const mutedColor = { r: 0.6, g: 0.6, b: 0.6 }

    const margin = 50
    const lineSpacing = 4
    const pageWidth = page.getWidth()
    const pageHeight = page.getHeight()
    let cursorY = pageHeight - margin

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

    const sanitizeText = (text: string): string => {
        // Reemplazar caracteres Unicode no compatibles con WinAnsi
        return text
            // Eliminar emojis y símbolos unicode
            .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
            .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
            .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
            .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // Alchemical Symbols
            .replace(/[\u{1F780}-\u{1F7FF}]/gu, '') // Geometric Shapes Extended
            .replace(/[\u{1F800}-\u{1F8FF}]/gu, '') // Supplemental Arrows-C
            .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
            .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
            .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
            .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc Symbols
            .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
            .replace(/[\u{1F000}-\u{1F0FF}]/gu, '') // Mahjong Tiles
            .replace(/[\u{1F100}-\u{1F1FF}]/gu, '') // Enclosed Alphanumeric Supplement
            // Reemplazar con equivalentes ASCII comunes
            .replace(/[💰]/g, '$')     // Money bag
            .replace(/[📋]/g, '=')     // Clipboard
            .replace(/[👥]/g, '=')     // Group
            .replace(/[✓]/g, '✓')     // Check (compatible)
            .replace(/[✗]/g, 'X')      // X mark
            .replace(/[→]/g, '->')     // Arrow
            .replace(/[←]/g, '<-')     // Arrow
            .replace(/[↑]/g, '^')      // Arrow
            .replace(/[↓]/g, 'v')      // Arrow
            .trim()
    }

    const drawText = (
        text: string,
        options: { size?: number; font?: typeof regularFont; color?: { r: number; g: number; b: number } } = {},
    ) => {
        const { size = 11, font = regularFont, color = { r: 0, g: 0, b: 0 } } = options
        const sanitizedText = sanitizeText(text)
        ensureSpace(1, size)
        page.drawText(sanitizedText, {
            x: margin,
            y: cursorY,
            size,
            font,
            color: rgb(color.r, color.g, color.b),
        })
        cursorY -= size + lineSpacing
    }


    // Header con fondo de marca
    page.drawRectangle({
        x: 0,
        y: pageHeight - 110,
        width: pageWidth,
        height: 110,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    })
    
    // Centrar texto del header
    const headerCenterX = pageWidth / 2
    
    page.drawText("ReparteJusto", {
        x: headerCenterX - 45, // Centrar aproximadamente
        y: pageHeight - 75,
        size: 24,
        font: boldFont,
        color: rgb(accentColor.r, accentColor.g, accentColor.b),
    })
    
    page.drawText("Sistema de Liquidación de Propinas", {
        x: headerCenterX - 100, // Centrar aproximadamente
        y: pageHeight - 95,
        size: 14,
        font: boldFont,
        color: rgb(1, 1, 1),
    })
    
    page.drawText(`Generado el ${generatedAt.toLocaleString("es-CL")}`, {
        x: margin,
        y: pageHeight - 120,
        size: 10,
        font: regularFont,
        color: rgb(0.8, 0.8, 0.8),
    })
    
    cursorY = pageHeight - 140
    
    drawText("Resumen de liquidación", { font: boldFont, size: 18 })
    drawText(`Rango seleccionado: ${rangeLabel}`, { font: boldFont, size: 12 })
    drawText(`Cierres incluidos: ${closureCount}`, { size: 11 })

    if (responsibleName || contactEmail) {
        const contactLabel = responsibleName ? `${responsibleName}${contactEmail ? ` • ${contactEmail}` : ""}` : contactEmail
        drawText(`Contacto informado: ${contactLabel ?? "Sin registro"}`, { size: 11 })
    }

    // Tarjeta de totales con diseño mejorado
    ensureSpace(1, 20)
    const cardWidth = pageWidth - margin * 2
    const cardHeight = 120
    const cardY = cursorY - 10
    
    page.drawRectangle({
        x: margin,
        y: cardY - cardHeight,
        width: cardWidth,
        height: cardHeight,
        color: rgb(0.98, 0.98, 0.98),
        borderColor: rgb(lightGray.r, lightGray.g, lightGray.b),
        borderWidth: 1,
    })
    
    cursorY = cardY - 20
    drawText("$ Totales del Período", { font: boldFont, size: 14, color: primaryColor })
    
    const totalsData = [
        { label: "Netos a pagar", value: formatCurrency(totals.totalNetAfterDeductions), highlight: true },
        { label: "Propinas generadas", value: formatCurrency(totals.totalPropinas) },
        { label: "Descuentos globales", value: formatCurrency(totals.totalDeductions) },
        { label: "Gasto general", value: formatCurrency(totals.totalGeneralExpense) },
        { label: "Transbank", value: formatCurrency(totals.totalTransbank) },
        { label: "Total cocina", value: formatCurrency(totals.totalKitchen) },
    ]
    
    // Layout en 2 columnas con mejor espaciado
    const columnWidth = cardWidth / 2
    const itemSpacing = 30
    const columnPadding = 20
    let leftColY = cursorY
    let rightColY = cursorY
    
    totalsData.forEach((item, index) => {
        const isLeft = index % 2 === 0
        const xPos = isLeft ? margin + columnPadding : margin + columnWidth + columnPadding
        const yPos = isLeft ? leftColY : rightColY
        
        if (item.highlight) {
            // Sin resaltado - solo texto normal
            page.drawText(item.label, {
                x: xPos,
                y: yPos,
                size: 11,
                font: boldFont,
                color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
            })
            page.drawText(item.value, {
                x: xPos,
                y: yPos - 16,
                size: 12,
                font: boldFont,
                color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
            })
        } else {
            page.drawText(item.label, {
                x: xPos,
                y: yPos,
                size: 9,
                font: regularFont,
                color: rgb(mutedColor.r, mutedColor.g, mutedColor.b),
            })
            page.drawText(item.value, {
                x: xPos,
                y: yPos - 14,
                size: 10,
                font: boldFont,
                color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
            })
        }
        
        if (isLeft) {
            leftColY -= itemSpacing
        } else {
            rightColY -= itemSpacing
        }
    })
    
    cursorY = Math.min(leftColY, rightColY) - 20

    // Sección de gastos generales con diseño
    ensureSpace(1, 20)
    drawText("📋 Gastos Generales", { font: boldFont, size: 14, color: primaryColor })

    if (!generalExpenses.length) {
        drawText("No se registraron gastos generales en el rango seleccionado.", { 
            size: 10, 
            color: mutedColor 
        })
    } else {
        generalExpenses.forEach((expense, index) => {
            ensureSpace(3, 12)
            
            // Línea separadora sutil
            if (index > 0) {
                page.drawLine({
                    start: { x: margin + 20, y: cursorY + 5 },
                    end: { x: pageWidth - margin - 20, y: cursorY + 5 },
                    thickness: 0.3,
                    color: rgb(lightGray.r, lightGray.g, lightGray.b),
                })
            }
            
            drawText(`${index + 1}. ${expense.nombre}${expense.tipo ? ` • ${expense.tipo}` : ""}`, { 
                font: boldFont, 
                size: 11,
                color: primaryColor
            })
            drawText(`Monto: ${formatCurrency(expense.total)}`, { 
                size: 10,
                color: accentColor
            })
            cursorY -= lineSpacing
        })
    }

    // Sección de integrantes con diseño mejorado
    ensureSpace(1, 20)
    drawText("👥 Integrantes del Equipo", { font: boldFont, size: 14, color: primaryColor })

    if (!members.length) {
        drawText("No hay integrantes con montos pendientes en el rango seleccionado.", { 
            size: 10, 
            color: mutedColor 
        })
    } else {
        members.forEach((member, index) => {
            ensureSpace(5, 12)
            
            // Línea separadora
            if (index > 0) {
                page.drawLine({
                    start: { x: margin, y: cursorY + 8 },
                    end: { x: pageWidth - margin, y: cursorY + 8 },
                    thickness: 0.5,
                    color: rgb(lightGray.r, lightGray.g, lightGray.b),
                })
            }
            
            // Sin tarjeta - solo contenido centrado
            cursorY -= 10
            
            // Nombre del integrante centrado
            const memberName = `${index + 1}. ${member.nombre}${member.role ? ` (${member.role})` : ""}`
            const nameWidth = boldFont.widthOfTextAtSize(memberName, 12)
            const nameX = (pageWidth - nameWidth) / 2
            
            page.drawText(memberName, {
                x: nameX,
                y: cursorY,
                size: 12,
                font: boldFont,
                color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
            })
            
            cursorY -= 15
            
            // Email centrado
            const emailText = `Email: ${member.email ?? "—"}`
            const emailWidth = regularFont.widthOfTextAtSize(emailText, 9)
            const emailX = (pageWidth - emailWidth) / 2
            
            page.drawText(emailText, {
                x: emailX,
                y: cursorY,
                size: 9,
                font: regularFont,
                color: rgb(mutedColor.r, mutedColor.g, mutedColor.b),
            })
            
            cursorY -= 20
            
            // Datos financieros centrados en 2 columnas
            const financialData = [
                { label: "Neto", value: formatCurrency(member.totalNeto) },
                { label: "Penalizaciones", value: formatCurrency(member.totalPenalizaciones) },
                { label: "Deducciones", value: formatCurrency(member.totalDeducciones) },
                { label: "Ajustes", value: formatCurrency(member.totalAjustes) },
            ]
            
            const colWidth = pageWidth / 2
            const itemSpacing = 18
            let leftY = cursorY
            let rightY = cursorY
            
            financialData.forEach((item, idx) => {
                const isLeft = idx % 2 === 0
                const xPos = isLeft ? margin + colWidth/2 - 60 : margin + colWidth + colWidth/2 - 60
                const yPos = isLeft ? leftY : rightY
                
                // Etiqueta centrada en su columna
                const labelWidth = regularFont.widthOfTextAtSize(`${item.label}:`, 8)
                const labelX = xPos + (120 - labelWidth) / 2
                
                page.drawText(`${item.label}:`, {
                    x: labelX,
                    y: yPos,
                    size: 8,
                    font: regularFont,
                    color: rgb(mutedColor.r, mutedColor.g, mutedColor.b),
                })
                
                // Valor centrado debajo de la etiqueta
                const valueWidth = boldFont.widthOfTextAtSize(item.value, 9)
                const valueX = xPos + (120 - valueWidth) / 2
                
                page.drawText(item.value, {
                    x: valueX,
                    y: yPos - 12,
                    size: 9,
                    font: boldFont,
                    color: rgb(accentColor.r, accentColor.g, accentColor.b),
                })
                
                if (isLeft) {
                    leftY -= itemSpacing
                } else {
                    rightY -= itemSpacing
                }
            })
            
            cursorY = Math.min(leftY, rightY) - 20
        })
    }
    
    // Línea final
    page.drawLine({
        start: { x: margin, y: cursorY },
        end: { x: pageWidth - margin, y: cursorY },
        thickness: 1,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    })
    
    cursorY -= 15
    drawText("Este documento es un resumen oficial de liquidación de propinas conforme a la Ley 20.549.", {
        size: 8,
        color: mutedColor,
    })
    
    if (responsibleName || contactEmail) {
        const contactLabel = responsibleName ? `${responsibleName}${contactEmail ? ` • ${contactEmail}` : ""}` : contactEmail
        drawText(`Contacto responsable: ${contactLabel ?? "Sin registro"}`, { 
            size: 8, 
            color: mutedColor 
        })
    }
    
    drawText(`Generado por ReparteJusto • ${generatedAt.toLocaleDateString("es-CL")} ${generatedAt.toLocaleTimeString("es-CL")}`, {
        size: 7,
        color: { r: 0.5, g: 0.5, b: 0.5 },
    })
    
    return pdfDoc.save()
}
