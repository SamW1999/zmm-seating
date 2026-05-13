/**
 * Pure Canvas 2D export — no html2canvas, no DOM screenshot.
 * Draws a clean seating chart for PNG / PDF export.
 */
import { Table } from './types'

// ─── helpers ────────────────────────────────────────────────────────────────

function toRoman(n: number): string {
  const nums = [
    'I','II','III','IV','V','VI','VII','VIII','IX','X',
    'XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX',
  ]
  return nums[n - 1] ?? `${n}`
}

function formatName(name: string | null | undefined): string {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  return `${parts[0][0].toUpperCase()}. ${parts.slice(1).join(' ')}`
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

/** Truncate text to fit within maxWidth at the current font. */
function truncate(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}

/**
 * Draw text wrapped to multiple lines, auto-scaling font down if needed.
 * startFontSize is the preferred size; tries smaller (8px, 7px) if text
 * overflows 2 lines. At 7px allows up to 3 lines. Never truncates.
 */
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,    // horizontal center
  boxTop: number,
  boxH: number,
  maxWidth: number,
  startFontSize: number,
): void {
  const sizes = startFontSize >= 9 ? [9, 8, 7] : startFontSize === 8 ? [8, 7] : [7]

  for (const fontSize of sizes) {
    ctx.font = `bold ${fontSize}px Arial, sans-serif`
    const lineH = fontSize + 2
    const words = text.split(' ')
    const lines: string[] = []
    let cur = ''
    for (const word of words) {
      const test = cur ? cur + ' ' + word : word
      if (ctx.measureText(test).width <= maxWidth) { cur = test }
      else { if (cur) lines.push(cur); cur = word }
    }
    if (cur) lines.push(cur)

    const maxLines = fontSize <= 7 ? 3 : 2
    if (lines.length <= maxLines) {
      const totalH = lines.length * lineH
      const startY = boxTop + (boxH - totalH) / 2 + fontSize
      lines.forEach((line, li) => ctx.fillText(line, cx, startY + li * lineH))
      return
    }
  }

  // Absolute fallback: 7px, up to 3 lines (words that are too long still fit in one box)
  ctx.font = 'bold 7px Arial, sans-serif'
  const lineH = 9
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const word of words) {
    const test = cur ? cur + ' ' + word : word
    if (ctx.measureText(test).width <= maxWidth) { cur = test }
    else { if (cur) lines.push(cur); cur = word }
  }
  if (cur) lines.push(cur)
  const shown = lines.slice(0, 3)
  const totalH = shown.length * lineH
  const startY = boxTop + (boxH - totalH) / 2 + 7
  shown.forEach((line, li) => ctx.fillText(line, cx, startY + li * lineH))
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// ─── main export ────────────────────────────────────────────────────────────

export async function buildExportCanvas(tables: Table[], label?: string): Promise<HTMLCanvasElement> {
  const BASE_ROWS = ['A', 'B', 'C', 'D', 'E', 'F']
  const BASE_COLS = [1, 2, 3, 4, 5]
  const rows = [...new Set([...BASE_ROWS, ...tables.map(t => t.row)])].sort()
  const cols = [...new Set([...BASE_COLS, ...tables.map(t => t.col)])].sort((a, b) => a - b)

  // ── layout constants ──
  const SCALE     = 2     // hi-dpi
  const MARGIN    = 48
  const LOGO_H    = 96    // cropped logo height (logical px)
  const TITLE_H   = LOGO_H + 52  // logo + "ZMM Seating Chart" + date + spacing
  const WALL_H    = 64
  const COL_HDR_H = 24
  const ROW_LBL_W = 36
  const TW        = 300   // table box width — matches screen TABLE_W
  const TH        = 88    // table box height — matches screen TABLE_H
  const GAP       = 12

  const gridW = ROW_LBL_W + cols.length * (TW + GAP) - GAP
  const gridH = COL_HDR_H + rows.length * (TH + GAP) - GAP
  const W = MARGIN * 2 + gridW
  const H = MARGIN + TITLE_H + WALL_H + gridH + MARGIN

  const canvas = document.createElement('canvas')
  canvas.width  = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  // ── background ──
  ctx.fillStyle = '#F2EDE3'
  ctx.fillRect(0, 0, W, H)

  // ── logo ──
  try {
    const logo   = await loadImage('/zmm-logo.jpg')
    const cropH  = logo.naturalHeight * 0.72   // show flame + Hebrew name only
    const logoW  = 240
    const logoH  = Math.round(logoW * cropH / logo.naturalWidth)
    const logoX  = Math.round(W / 2 - logoW / 2)
    const logoY  = MARGIN
    ctx.drawImage(logo, 0, 0, logo.naturalWidth, cropH, logoX, logoY, logoW, logoH)
  } catch {
    // If logo fails to load, fall back to text title only
  }

  // ── title text ──
  const titleY = MARGIN + LOGO_H + 20
  ctx.textAlign = 'center'
  ctx.fillStyle = '#1F2937'
  ctx.font = 'bold 20px Georgia, serif'
  ctx.fillText(label ? `ZMM Seating Chart — ${label}` : 'ZMM Seating Chart', W / 2, titleY)

  // ── front wall ──
  const wallY = MARGIN + TITLE_H
  ctx.fillStyle = '#1C2B4A'
  roundRect(ctx, MARGIN, wallY, gridW, WALL_H - 4, 6)
  ctx.fill()

  // Door
  const doorCX = MARGIN + gridW * 0.34
  ctx.fillStyle = '#3B5078'
  ctx.strokeStyle = '#6A8FBE'
  ctx.lineWidth = 1.5
  roundRect(ctx, doorCX - 18, wallY + 10, 36, 44, 3)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#9BB8D8'
  ctx.font = 'bold 9px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('DOOR', doorCX, wallY + 36)

  // Aron Kodesh
  const aronCX = MARGIN + gridW * 0.55
  const aronW  = 144
  ctx.fillStyle = 'rgba(200,168,48,0.18)'
  ctx.strokeStyle = '#C8A830'
  ctx.lineWidth = 2
  roundRect(ctx, aronCX - aronW / 2, wallY + 7, aronW, WALL_H - 18, 4)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#F5D060'
  ctx.font = 'bold 16px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('ארון קודש', aronCX, wallY + 28)
  ctx.font = 'bold 9px Arial, sans-serif'
  ctx.fillStyle = '#E8C84A'
  ctx.fillText('ARON KODESH', aronCX, wallY + 44)

  // Front label
  ctx.fillStyle = '#4B6A9A'
  ctx.font = '9px Arial, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('▲ FRONT', MARGIN + gridW - 8, wallY + WALL_H / 2 + 3)

  // ── grid ──
  const gx = MARGIN
  const gy = MARGIN + TITLE_H + WALL_H

  const tableMap = new Map<string, Table>()
  for (const t of tables) tableMap.set(`${t.row}-${t.col}`, t)

  // Column headers
  ctx.fillStyle = '#6B7280'
  ctx.font = '10px Arial, sans-serif'
  ctx.textAlign = 'center'
  cols.forEach((col, ci) => {
    const x = gx + ROW_LBL_W + ci * (TW + GAP) + TW / 2
    ctx.fillText(`Col ${toRoman(col)}`, x, gy + 15)
  })

  // Rows
  rows.forEach((row, ri) => {
    const ry = gy + COL_HDR_H + ri * (TH + GAP)

    // Row label
    ctx.fillStyle = '#6B7280'
    ctx.font = '13px Georgia, serif'
    ctx.textAlign = 'right'
    ctx.fillText(row, gx + ROW_LBL_W - 5, ry + TH / 2 + 5)

    cols.forEach((col, ci) => {
      const tx    = gx + ROW_LBL_W + ci * (TW + GAP)
      const table = tableMap.get(`${row}-${col}`)

      // ── empty cell ──
      if (!table) {
        ctx.strokeStyle = '#C8C0A8'
        ctx.lineWidth = 0.8
        ctx.setLineDash([4, 4])
        roundRect(ctx, tx, ry, TW, TH, 4)
        ctx.stroke()
        ctx.setLineDash([])
        return
      }

      // ── bima ──
      if (table.is_bima) {
        ctx.fillStyle = 'rgba(180,140,0,0.10)'
        roundRect(ctx, tx, ry, TW, TH, 4)
        ctx.fill()
        ctx.strokeStyle = '#B8960A'
        ctx.lineWidth = 1.5
        ctx.setLineDash([5, 4])
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = '#92700A'
        ctx.font = 'bold 16px Arial, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('בימה', tx + TW / 2, ry + TH / 2 + 2)
        ctx.font = '9px Arial, sans-serif'
        ctx.fillStyle = '#A08020'
        ctx.fillText('BIMA', tx + TW / 2, ry + TH / 2 + 16)
        return
      }

      // ── regular table ──
      ctx.fillStyle = '#FAFAF5'
      ctx.strokeStyle = '#C8C0A8'
      ctx.lineWidth = 1.5
      ctx.setLineDash([])
      roundRect(ctx, tx, ry, TW, TH, 4)
      ctx.fill()
      ctx.stroke()

      // Header row
      ctx.fillStyle = '#9CA3AF'
      ctx.font = '9px Arial, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`${row}${col}`, tx + 6, ry + 13)
      if (table.label) {
        ctx.textAlign = 'right'
        ctx.fillText(truncate(ctx, table.label, TW - 30), tx + TW - 6, ry + 13)
      }

      // Divider
      ctx.strokeStyle = '#E0D8CC'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(tx + 5, ry + 18)
      ctx.lineTo(tx + TW - 5, ry + 18)
      ctx.stroke()

      const seats = (table.seats ?? []).sort((a, b) => a.position - b.position)

      // Family mode?
      const firstName  = seats[0]?.member_name
      const familyMode =
        seats.length > 0 && !!firstName &&
        seats.every(s => s.member_name === firstName && (s.is_reserved || !!s.member_name))

      const bodyY = ry + 22
      const bodyH = TH - 22   // = 66px

      if (familyMode) {
        ctx.fillStyle = '#1F2937'
        ctx.textAlign = 'center'
        drawWrappedText(ctx, formatName(firstName ?? ''), tx + TW / 2, bodyY, bodyH, TW - 16, 13)
        ctx.fillStyle = '#9CA3AF'
        ctx.font = '9px Arial, sans-serif'
        ctx.fillText(`${seats.length} seats`, tx + TW / 2, bodyY + bodyH / 2 + 16)
      } else if (seats.length > 0) {
        // ── Horizontal seat row ──
        const seatCount = seats.length
        const sidePad   = 6
        const seatGap   = 3
        const seatW_e   = Math.floor((TW - 2 * sidePad - (seatCount - 1) * seatGap) / seatCount)
        const seatH_e   = bodyH - 8   // 4px top + 4px bottom padding
        const seatTop   = bodyY + 4

        seats.forEach((seat, i) => {
          const sx    = tx + sidePad + i * (seatW_e + seatGap)
          const taken = seat.is_reserved || !!seat.member_name

          const nameFontSize = seatCount <= 3 ? 9 : seatCount === 4 ? 8 : 7
          if (taken) {
            ctx.fillStyle = '#EAE4D8'
            roundRect(ctx, sx, seatTop, seatW_e, seatH_e, 2)
            ctx.fill()
            ctx.fillStyle = '#1F2937'
            ctx.textAlign = 'center'
            drawWrappedText(ctx, formatName(seat.member_name), sx + seatW_e / 2, seatTop, seatH_e, seatW_e - 4, nameFontSize)
          } else {
            ctx.fillStyle = '#EDEAE4'
            roundRect(ctx, sx, seatTop, seatW_e, seatH_e, 2)
            ctx.fill()
          }
        })
      }
    })
  })

  return canvas
}
