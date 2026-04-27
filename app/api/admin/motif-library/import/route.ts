import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { mergeImportedItems } from '@/lib/trends/motif-store'
import type { MotifCategory, MotifItem } from '@/lib/trends/motif-library'

/**
 * Parse a minimal CSV. Expected header (case-insensitive):
 *   category,name[,industries][,aliases][,description]
 *
 * `category` and `name` required. `industries` is comma-separated within
 * the cell (so the cell itself must be double-quoted): "tattoo,walkin".
 * `aliases` same shape. Empty industries defaults to "all" via "*".
 *
 * Categories are auto-created when a category label is seen for the first
 * time, slugified into an id.
 */
function parseCsv(text: string): { items: MotifItem[]; categories: MotifCategory[]; errors: string[] } {
  const errors: string[] = []
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length === 0) return { items: [], categories: [], errors: ['Empty CSV.'] }

  const rows = lines.map(parseCsvLine)
  const header = rows[0].map(h => h.trim().toLowerCase())
  const idx = (name: string) => header.indexOf(name)
  const cIdx = idx('category')
  const nIdx = idx('name')
  const iIdx = idx('industries')
  const aIdx = idx('aliases')
  const dIdx = idx('description')
  if (cIdx === -1 || nIdx === -1) {
    return { items: [], categories: [], errors: ['Header must include "category" and "name" columns.'] }
  }

  const categoriesById = new Map<string, MotifCategory>()
  const items: MotifItem[] = []
  const seenItemIds = new Set<string>()

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const categoryLabel = (row[cIdx] ?? '').trim()
    const itemLabel = (row[nIdx] ?? '').trim()
    if (!categoryLabel || !itemLabel) {
      errors.push(`Row ${r + 1}: missing category or name`)
      continue
    }
    const categoryId = slug(categoryLabel)
    if (!categoriesById.has(categoryId)) {
      categoriesById.set(categoryId, { id: categoryId, label: categoryLabel })
    }
    const itemId = slug(itemLabel)
    if (seenItemIds.has(itemId)) {
      errors.push(`Row ${r + 1}: duplicate item id "${itemId}"`)
      continue
    }
    seenItemIds.add(itemId)

    const industriesRaw = iIdx >= 0 ? (row[iIdx] ?? '').trim() : ''
    const industries = industriesRaw
      ? industriesRaw.split(',').map(s => s.trim()).filter(Boolean)
      : ['*']

    const aliasesRaw = aIdx >= 0 ? (row[aIdx] ?? '').trim() : ''
    const aliases = aliasesRaw
      ? aliasesRaw.split(',').map(s => s.trim()).filter(Boolean)
      : undefined

    const description = dIdx >= 0 ? (row[dIdx] ?? '').trim() || undefined : undefined

    items.push({ id: itemId, label: itemLabel, categoryId, industries, aliases, description })
  }

  return { items, categories: Array.from(categoriesById.values()), errors }
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else cur += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',') { out.push(cur); cur = '' }
      else cur += ch
    }
  }
  out.push(cur)
  return out
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  let csv: string | null = null
  const contentType = req.headers.get('content-type') ?? ''
  try {
    if (contentType.startsWith('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('file')
      if (file instanceof File) csv = await file.text()
    } else {
      const body = await req.json().catch(() => null)
      if (body && typeof body === 'object' && typeof (body as Record<string, unknown>).csv === 'string') {
        csv = (body as Record<string, unknown>).csv as string
      }
    }
  } catch {
    return NextResponse.json({ error: 'Could not read uploaded CSV.' }, { status: 400 })
  }
  if (!csv) return NextResponse.json({ error: 'No CSV provided.' }, { status: 400 })

  const { items, categories, errors } = parseCsv(csv)
  if (items.length === 0) {
    return NextResponse.json({ error: 'CSV had no usable rows.', errors }, { status: 400 })
  }

  let library
  try {
    library = await mergeImportedItems(items, categories)
  } catch (e) {
    console.error('motif import error:', e)
    return NextResponse.json({ error: 'Failed to persist library.' }, { status: 500 })
  }

  return NextResponse.json({
    library,
    addedItems: items.length,
    addedCategories: categories.length,
    parseErrors: errors,
  })
}
