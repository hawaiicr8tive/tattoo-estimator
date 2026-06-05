'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FusionInput, FusionResult, StyleStrand } from '@/lib/trends/types'
import { fuseStyles } from '@/lib/trends/engine'
import ImageLightbox, { ANALYZE_MODELS, type AnalyzeModelId } from './ImageLightbox'

const RESEARCH_MODELS = [
  { id: 'claude-opus-4-7', label: 'Opus 4.7' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5' },
  { id: 'openrouter/openai/gpt-5', label: 'GPT-5 (OR)' },
  { id: 'openrouter/google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (OR)' },
] as const
type ResearchModelId = (typeof RESEARCH_MODELS)[number]['id']

const IMAGE_MODELS = [
  { id: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2 (Flash)', priceHint: '~$0.07/image · faster' },
  { id: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image', priceHint: '~$0.15/image · higher quality' },
  { id: 'openrouter/openai/gpt-5-image', label: 'GPT-5 Image (OpenRouter)', priceHint: '~$0.08/image · best instruction-following' },
  { id: 'openrouter/recraft/recraft-v3', label: 'Recraft V3 (OpenRouter)', priceHint: '~$0.04/image · illustration / vector style' },
  { id: 'openrouter/recraft/recraft-v4', label: 'Recraft V4 (OpenRouter)', priceHint: '~$0.05/image · 1K · stronger composition + text' },
  { id: 'openrouter/bytedance-seed/seedream-4.5', label: 'Seedream 4.5 (OpenRouter)', priceHint: '~$0.04/image · ByteDance aesthetic' },
  { id: 'openrouter/black-forest-labs/flux.2-max', label: 'FLUX.2 Max (OpenRouter)', priceHint: '~$0.07/MP · best FLUX so far' },
  { id: 'replicate/ideogram-ai/ideogram-v3-turbo', label: 'Ideogram V3 Turbo (Replicate)', priceHint: '~$0.03/image · clean illustration + text · fast' },
  { id: 'replicate/stability-ai/stable-diffusion-3.5-large', label: 'Stable Diffusion 3.5 Large (Replicate)', priceHint: '~$0.04/image · open-source SDXL successor' },
  { id: 'replicate/qwen/qwen-image', label: 'Qwen Image (Replicate)', priceHint: '~$0.02/image · Alibaba aesthetic' },
  { id: 'replicate/nvidia/sana-sprint-1.6b', label: 'NVIDIA SANA-Sprint 1.6B (Replicate)', priceHint: '~$0.01/image · fastest text-to-image' },
] as const
type ImageModelId = (typeof IMAGE_MODELS)[number]['id']

interface FusionImage {
  url: string
  prompt: string
  createdAt: string
  model: string
  chaos?: number
}

interface MotifCategory { id: string; label: string; description?: string }
interface MotifItem { id: string; label: string; categoryId: string; industries: string[] }
interface MotifLibrary { categories: MotifCategory[]; items: MotifItem[] }

interface ChaosCategoryLite { id: string; label: string }
interface ChaosTagLite { id: string; label: string }
interface ChaosPhraseLite {
  id: string
  phrase: string
  description?: string
  categoryId: string
  tagIds?: string[]
}
interface ChaosLibrary {
  categories: ChaosCategoryLite[]
  tags: ChaosTagLite[]
  phrases: ChaosPhraseLite[]
}

interface BatchJobRow {
  id: string
  fusion_entry_id: string
  model: string
  count: number
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'expired'
  error: string | null
  added_image_count: number
  created_at: string
  completed_at: string | null
}

/** Color-palette dropdown options — mirrors the server's COLOR_PALETTES in
 * `lib/trends/fusion-images.ts`. Defined locally so this client component
 * doesn't pull in the server-only `@google/genai` SDK. The server resolves
 * the palette text from the id; the client only needs to know the labels. */
const COLOR_PALETTE_OPTIONS = [
  { id: 'default',          label: 'Default (auto)' },
  { id: 'gamble',           label: '🎲 Random gamble (different per image)' },
  { id: 'mono-black',       label: 'Monochrome black ink' },
  { id: 'american-trad',    label: 'American Traditional' },
  { id: 'sailor-jerry',     label: 'Sailor Jerry' },
  { id: 'neo-traditional',  label: 'Neo-Traditional' },
  { id: 'pastel-watercolor',label: 'Pastel Watercolor' },
  { id: 'black-grey',       label: 'Black & Grey realism' },
  { id: 'neon-cyber',       label: 'Neon Cyberpunk' },
  { id: 'sepia-bone',       label: 'Sepia & Bone' },
  { id: 'muted-vintage',    label: 'Muted Vintage' },
  { id: 'chicano-grey',     label: 'Chicano Grey-Wash' },
  { id: 'red-only',         label: 'Red Single-Accent' },
  { id: 'blue-only',        label: 'Blue Single-Accent' },
  { id: 'gold-leaf',        label: 'Gold Leaf Accent' },
] as const

const BULK_MIN = 1
const BULK_MAX = 50
const BULK_PRICE = {
  'gemini-3-pro-image-preview':     { perImage: 0.075, label: 'Gemini 3 Pro Image' },
  'gemini-3.1-flash-image-preview': { perImage: 0.035, label: 'Nano Banana 2 (Flash)' },
  'openai/gpt-image-1':             { perImage: 0.040, label: 'GPT Image 1 (OpenAI)' },
  'replicate/stability-ai/stable-diffusion-3.5-large': { perImage: 0.040, label: 'SD 3.5 Large (Replicate)' },
} as const
type BulkModelId = keyof typeof BULK_PRICE

function itemAppliesToIndustry(item: MotifItem, industryId: string): boolean {
  return item.industries.includes('*') || item.industries.includes(industryId)
}

interface FusionHistoryEntry {
  id: string
  timestamp: string
  industryId: string
  baseStyleId: string
  blendStyleId: string
  fusionName: string
  model: string
  analysis: string
  visualDescriptor?: string
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number }
  images?: FusionImage[]
}

interface Props {
  styles: StyleStrand[]
  currentYear: number
  industryId: string
}

interface AnalysisState {
  entryId: string
  analysis: string
  visualDescriptor: string
  model: string
  fusionName: string
  baseLabel: string
  blendLabel: string
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number }
  images: FusionImage[]
}

export default function FusionLab({ styles, currentYear, industryId }: Props) {
  const [baseId, setBaseId] = useState(styles[0]?.id ?? '')
  const [blendId, setBlendId] = useState(styles[1]?.id ?? styles[0]?.id ?? '')
  const [blendWeight, setBlendWeight] = useState(45)
  const [socialAccelerant, setSocialAccelerant] = useState(70)
  const [anomaly, setAnomaly] = useState(40)
  const [extraSignal, setExtraSignal] = useState('')
  const [extraSignals, setExtraSignals] = useState<string[]>([])
  const [model, setModel] = useState<ResearchModelId>('claude-opus-4-7')
  const [researching, setResearching] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null)
  const [researchError, setResearchError] = useState<string | null>(null)
  const [imageCount, setImageCount] = useState(4)
  const [imageModel, setImageModel] = useState<ImageModelId>('gemini-3.1-flash-image-preview')
  // Real-time generations are fire-and-forget — we track an in-flight counter
  // instead of a boolean so the user can fire multiple back-to-back without
  // waiting for each to complete. Each call increments/decrements the counter.
  const [inFlightGenerations, setInFlightGenerations] = useState(0)
  const generatingImages = false  // legacy alias used elsewhere; kept for back-compat in the JSX disabled props (now always false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [chaos, setChaos] = useState(0)
  // Bulk batch state — separate from real-time controls.
  const [bulkCount, setBulkCount] = useState(25)
  const [bulkModel, setBulkModel] = useState<BulkModelId>('gemini-3-pro-image-preview')
  const [bulkDirection, setBulkDirection] = useState('')
  // Chaos-phrase library (for the dropdown next to the chaos-direction input).
  const [chaosLibrary, setChaosLibrary] = useState<ChaosLibrary | null>(null)
  const [showPhraseQuickAdd, setShowPhraseQuickAdd] = useState(false)
  const [quickAddPhrase, setQuickAddPhrase] = useState('')
  const [quickAddCategoryId, setQuickAddCategoryId] = useState('')
  const [quickAddNewCategory, setQuickAddNewCategory] = useState('')
  const [quickAddingPhrase, setQuickAddingPhrase] = useState(false)
  const [quickAddPhraseStatus, setQuickAddPhraseStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const [bulkPhraseFilter, setBulkPhraseFilter] = useState('')
  // Flash Designs (real-time) chaos library — independent state so picking a
  // phrase for a real-time generation doesn't overwrite the bulk batch field.
  const [flashDirection, setFlashDirection] = useState('')
  const [flashPhraseFilter, setFlashPhraseFilter] = useState('')
  // Color-palette pickers — id from COLOR_PALETTE_OPTIONS. 'default' means
  // "let the system prompt's black-ink-on-paper default win". 'gamble' tells
  // the server to pick a random palette per image in the batch.
  const [flashColorPalette, setFlashColorPalette] = useState<string>('default')
  const [bulkColorPalette, setBulkColorPalette] = useState<string>('default')
  // Secondary (reverse-engineered) descriptor — populated by GPT-5 Vision
  // analyzing a chosen produced image. When `useSecondary` is on, generation
  // routes use this descriptor instead of the primary visualDescriptor.
  const [secondaryDescriptor, setSecondaryDescriptor] = useState('')
  const [useSecondaryDescriptor, setUseSecondaryDescriptor] = useState(false)
  const [analyzingImageUrl, setAnalyzingImageUrl] = useState<string | null>(null)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [secondarySourceUrl, setSecondarySourceUrl] = useState<string | null>(null)
  // External image analyzer: drop/upload any image and run the same vision
  // analyze flow to seed the secondary descriptor.
  const [externalImageDataUrl, setExternalImageDataUrl] = useState<string | null>(null)
  const [externalImageName, setExternalImageName] = useState<string | null>(null)
  const [externalAnalyzeModel, setExternalAnalyzeModel] = useState<AnalyzeModelId>('anthropic/claude-sonnet-4.6')
  const [externalDragOver, setExternalDragOver] = useState(false)
  // Named prompt drafts — Supabase-backed (shared across devices, persists
  // long-term). Each draft has a short style heading (e.g. "Americana
  // Traditional") and the full descriptor text. Replaces the earlier
  // localStorage-only implementation.
  const [promptDrafts, setPromptDrafts] = useState<Array<{ id: string; name: string; text: string; createdAt: string }>>([])
  const [draftSavedFlash, setDraftSavedFlash] = useState(false)
  const [draftFilter, setDraftFilter] = useState('')
  const [draftsExpanded, setDraftsExpanded] = useState(false)
  // Image favorites — keyed by URL, set membership = is favorite.
  const [favoritedUrls, setFavoritedUrls] = useState<Set<string>>(new Set())
  const [submittingBulk, setSubmittingBulk] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [batchJobs, setBatchJobs] = useState<BatchJobRow[]>([])
  const [pollingBatches, setPollingBatches] = useState(false)
  const [pollSummary, setPollSummary] = useState<string | null>(null)
  const [cancellingBatches, setCancellingBatches] = useState(false)
  // Quick-add for the motif library — one category + comma-separated items.
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newItemsCsv, setNewItemsCsv] = useState('')
  const [addingToLibrary, setAddingToLibrary] = useState(false)
  const [libraryAddStatus, setLibraryAddStatus] = useState<{ ok: boolean; message: string } | null>(null)
  /** Editable copy of the visualDescriptor — synced from analysis on load, then user-mutable. */
  const [editedVisualDescriptor, setEditedVisualDescriptor] = useState('')
  const [history, setHistory] = useState<FusionHistoryEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [library, setLibrary] = useState<MotifLibrary | null>(null)
  const [contentCategoryId, setContentCategoryId] = useState<string>('')
  const [contentItemId, setContentItemId] = useState<string>('')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const base = styles.find(s => s.id === baseId)
  const blend = styles.find(s => s.id === blendId)

  const filteredLibrary = useMemo(() => {
    if (!library) return null
    const items = library.items.filter(i => itemAppliesToIndustry(i, industryId))
    const usedCategoryIds = new Set(items.map(i => i.categoryId))
    const categories = library.categories.filter(c => usedCategoryIds.has(c.id))
    return { categories, items }
  }, [library, industryId])

  // Derived effective ids — when industry changes, stale category/item ids
  // are silently treated as "Auto / N/A" without triggering a state-reset effect.
  const effectiveCategoryId = useMemo(
    () => (filteredLibrary?.categories.some(c => c.id === contentCategoryId) ? contentCategoryId : ''),
    [filteredLibrary, contentCategoryId],
  )
  const effectiveItemId = useMemo(
    () => (
      effectiveCategoryId && filteredLibrary?.items.some(i => i.id === contentItemId && i.categoryId === effectiveCategoryId)
        ? contentItemId
        : ''
    ),
    [filteredLibrary, contentItemId, effectiveCategoryId],
  )

  const itemsInSelectedCategory = useMemo(() => {
    if (!filteredLibrary || !effectiveCategoryId) return []
    return filteredLibrary.items.filter(i => i.categoryId === effectiveCategoryId)
  }, [filteredLibrary, effectiveCategoryId])

  const selectedContent = useMemo(() => {
    if (!filteredLibrary || !effectiveItemId) return null
    const item = filteredLibrary.items.find(i => i.id === effectiveItemId)
    if (!item) return null
    const cat = filteredLibrary.categories.find(c => c.id === item.categoryId)
    return { itemLabel: item.label, categoryLabel: cat?.label ?? item.categoryId }
  }, [filteredLibrary, effectiveItemId])

  /** Quick-filtered phrase list for the bulk-row dropdown. Matches against the
   * phrase text, the description, AND tag labels (so typing "dotwork" finds
   * every dotwork-tagged phrase regardless of which category it lives in). */
  const filteredBulkPhrases = useMemo(() => {
    if (!chaosLibrary) return []
    const q = bulkPhraseFilter.trim().toLowerCase()
    if (!q) return chaosLibrary.phrases
    const tagLabelById = new Map(chaosLibrary.tags.map(t => [t.id, t.label.toLowerCase()]))
    return chaosLibrary.phrases.filter(p => {
      const hay = [
        p.phrase,
        p.description ?? '',
        ...(p.tagIds ?? []).map(t => `${t} ${tagLabelById.get(t) ?? ''}`),
      ].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [chaosLibrary, bulkPhraseFilter])

  /** Same filter logic but for the Flash Designs (real-time) row's phrase
   * dropdown. Independent state so it doesn't interfere with bulk. */
  const filteredFlashPhrases = useMemo(() => {
    if (!chaosLibrary) return []
    const q = flashPhraseFilter.trim().toLowerCase()
    if (!q) return chaosLibrary.phrases
    const tagLabelById = new Map(chaosLibrary.tags.map(t => [t.id, t.label.toLowerCase()]))
    return chaosLibrary.phrases.filter(p => {
      const hay = [
        p.phrase,
        p.description ?? '',
        ...(p.tagIds ?? []).map(t => `${t} ${tagLabelById.get(t) ?? ''}`),
      ].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [chaosLibrary, flashPhraseFilter])

  const result: FusionResult | null = useMemo(() => {
    if (!base || !blend) return null
    const input: FusionInput = {
      baseStyleId: base.id,
      blendStyleId: blend.id,
      blendWeight,
      socialAccelerant,
      anomaly,
      extraSignals,
      contentFocus: selectedContent ?? undefined,
    }
    return fuseStyles(base, blend, input, currentYear)
  }, [base, blend, blendWeight, socialAccelerant, anomaly, extraSignals, currentYear, selectedContent])

  // Pull fusion-research history once on mount; refresh after writes.
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/research/fusion')
      .then(r => r.json())
      .then((d: { history?: FusionHistoryEntry[] }) => {
        if (!cancelled) setHistory(d.history ?? [])
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Pull the motif library once.
  useEffect(() => {
    let cancelled = false
    fetch('/api/motif-library')
      .then(r => r.json())
      .then((d: MotifLibrary) => { if (!cancelled) setLibrary(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Chaos phrase library — feeds the dropdown next to the chaos direction input.
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/chaos-phrases')
      .then(r => r.ok ? r.json() : null)
      .then((d: ChaosLibrary | null) => { if (!cancelled && d) setChaosLibrary(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  async function handleQuickAddPhrase() {
    if (!quickAddPhrase.trim()) { setQuickAddPhraseStatus({ ok: false, message: 'Phrase required' }); return }
    if (!quickAddCategoryId && !quickAddNewCategory.trim()) {
      setQuickAddPhraseStatus({ ok: false, message: 'Pick category or type new one' }); return
    }
    setQuickAddingPhrase(true); setQuickAddPhraseStatus(null)
    try {
      const res = await fetch('/api/admin/chaos-phrases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrase: quickAddPhrase.trim(),
          categoryId: quickAddCategoryId || undefined,
          newCategoryLabel: quickAddCategoryId ? undefined : quickAddNewCategory.trim(),
        }),
      })
      const data: unknown = await res.json().catch(() => null)
      if (!res.ok || data === null) {
        const msg = (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string')
          ? (data as { error: string }).error
          : `Add failed (HTTP ${res.status})`
        throw new Error(msg)
      }
      const payload = data as { library: ChaosLibrary }
      setChaosLibrary(payload.library)
      // Auto-fill the bulk direction field with the just-added phrase.
      setBulkDirection(quickAddPhrase.trim())
      setQuickAddPhraseStatus({ ok: true, message: 'Added & filled below.' })
      setQuickAddPhrase('')
      setQuickAddNewCategory('')
    } catch (e) {
      setQuickAddPhraseStatus({ ok: false, message: e instanceof Error ? e.message : 'Add failed' })
    } finally {
      setQuickAddingPhrase(false)
    }
  }

  /**
   * Send a chosen produced image to GPT-5 Vision and stuff its reverse-prompt
   * into the secondary descriptor field. Auto-flips the override checkbox on
   * so the next generation picks it up immediately. User can edit the
   * descriptor before generating, or toggle override off to revert.
   */
  async function handleAnalyzeImage(image: { url: string }, model?: string) {
    if (analyzingImageUrl) return
    setAnalyzingImageUrl(image.url)
    setAnalyzeError(null)
    try {
      const res = await fetch('/api/admin/research/fusion/images/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: image.url, model }),
      })
      const data: unknown = await res.json().catch(() => null)
      if (!res.ok || data === null) {
        const msg = (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string')
          ? (data as { error: string }).error
          : `Analyze failed (HTTP ${res.status})`
        throw new Error(msg)
      }
      const payload = data as { descriptor?: string }
      if (!payload.descriptor) throw new Error('No descriptor returned')
      setSecondaryDescriptor(payload.descriptor)
      setSecondarySourceUrl(image.url)
      setUseSecondaryDescriptor(true)
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : 'Analyze failed')
    } finally {
      setAnalyzingImageUrl(null)
    }
  }

  /** Read a File into a data URL the vision endpoint can accept directly. */
  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  async function handleExternalImageFile(file: File) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      setAnalyzeError(`Unsupported format: ${file.type || 'unknown'}. Use JPEG, PNG, WebP, or GIF.`)
      return
    }
    // Cap at 3 MB so the resulting base64 data URL fits inside Vercel's
    // ~4.5 MB request body cap with headroom.
    if (file.size > 3 * 1024 * 1024) {
      setAnalyzeError(`Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 3 MB.`)
      return
    }
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setExternalImageDataUrl(dataUrl)
      setExternalImageName(file.name)
      setAnalyzeError(null)
    } catch {
      setAnalyzeError('Failed to read file')
    }
  }

  async function handleAnalyzeExternal() {
    if (!externalImageDataUrl) return
    await handleAnalyzeImage({ url: externalImageDataUrl }, externalAnalyzeModel)
  }

  // Load prompt drafts + favorites from the database on mount.
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/prompt-drafts')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d?.drafts) setPromptDrafts(d.drafts) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/image-favorites')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d?.favorites) setFavoritedUrls(new Set(Object.keys(d.favorites))) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  async function handleSaveDraft() {
    const text = secondaryDescriptor.trim()
    if (!text) return
    // Prompt for a short style heading (e.g. "Americana Traditional"). Keep
    // the input default suggestion lightweight — first six words.
    const suggestion = text.split(/\s+/).slice(0, 6).join(' ')
    const name = window.prompt('Name this prompt (short style heading):', suggestion)
    if (!name || !name.trim()) return
    try {
      const res = await fetch('/api/admin/prompt-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      if (data.drafts) setPromptDrafts(data.drafts)
      setDraftSavedFlash(true)
      setTimeout(() => setDraftSavedFlash(false), 1500)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Save failed')
    }
  }

  function handleLoadDraft(id: string) {
    const draft = promptDrafts.find(d => d.id === id)
    if (!draft) return
    setSecondaryDescriptor(draft.text)
    setUseSecondaryDescriptor(true)
    setSecondarySourceUrl(null)
  }

  async function handleDeleteDraft(id: string) {
    if (!window.confirm('Delete this saved prompt?')) return
    try {
      const res = await fetch(`/api/admin/prompt-drafts?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Delete failed')
      if (data.drafts) setPromptDrafts(data.drafts)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  async function toggleImageFavorite(url: string) {
    const wasFav = favoritedUrls.has(url)
    setFavoritedUrls(prev => {
      const next = new Set(prev)
      if (wasFav) next.delete(url); else next.add(url)
      return next
    })
    try {
      const res = await fetch('/api/admin/image-favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, favorite: !wasFav }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json() as { favorites?: Record<string, unknown> }
      if (data.favorites) setFavoritedUrls(new Set(Object.keys(data.favorites)))
    } catch {
      setFavoritedUrls(prev => {
        const next = new Set(prev)
        if (wasFav) next.add(url); else next.delete(url)
        return next
      })
    }
  }

  /** Filtered drafts for the dropdown / panel — name + text are both
   * searchable so users can find "Mucha" by typing "floral" if the text
   * mentions it. */
  const filteredDrafts = useMemo(() => {
    const q = draftFilter.trim().toLowerCase()
    if (!q) return promptDrafts
    return promptDrafts.filter(d => `${d.name} ${d.text}`.toLowerCase().includes(q))
  }, [promptDrafts, draftFilter])

  // Refresh batch jobs whenever the loaded analysis changes, then poll every
  // 60s while there's an open batch (so the user sees status flip without a
  // manual refresh).
  useEffect(() => {
    if (!analysis) { setBatchJobs([]); return }
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null
    async function load() {
      try {
        const res = await fetch(`/api/admin/research/fusion/images/batch?fusionEntryId=${encodeURIComponent(analysis!.entryId)}`)
        if (!res.ok) return
        const data = await res.json() as { jobs?: BatchJobRow[] }
        if (cancelled) return
        setBatchJobs(data.jobs ?? [])
        const stillOpen = (data.jobs ?? []).some(j => j.status === 'pending' || j.status === 'running')
        if (!stillOpen && timer) { clearInterval(timer); timer = null }
      } catch { /* ignore */ }
    }
    load()
    timer = setInterval(load, 60000)
    return () => { cancelled = true; if (timer) clearInterval(timer) }
  }, [analysis])


  function entryToAnalysisState(entry: FusionHistoryEntry, baseLabel: string, blendLabel: string): AnalysisState {
    return {
      entryId: entry.id,
      analysis: entry.analysis,
      visualDescriptor: entry.visualDescriptor ?? '',
      model: entry.model,
      fusionName: entry.fusionName,
      baseLabel,
      blendLabel,
      usage: entry.usage,
      images: entry.images ?? [],
    }
  }

  async function refreshHistory(): Promise<FusionHistoryEntry[]> {
    try {
      const r = await fetch('/api/admin/research/fusion')
      const d = (await r.json()) as { history?: FusionHistoryEntry[] }
      const next = d.history ?? []
      setHistory(next)
      return next
    } catch {
      return history
    }
  }

  async function handleResearch() {
    if (!base || !blend || !result) return
    setResearching(true)
    setResearchError(null)
    setAnalysis(null)
    setImageError(null)
    try {
      const res = await fetch('/api/admin/research/fusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industryId,
          baseStyleId: base.id,
          blendStyleId: blend.id,
          blendWeight,
          socialAccelerant,
          anomaly,
          extraSignals,
          fusionName: result.name,
          model,
          contentFocus: selectedContent ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Research failed')
      const next = entryToAnalysisState(data.entry, base.label, blend.label)
      setAnalysis(next)
      setEditedVisualDescriptor(next.visualDescriptor)
      refreshHistory()
    } catch (e) {
      setResearchError(e instanceof Error ? e.message : 'Research failed')
    } finally {
      setResearching(false)
    }
  }

  async function handleGenerateImages(chaosSweep = false) {
    if (!analysis) return
    setInFlightGenerations(c => c + 1)
    setImageError(null)
    try {
      // Send the full entry as a snapshot fallback. The server prefers a
      // DB-resident lookup by entryId, but if the persist for this entry
      // failed silently or hasn't propagated, the snapshot lets image gen
      // proceed without losing the user's research call.
      const fullEntry = history.find(h => h.id === analysis.entryId)
      const entrySnapshot = fullEntry ?? {
        id: analysis.entryId,
        timestamp: new Date().toISOString(),
        industryId,
        baseStyleId: base?.id ?? '',
        blendStyleId: blend?.id ?? '',
        blendWeight,
        socialAccelerant,
        anomaly,
        extraSignals,
        fusionName: analysis.fusionName,
        model: analysis.model,
        analysis: analysis.analysis,
        visualDescriptor: analysis.visualDescriptor,
        contentFocus: selectedContent ?? undefined,
        usage: analysis.usage,
      }
      const res = await fetch('/api/admin/research/fusion/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: analysis.entryId,
          count: imageCount,
          chaos,
          chaosSweep,
          imageModel,
          chaosDirection: flashDirection.trim() || undefined,
          colorPalette: flashColorPalette !== 'default' ? flashColorPalette : undefined,
          // Override priority: secondary (if enabled + filled) > edited primary > stored default.
          visualDescriptor: (useSecondaryDescriptor && secondaryDescriptor.trim())
            ? secondaryDescriptor.trim()
            : (editedVisualDescriptor.trim() && editedVisualDescriptor !== analysis.visualDescriptor
              ? editedVisualDescriptor
              : undefined),
          contentFocus: selectedContent ?? undefined,
          entrySnapshot,
        }),
      })

      // Parse the response carefully — Vercel timeouts return HTML, not JSON,
      // and the raw JSON.parse error ("string did not match the expected
      // pattern" on Safari) hides what really happened.
      const data: unknown = await res.json().catch(() => null)
      if (!res.ok || data === null) {
        if (res.status === 504) {
          throw new Error('Image generation timed out — try fewer images, or switch to the Flash model.')
        }
        const errMsg = (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string')
          ? (data as { error: string }).error
          : `Image generation failed (HTTP ${res.status})`
        throw new Error(errMsg)
      }

      const payload = data as { entry: FusionHistoryEntry | null; addedCount?: number; requestedCount?: number; failures?: { index: number; chaos?: number; error: string }[] }
      const updated = payload.entry
      if (updated) {
        // updated.images is the FULL appended list from the server (existing +
        // newly added by this call). With appendFusionImages on the backend
        // doing the read-then-write atomically, this is race-safe across
        // concurrent in-flight generations.
        setAnalysis(prev => (prev ? { ...prev, images: updated.images ?? [] } : prev))
      }
      // Partial success: show a soft warning, don't block the UI.
      if (payload.failures && payload.failures.length > 0 && payload.addedCount && payload.requestedCount) {
        const failed = payload.failures.length
        const first = payload.failures[0]?.error ?? 'unknown'
        setImageError(`${payload.addedCount}/${payload.requestedCount} succeeded — ${failed} failed (${first.slice(0, 80)})`)
      }
      refreshHistory()
    } catch (e) {
      setImageError(e instanceof Error ? e.message : 'Image generation failed')
    } finally {
      setInFlightGenerations(c => Math.max(0, c - 1))
    }
  }

  async function refreshBatchJobs() {
    if (!analysis) { setBatchJobs([]); return }
    try {
      const res = await fetch(`/api/admin/research/fusion/images/batch?fusionEntryId=${encodeURIComponent(analysis.entryId)}`)
      if (!res.ok) return
      const data = await res.json() as { jobs?: BatchJobRow[] }
      setBatchJobs(data.jobs ?? [])
    } catch { /* swallow — best-effort */ }
  }

  /**
   * Quick-add to the motif library — one category + comma-separated items.
   * Builds a minimal CSV inline and POSTs through the same import endpoint
   * the /data page's CSV importer uses, so the merge semantics are identical.
   * New items default to the currently-selected industry only (not '*'), since
   * the user is adding them in an industry-scoped context.
   */
  async function handleAddToLibrary() {
    const cat = newCategoryName.trim()
    const items = newItemsCsv.split(',').map(s => s.trim()).filter(Boolean)
    if (!cat) { setLibraryAddStatus({ ok: false, message: 'Category name required' }); return }
    if (items.length === 0) { setLibraryAddStatus({ ok: false, message: 'Add at least one item, comma-separated' }); return }
    setAddingToLibrary(true)
    setLibraryAddStatus(null)
    try {
      const header = 'category,name,industries'
      const rows = items.map(item => `${csvEscape(cat)},${csvEscape(item)},${industryId}`)
      const csv = [header, ...rows].join('\n')
      const res = await fetch('/api/admin/motif-library/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      })
      const data: unknown = await res.json().catch(() => null)
      if (!res.ok || data === null) {
        const msg = (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string')
          ? (data as { error: string }).error
          : `Import failed (HTTP ${res.status})`
        throw new Error(msg)
      }
      const payload = data as { addedItems?: number; addedCategories?: number; library?: MotifLibrary }
      setLibraryAddStatus({
        ok: true,
        message: `Added ${payload.addedItems ?? items.length} item${(payload.addedItems ?? items.length) === 1 ? '' : 's'} to "${cat}".`,
      })
      // Refresh the in-memory library so dropdowns update immediately.
      if (payload.library) setLibrary(payload.library)
      else {
        const r = await fetch('/api/motif-library')
        if (r.ok) setLibrary(await r.json())
      }
      setNewCategoryName('')
      setNewItemsCsv('')
    } catch (e) {
      setLibraryAddStatus({ ok: false, message: e instanceof Error ? e.message : 'Import failed' })
    } finally {
      setAddingToLibrary(false)
    }
  }

  /**
   * Force the server to poll Google for every open batch job, attach any
   * results that are ready, and refresh both the batch-status badge AND the
   * current entry's images. Used for the "Check now" button so users don't
   * have to wait for the daily cron tick.
   */
  async function handleForcePoll() {
    if (pollingBatches) return
    setPollingBatches(true)
    setPollSummary(null)
    try {
      const res = await fetch('/api/admin/research/fusion/images/batch/poll')
      const data: unknown = await res.json().catch(() => null)
      if (!res.ok || data === null) {
        const msg = (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string')
          ? (data as { error: string }).error
          : `Poll failed (HTTP ${res.status})`
        throw new Error(msg)
      }
      const summary = data as { polled?: number; succeeded?: number; imagesAttached?: number }
      const polled = summary.polled ?? 0
      const succeeded = summary.succeeded ?? 0
      const attached = summary.imagesAttached ?? 0
      setPollSummary(
        polled === 0
          ? 'No open batches to check.'
          : `Checked ${polled} · ${succeeded} succeeded · +${attached} image${attached === 1 ? '' : 's'}`,
      )
      // Refresh both the batch panel and the current entry's images so any
      // newly-attached batch results show up in the grid immediately.
      await refreshBatchJobs()
      if (attached > 0) {
        const fresh = await refreshHistory()
        const myEntry = fresh.find(h => h.id === analysis?.entryId)
        if (myEntry && analysis) {
          setAnalysis(prev => (prev ? { ...prev, images: myEntry.images ?? [] } : prev))
        }
      }
    } catch (e) {
      setPollSummary(e instanceof Error ? e.message : 'Poll failed')
    } finally {
      setPollingBatches(false)
    }
  }

  /**
   * Cancel every pending/running Gemini batch when Google's queue is stuck.
   * After cancel, the rows are marked cancelled locally even if Google's API
   * never ack'd — a stuck-pending batch is dead to us either way. Resubmit
   * on Flash afterward; it's usually faster than Pro under load.
   */
  async function handleCancelStuck() {
    if (cancellingBatches) return
    const openCount = batchJobs.filter(j => j.status === 'pending' || j.status === 'running').length
    if (openCount === 0) {
      setPollSummary('No open batches to cancel.')
      return
    }
    if (!window.confirm(`Cancel ${openCount} open Gemini batch${openCount === 1 ? '' : 'es'}? This can't be undone — you'll need to resubmit if you want them.`)) {
      return
    }
    setCancellingBatches(true)
    setPollSummary(null)
    try {
      const res = await fetch('/api/admin/research/fusion/images/batch/cancel', { method: 'POST' })
      const data: unknown = await res.json().catch(() => null)
      if (!res.ok || data === null) {
        const msg = (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string')
          ? (data as { error: string }).error
          : `Cancel failed (HTTP ${res.status})`
        throw new Error(msg)
      }
      const summary = data as { cancelled?: number; googleAcked?: number; googleErrored?: number }
      const cancelled = summary.cancelled ?? 0
      const acked = summary.googleAcked ?? 0
      setPollSummary(
        cancelled === 0
          ? 'No open batches to cancel.'
          : `Cancelled ${cancelled} batch${cancelled === 1 ? '' : 'es'} · ${acked} ack'd by Google`,
      )
      await refreshBatchJobs()
    } catch (e) {
      setPollSummary(e instanceof Error ? e.message : 'Cancel failed')
    } finally {
      setCancellingBatches(false)
    }
  }

  async function handleSubmitBulk() {
    if (!analysis) return
    setSubmittingBulk(true)
    setBulkError(null)
    try {
      const fullEntry = history.find(h => h.id === analysis.entryId)
      const entrySnapshot = fullEntry ?? {
        id: analysis.entryId,
        timestamp: new Date().toISOString(),
        industryId,
        baseStyleId: base?.id ?? '',
        blendStyleId: blend?.id ?? '',
        blendWeight,
        socialAccelerant,
        anomaly,
        extraSignals,
        fusionName: analysis.fusionName,
        model: analysis.model,
        analysis: analysis.analysis,
        visualDescriptor: analysis.visualDescriptor,
        contentFocus: selectedContent ?? undefined,
        usage: analysis.usage,
      }
      const res = await fetch('/api/admin/research/fusion/images/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: analysis.entryId,
          count: bulkCount,
          model: bulkModel,
          chaosDirection: bulkDirection.trim() || undefined,
          colorPalette: bulkColorPalette !== 'default' ? bulkColorPalette : undefined,
          // Secondary descriptor overrides when enabled — same priority as real-time.
          visualDescriptor: (useSecondaryDescriptor && secondaryDescriptor.trim())
            ? secondaryDescriptor.trim()
            : (editedVisualDescriptor.trim() && editedVisualDescriptor !== analysis.visualDescriptor
              ? editedVisualDescriptor
              : undefined),
          contentFocus: selectedContent ?? undefined,
          entrySnapshot,
        }),
      })
      const data: unknown = await res.json().catch(() => null)
      if (!res.ok || data === null) {
        const msg = (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string')
          ? (data as { error: string }).error
          : `Bulk submit failed (HTTP ${res.status})`
        throw new Error(msg)
      }
      // Optimistically prepend the new job, then refresh from server.
      const newJob = (data as { job?: BatchJobRow }).job
      if (newJob) setBatchJobs(prev => [newJob, ...prev])
      refreshBatchJobs()
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : 'Bulk submit failed')
    } finally {
      setSubmittingBulk(false)
    }
  }

  function reopenHistoryEntry(entry: FusionHistoryEntry) {
    const baseStrand = styles.find(s => s.id === entry.baseStyleId)
    const blendStrand = styles.find(s => s.id === entry.blendStyleId)
    const next = entryToAnalysisState(
      entry,
      baseStrand?.label ?? entry.baseStyleId,
      blendStrand?.label ?? entry.blendStyleId,
    )
    setAnalysis(next)
    setEditedVisualDescriptor(next.visualDescriptor)
    setImageError(null)
    setResearchError(null)
  }

  function addSignal() {
    const t = extraSignal.trim()
    if (!t) return
    setExtraSignals(prev => Array.from(new Set([...prev, t])))
    setExtraSignal('')
  }

  function removeSignal(s: string) {
    setExtraSignals(prev => prev.filter(x => x !== s))
  }

  return (
    <div className="grid md:grid-cols-2 gap-4 md:gap-5">
      <div className="space-y-4 min-w-0">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Base strand</div>
            <select
              value={baseId}
              onChange={e => setBaseId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              {styles.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label className="block">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Blend strand</div>
            <select
              value={blendId}
              onChange={e => setBlendId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              {styles.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        </div>

        {filteredLibrary && filteredLibrary.categories.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Content focus — category</div>
                <select
                  value={effectiveCategoryId}
                  onChange={e => { setContentCategoryId(e.target.value); setContentItemId('') }}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">Auto / N/A</option>
                  {filteredLibrary.categories.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value.slice(0, 80))}
                  placeholder="+ new category (one only)"
                  disabled={addingToLibrary}
                  className="mt-1.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs bg-white text-gray-900 placeholder:text-gray-400"
                />
              </label>
              <label className="block">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Content focus — item</div>
                <select
                  value={effectiveItemId}
                  onChange={e => setContentItemId(e.target.value)}
                  disabled={!effectiveCategoryId}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white disabled:opacity-60"
                >
                  <option value="">{effectiveCategoryId ? 'Auto / N/A' : 'pick a category'}</option>
                  {itemsInSelectedCategory.map(i => (
                    <option key={i.id} value={i.id}>{i.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newItemsCsv}
                  onChange={e => setNewItemsCsv(e.target.value)}
                  placeholder="+ new items (comma-separated, e.g. Phoenix, Unicorn, Pegasus)"
                  disabled={addingToLibrary}
                  className="mt-1.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs bg-white text-gray-900 placeholder:text-gray-400"
                />
              </label>
            </div>
            {(newCategoryName.trim() || newItemsCsv.trim()) && (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleAddToLibrary}
                  disabled={addingToLibrary || !newCategoryName.trim() || !newItemsCsv.trim()}
                  className="rounded bg-gray-700 text-white text-xs px-3 py-1.5 hover:bg-gray-800 disabled:opacity-50"
                >
                  {addingToLibrary ? 'Adding…' : 'Add to library'}
                </button>
                <span className="text-[10px] text-gray-500">
                  Items will be tagged to the <span className="font-semibold">{industryId}</span> industry.
                </span>
              </div>
            )}
            {libraryAddStatus && (
              <p className={`text-xs ${libraryAddStatus.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                {libraryAddStatus.message}
              </p>
            )}
          </div>
        )}

        <Slider label="Blend weight (toward blend strand)" value={blendWeight} setValue={setBlendWeight} hint={`${100 - blendWeight}% / ${blendWeight}%`} />
        <Slider label="Social accelerant" value={socialAccelerant} setValue={setSocialAccelerant} hint="How hard the algorithm is pushing this aesthetic" />
        <Slider label="Anomaly / rule-breaking" value={anomaly} setValue={setAnomaly} hint="0 = canon-faithful, 100 = chaos" />

        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Extra signals</div>
          <div className="flex gap-2">
            <input
              value={extraSignal}
              onChange={e => setExtraSignal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSignal() } }}
              placeholder="e.g. AI-generated reference, ambient core, wearable archive"
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm bg-white"
            />
            <button
              type="button"
              onClick={addSignal}
              className="rounded bg-gray-900 text-white text-sm px-3 py-2 hover:bg-gray-800"
            >Add</button>
          </div>
          {extraSignals.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {extraSignals.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => removeSignal(s)}
                  className="text-xs rounded-full border border-gray-300 px-2 py-0.5 bg-white hover:bg-gray-100"
                  title="Click to remove"
                >
                  {s} ×
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 min-w-0">
        {result ? (
          <>
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-lg font-bold text-gray-900 capitalize">{result.name}</h3>
              <div className="text-right">
                <div className="text-2xl font-bold tabular-nums text-gray-900">{result.plausibility}</div>
                <div className="text-[10px] uppercase tracking-wide text-gray-500">plausibility</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <Stat label="Cycle compression" value={`${result.cycleCompression}%`} />
              <Stat label="Years to emergence" value={result.yearsToEmergence === 0 ? 'now' : `${result.yearsToEmergence}y`} />
            </div>
            <p className="mt-3 text-sm text-gray-700 leading-relaxed">{result.outlook}</p>

            <div className="mt-4">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Visual ingredients</div>
              <ul className="text-sm text-gray-800 space-y-1">
                {result.ingredients.map(it => <li key={it}>· {it}</li>)}
              </ul>
            </div>
            <div className="mt-3">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Carrying signals</div>
              <div className="flex flex-wrap gap-1.5">
                {result.signals.map(s => (
                  <span key={s} className="text-xs rounded-full bg-gray-100 px-2 py-0.5 text-gray-800">{s}</span>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs uppercase tracking-wide text-gray-500">Deep research</span>
                <select
                  value={model}
                  onChange={e => setModel(e.target.value as ResearchModelId)}
                  className="text-xs rounded border border-gray-300 px-2 py-1 bg-white"
                >
                  {RESEARCH_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
                <button
                  type="button"
                  onClick={handleResearch}
                  disabled={researching || !base || !blend}
                  className="rounded bg-gray-900 text-white text-xs px-3 py-1.5 hover:bg-gray-800 disabled:opacity-50"
                >
                  {researching ? 'Researching…' : 'Research this fusion'}
                </button>
              </div>
              <p className="text-[11px] text-gray-500">
                Sends the fusion + dataset to Claude for a grounded prose analysis (who&apos;s already producing
                this, carrier signals, comparable historical fusions, what could kill it).
              </p>
              {researchError && <p className="mt-2 text-xs text-red-600">{researchError}</p>}
            </div>

            {analysis && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <div className="flex items-baseline gap-3 min-w-0">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-700 truncate">
                      Analysis: {analysis.fusionName}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 shrink-0">
                    {analysis.model} · {analysis.usage.input_tokens + analysis.usage.cache_read_input_tokens + analysis.usage.cache_creation_input_tokens} in / {analysis.usage.output_tokens} out
                    {analysis.usage.cache_read_input_tokens > 0 && ' · cache hit'}
                  </span>
                </div>
                <AnalysisProse text={analysis.analysis} />

                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <span className="text-xs uppercase tracking-wide text-gray-500">Visual descriptor (image-gen prompt)</span>
                    {analysis.visualDescriptor && editedVisualDescriptor !== analysis.visualDescriptor && (
                      <button
                        type="button"
                        onClick={() => setEditedVisualDescriptor(analysis.visualDescriptor)}
                        className="text-[10px] text-gray-500 hover:text-gray-800 underline"
                      >
                        revert
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={editedVisualDescriptor}
                    onChange={e => setEditedVisualDescriptor(e.target.value)}
                    placeholder="A 100-word visual descriptor will appear here after research…"
                    className={`w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm leading-relaxed ${useSecondaryDescriptor && secondaryDescriptor.trim() ? 'opacity-50' : ''}`}
                  />
                  {useSecondaryDescriptor && secondaryDescriptor.trim() && (
                    <p className="mt-1 text-[10px] text-gray-500 italic">
                      Greyed out because the secondary descriptor below is currently overriding.
                    </p>
                  )}
                </div>

                {/* ── Secondary descriptor (reverse-engineered from a chosen image) ── */}
                <div className="mt-3 pt-3 border-t border-dashed border-gray-300">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="text-xs uppercase tracking-wide text-gray-500">
                      Secondary descriptor (reverse-engineered)
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="inline-flex items-center gap-1 text-[11px] text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useSecondaryDescriptor}
                          onChange={e => setUseSecondaryDescriptor(e.target.checked)}
                          disabled={!secondaryDescriptor.trim()}
                          className="rounded border-gray-300 cursor-pointer disabled:cursor-not-allowed"
                        />
                        Use for next generation
                      </label>
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={!secondaryDescriptor.trim()}
                        title="Save the current prompt to the shared database with a short style heading"
                        className="text-[10px] rounded border border-gray-300 px-1.5 py-0.5 text-gray-700 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {draftSavedFlash ? '✓ saved' : 'Save prompt'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftsExpanded(v => !v)}
                        title="Browse saved style prompts"
                        className="text-[10px] rounded border border-gray-300 px-1.5 py-0.5 text-gray-700 hover:border-gray-500"
                      >
                        {draftsExpanded ? 'Hide library' : `Prompt library (${promptDrafts.length})`}
                      </button>
                      {secondaryDescriptor && (
                        <button
                          type="button"
                          onClick={() => { setSecondaryDescriptor(''); setUseSecondaryDescriptor(false); setSecondarySourceUrl(null) }}
                          className="text-[10px] text-gray-500 hover:text-gray-800 underline"
                        >
                          clear
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={secondaryDescriptor}
                    onChange={e => setSecondaryDescriptor(e.target.value)}
                    placeholder="Open any generated image → 🔍 Analyze with GPT-5 — the reverse-engineered prompt lands here. Edit freely, then tick the box above to use it for the next batch."
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm leading-relaxed"
                  />
                  <div className="mt-1 flex items-center justify-between gap-2 flex-wrap text-[10px] text-gray-500">
                    <span>
                      {secondarySourceUrl
                        ? (secondarySourceUrl.startsWith('data:image/')
                            ? <>Extracted from an uploaded image.</>
                            : <>Extracted from <a href={secondarySourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-800">this image</a>.</>)
                        : <>Pick an image in the grid → open lightbox → click <span className="font-semibold">🔍 Analyze</span>, or upload one below.</>}
                    </span>
                    {analyzeError && <span className="text-rose-600">{analyzeError}</span>}
                    {analyzingImageUrl && <span className="text-amber-600">Vision model is reading the image…</span>}
                  </div>

                  {draftsExpanded && (
                    <div className="mt-3 rounded-lg border border-gray-300 bg-gray-50 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs uppercase tracking-wide text-gray-600 font-semibold">
                          Prompt library
                          <span className="ml-1 text-gray-400 font-normal">
                            ({filteredDrafts.length}{draftFilter ? `/${promptDrafts.length}` : ''})
                          </span>
                        </span>
                        <input
                          type="search"
                          value={draftFilter}
                          onChange={e => setDraftFilter(e.target.value)}
                          placeholder="filter (e.g. americana, polynesian)"
                          className="text-xs rounded border border-gray-300 px-2 py-1 bg-white text-gray-900 placeholder:text-gray-400 w-[200px]"
                        />
                      </div>
                      {promptDrafts.length === 0 ? (
                        <p className="text-[11px] text-gray-500 py-2">
                          No saved prompts yet. Generate or analyze, then click <span className="font-semibold">Save prompt</span> above to name and store your first style heading.
                        </p>
                      ) : filteredDrafts.length === 0 ? (
                        <p className="text-[11px] text-gray-500 py-2">No prompts match &quot;{draftFilter}&quot;.</p>
                      ) : (
                        <ul className="max-h-[260px] overflow-y-auto divide-y divide-gray-200">
                          {filteredDrafts.map(d => (
                            <li key={d.id} className="flex items-center justify-between gap-2 py-1.5">
                              <button
                                type="button"
                                onClick={() => handleLoadDraft(d.id)}
                                className="text-left flex-1 min-w-0 hover:text-[#7B0000]"
                                title={d.text}
                              >
                                <span className="text-xs font-semibold text-gray-900 truncate block">{d.name}</span>
                                <span className="text-[10px] text-gray-500">
                                  {new Date(d.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDraft(d.id)}
                                className="text-gray-400 hover:text-red-600 shrink-0 text-base leading-none"
                                title="Delete this prompt"
                              >
                                ×
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="text-[10px] text-gray-500">
                        Click a heading to load its prompt into the descriptor above. Saved to your shared database — same drafts appear on any device.
                      </p>
                    </div>
                  )}

                  {/* ── External image analyzer ──────────────────────────── */}
                  <div className="mt-3 pt-3 border-t border-dotted border-gray-300">
                    <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1.5">
                      Or upload / drop any external image
                    </div>
                    <div
                      onDragOver={e => { e.preventDefault(); setExternalDragOver(true) }}
                      onDragLeave={() => setExternalDragOver(false)}
                      onDrop={e => {
                        e.preventDefault()
                        setExternalDragOver(false)
                        const file = e.dataTransfer.files?.[0]
                        if (file) void handleExternalImageFile(file)
                      }}
                      className={`rounded border-2 border-dashed transition-colors ${
                        externalDragOver ? 'border-[#7B0000] bg-[#7B0000]/5' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {externalImageDataUrl ? (
                        <div className="flex items-center gap-2 p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={externalImageDataUrl} alt="external preview" className="w-14 h-14 object-cover rounded border border-gray-200" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-700 truncate">{externalImageName ?? 'pasted image'}</div>
                            <button
                              type="button"
                              onClick={() => { setExternalImageDataUrl(null); setExternalImageName(null) }}
                              className="text-[10px] text-gray-500 hover:text-gray-800 underline"
                            >
                              clear
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="block py-4 text-center text-[11px] text-gray-500 cursor-pointer hover:text-gray-700">
                          Drop image here or click to choose · JPEG / PNG / WebP / GIF · max 3 MB
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) void handleExternalImageFile(file)
                              e.target.value = ''
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <select
                        value={externalAnalyzeModel}
                        onChange={e => setExternalAnalyzeModel(e.target.value as AnalyzeModelId)}
                        disabled={!!analyzingImageUrl}
                        className="text-xs rounded border border-gray-300 px-2 py-1 bg-white"
                      >
                        {ANALYZE_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={handleAnalyzeExternal}
                        disabled={!externalImageDataUrl || !!analyzingImageUrl}
                        className="rounded bg-[#7B0000] text-white text-xs px-3 py-1.5 hover:opacity-90 disabled:opacity-50"
                      >
                        {analyzingImageUrl === externalImageDataUrl ? 'Analyzing…' : 'Analyze this image'}
                      </button>
                      <span className="text-[10px] text-gray-500">
                        Result fills the descriptor above and auto-enables override.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xs uppercase tracking-wide text-gray-500">Chaos</span>
                    <span className="text-xs tabular-nums text-gray-700">{chaos}</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={1}
                    value={chaos}
                    onChange={e => setChaos(Number(e.target.value))}
                    className="w-full accent-[#7B0000]"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    {chaos === 0 && 'Faithful to the descriptor.'}
                    {chaos > 0 && chaos < 25 && 'Faithful to the descriptor.'}
                    {chaos >= 25 && chaos < 50 && 'Subtle compositional choices: light variation in line weight, slightly off-axis composition.'}
                    {chaos >= 50 && chaos < 75 && 'Compositional risks: noticeable line-weight variation, looser symmetry, an unexpected accent element.'}
                    {chaos >= 75 && 'Deliberate rule-breaking: unconventional proportions, abstracted forms, experimental linework.'}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs uppercase tracking-wide text-gray-500">Flash designs</span>
                    <select
                      value={imageCount}
                      onChange={e => setImageCount(Number(e.target.value))}
                      className="text-xs rounded border border-gray-300 px-2 py-1 bg-white"
                      disabled={generatingImages}
                    >
                      {Array.from({ length: 20 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <select
                      value={imageModel}
                      onChange={e => setImageModel(e.target.value as ImageModelId)}
                      className="text-xs rounded border border-gray-300 px-2 py-1 bg-white"
                      disabled={generatingImages}
                    >
                      {IMAGE_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleGenerateImages(false)}
                      className="rounded bg-[#7B0000] text-white text-xs px-3 py-1.5 hover:opacity-90"
                    >
                      Generate flash designs
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateImages(true)}
                      disabled={imageCount < 2}
                      title="Generate the batch with chaos ramped from 0 to 100 across the images"
                      className="rounded border border-[#7B0000] text-[#7B0000] text-xs px-3 py-1.5 hover:bg-[#7B0000]/5 disabled:opacity-50"
                    >
                      Chaos sweep
                    </button>
                    <span className="text-[10px] text-gray-500">
                      {IMAGE_MODELS.find(m => m.id === imageModel)?.priceHint}
                    </span>
                    {inFlightGenerations > 0 && (
                      <span
                        className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                        title={`${inFlightGenerations} generation${inFlightGenerations === 1 ? '' : 's'} in flight — fire more if you want, images will append as each finishes`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        {inFlightGenerations} in flight
                      </span>
                    )}
                  </div>

                  {/* Chaos library controls — mirror of the bulk row so real-time
                      generations can pick a phrase / new-add / set chaos direction. */}
                  {chaosLibrary && (
                    <div className="mt-2 flex items-center gap-1 flex-wrap">
                      <input
                        type="text"
                        value={flashPhraseFilter}
                        onChange={e => setFlashPhraseFilter(e.target.value)}
                        placeholder="filter (e.g. dotwork, japanese)"
                        disabled={generatingImages}
                        className="text-xs rounded border border-gray-300 px-2 py-1 bg-white text-gray-900 placeholder:text-gray-400 w-[160px]"
                      />
                      <select
                        value=""
                        onChange={e => {
                          const phrase = chaosLibrary.phrases.find(p => p.id === e.target.value)
                          if (phrase) setFlashDirection(phrase.phrase)
                        }}
                        disabled={generatingImages || filteredFlashPhrases.length === 0}
                        className="text-xs rounded border border-gray-300 px-2 py-1 bg-white max-w-[220px]"
                        title="Pick a chaos phrase (fills the direction field)"
                      >
                        <option value="">
                          {filteredFlashPhrases.length === chaosLibrary.phrases.length
                            ? `Pick phrase (${chaosLibrary.phrases.length}) ▾`
                            : `Pick phrase (${filteredFlashPhrases.length}/${chaosLibrary.phrases.length}) ▾`}
                        </option>
                        {chaosLibrary.categories.map(cat => {
                          const inCat = filteredFlashPhrases.filter(p => p.categoryId === cat.id)
                          if (inCat.length === 0) return null
                          return (
                            <optgroup key={cat.id} label={cat.label}>
                              {inCat.map(p => {
                                const summary = p.description ? `${p.phrase} — ${p.description}` : p.phrase
                                const truncated = summary.length > 90 ? summary.slice(0, 87) + '…' : summary
                                return <option key={p.id} value={p.id} title={summary}>{truncated}</option>
                              })}
                            </optgroup>
                          )
                        })}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowPhraseQuickAdd(v => !v)}
                        disabled={generatingImages}
                        title="Add a new phrase to the library"
                        className="rounded border border-gray-300 text-xs px-2 py-1 bg-white text-gray-700 hover:border-gray-500"
                      >
                        + new
                      </button>
                      <input
                        type="text"
                        value={flashDirection}
                        onChange={e => setFlashDirection(e.target.value.slice(0, 400))}
                        placeholder="Chaos direction (optional inspiration)"
                        disabled={generatingImages}
                        className="flex-1 min-w-[180px] text-xs rounded border border-gray-300 px-2 py-1 bg-white text-gray-900 placeholder:text-gray-400"
                      />
                      <select
                        value={flashColorPalette}
                        onChange={e => setFlashColorPalette(e.target.value)}
                        disabled={generatingImages}
                        title="Color palette — overrides the default black-ink-on-paper look. 🎲 Gamble picks a random palette per image."
                        className={`text-xs rounded border px-2 py-1 max-w-[220px] ${
                          flashColorPalette === 'gamble'
                            ? 'border-amber-400 bg-amber-50 text-amber-900'
                            : flashColorPalette !== 'default'
                              ? 'border-[#7B0000] bg-[#7B0000]/5 text-[#7B0000]'
                              : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      >
                        {COLOR_PALETTE_OPTIONS.map(p => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <p className="mt-1 text-[11px] text-gray-500">
                    Chaos sweep ramps chaos 0→100 across the {imageCount} image{imageCount === 1 ? '' : 's'} (pick 2+). Plain generate uses the slider value for every image. Optional &quot;chaos direction&quot; layers an extra stylistic anchor on every prompt.
                  </p>
                  {imageError && <p className="mt-2 text-xs text-red-600">{imageError}</p>}

                  {/* ── Bulk row (Gemini Batch API) ───────────────────────── */}
                  <div className="mt-4 pt-3 border-t border-dashed border-gray-300">
                    <div className="flex items-baseline justify-between gap-2 mb-2">
                      <span className="text-xs uppercase tracking-wide text-gray-500">Bulk batch (async · ~50% off)</span>
                      <span className="text-[10px] text-gray-400">Gemini Batch API · 0–24h turnaround</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={bulkCount}
                        onChange={e => setBulkCount(Number(e.target.value))}
                        disabled={submittingBulk}
                        className="text-xs rounded border border-gray-300 px-2 py-1 bg-white"
                        title="Number of images in this batch (10–50)"
                      >
                        {Array.from({ length: BULK_MAX - BULK_MIN + 1 }, (_, i) => i + BULK_MIN).map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <select
                        value={bulkModel}
                        onChange={e => setBulkModel(e.target.value as BulkModelId)}
                        disabled={submittingBulk}
                        className="text-xs rounded border border-gray-300 px-2 py-1 bg-white"
                      >
                        <optgroup label="Google (Gemini Batch)">
                          <option value="gemini-3-pro-image-preview">Gemini 3 Pro Image</option>
                          <option value="gemini-3.1-flash-image-preview">Nano Banana 2 (Flash)</option>
                        </optgroup>
                        <optgroup label="OpenAI Batch">
                          <option value="openai/gpt-image-1">GPT Image 1</option>
                        </optgroup>
                        <optgroup label="Replicate (fan-out)">
                          <option value="replicate/stability-ai/stable-diffusion-3.5-large">Stable Diffusion 3.5 Large</option>
                        </optgroup>
                      </select>
                      {chaosLibrary && (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={bulkPhraseFilter}
                            onChange={e => setBulkPhraseFilter(e.target.value)}
                            placeholder="filter (e.g. dotwork, japanese)"
                            disabled={submittingBulk}
                            className="text-xs rounded border border-gray-300 px-2 py-1 bg-white text-gray-900 placeholder:text-gray-400 w-[160px]"
                            title="Type to narrow the phrase dropdown by phrase, description, or tag"
                          />
                          <select
                            value=""
                            onChange={e => {
                              const phrase = chaosLibrary.phrases.find(p => p.id === e.target.value)
                              if (phrase) setBulkDirection(phrase.phrase)
                            }}
                            disabled={submittingBulk || filteredBulkPhrases.length === 0}
                            className="text-xs rounded border border-gray-300 px-2 py-1 bg-white max-w-[220px]"
                            title="Pick a chaos phrase from the library (fills the direction field)"
                          >
                            <option value="">
                              {filteredBulkPhrases.length === chaosLibrary.phrases.length
                                ? `Pick phrase (${chaosLibrary.phrases.length}) ▾`
                                : `Pick phrase (${filteredBulkPhrases.length}/${chaosLibrary.phrases.length}) ▾`}
                            </option>
                            {chaosLibrary.categories.map(cat => {
                              const inCat = filteredBulkPhrases.filter(p => p.categoryId === cat.id)
                              if (inCat.length === 0) return null
                              return (
                                <optgroup key={cat.id} label={cat.label}>
                                  {inCat.map(p => {
                                    const summary = p.description
                                      ? `${p.phrase} — ${p.description}`
                                      : p.phrase
                                    const truncated = summary.length > 90 ? summary.slice(0, 87) + '…' : summary
                                    return <option key={p.id} value={p.id} title={summary}>{truncated}</option>
                                  })}
                                </optgroup>
                              )
                            })}
                          </select>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowPhraseQuickAdd(v => !v)}
                        disabled={submittingBulk}
                        title="Add a new phrase to the library"
                        className="rounded border border-gray-300 text-xs px-2 py-1 bg-white text-gray-700 hover:border-gray-500"
                      >
                        + new
                      </button>
                      <input
                        type="text"
                        value={bulkDirection}
                        onChange={e => setBulkDirection(e.target.value.slice(0, 400))}
                        placeholder="Chaos direction (optional inspiration text)"
                        disabled={submittingBulk}
                        className="flex-1 min-w-[180px] text-xs rounded border border-gray-300 px-2 py-1 bg-white text-gray-900 placeholder:text-gray-400"
                      />
                      <select
                        value={bulkColorPalette}
                        onChange={e => setBulkColorPalette(e.target.value)}
                        disabled={submittingBulk}
                        title="Color palette — overrides the default black-ink-on-paper look. 🎲 Gamble picks a random palette per image in the batch."
                        className={`text-xs rounded border px-2 py-1 max-w-[220px] ${
                          bulkColorPalette === 'gamble'
                            ? 'border-amber-400 bg-amber-50 text-amber-900'
                            : bulkColorPalette !== 'default'
                              ? 'border-[#7B0000] bg-[#7B0000]/5 text-[#7B0000]'
                              : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      >
                        {COLOR_PALETTE_OPTIONS.map(p => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleSubmitBulk}
                        disabled={submittingBulk}
                        className="rounded bg-[#7B0000] text-white text-xs px-3 py-1.5 hover:opacity-90 disabled:opacity-50"
                      >
                        {submittingBulk ? 'Submitting…' : 'Submit bulk job'}
                      </button>
                      <button
                        type="button"
                        onClick={handleForcePoll}
                        disabled={pollingBatches}
                        title="Ask Google now whether any open batches are done — bypasses the daily cron"
                        className="rounded border border-[#7B0000] text-[#7B0000] text-xs px-3 py-1.5 hover:bg-[#7B0000]/5 disabled:opacity-50"
                      >
                        {pollingBatches ? 'Checking…' : 'Check now'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelStuck}
                        disabled={cancellingBatches}
                        title="Cancel every pending/running Gemini batch — use this when Google's queue is stuck for hours and you want to resubmit on Flash"
                        className="rounded border border-rose-400 text-rose-600 text-xs px-3 py-1.5 hover:bg-rose-50 disabled:opacity-50"
                      >
                        {cancellingBatches ? 'Cancelling…' : 'Cancel stuck'}
                      </button>
                      <span className="text-[10px] text-gray-500 tabular-nums">
                        ≈ ${(bulkCount * BULK_PRICE[bulkModel].perImage).toFixed(2)}
                      </span>
                    </div>
                    {showPhraseQuickAdd && chaosLibrary && (
                      <div className="mt-2 rounded border border-dashed border-gray-300 bg-gray-50 p-2 space-y-2">
                        <div className="text-[10px] uppercase tracking-wide text-gray-500">Add a phrase to the chaos library</div>
                        <input
                          type="text"
                          value={quickAddPhrase}
                          onChange={e => setQuickAddPhrase(e.target.value.slice(0, 400))}
                          placeholder="Phrase text (will also fill the direction field below)"
                          disabled={quickAddingPhrase}
                          className="w-full text-xs rounded border border-gray-300 px-2 py-1 bg-white text-gray-900 placeholder:text-gray-400"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={quickAddCategoryId}
                            onChange={e => { setQuickAddCategoryId(e.target.value); if (e.target.value) setQuickAddNewCategory('') }}
                            disabled={quickAddingPhrase}
                            className="text-xs rounded border border-gray-300 px-2 py-1 bg-white"
                          >
                            <option value="">— existing category —</option>
                            {chaosLibrary.categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </select>
                          <input
                            type="text"
                            value={quickAddNewCategory}
                            onChange={e => { setQuickAddNewCategory(e.target.value.slice(0, 60)); if (e.target.value) setQuickAddCategoryId('') }}
                            placeholder="…or new category name"
                            disabled={quickAddingPhrase || !!quickAddCategoryId}
                            className="text-xs rounded border border-gray-300 px-2 py-1 bg-white text-gray-900 placeholder:text-gray-400 disabled:opacity-50"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleQuickAddPhrase}
                            disabled={quickAddingPhrase}
                            className="rounded bg-gray-700 text-white text-xs px-3 py-1 hover:bg-gray-800 disabled:opacity-50"
                          >
                            {quickAddingPhrase ? 'Adding…' : 'Save phrase'}
                          </button>
                          <span className="text-[10px] text-gray-500">For tag editing, use the full Phrases tab.</span>
                          {quickAddPhraseStatus && (
                            <span className={`text-[10px] ${quickAddPhraseStatus.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                              {quickAddPhraseStatus.message}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="mt-1 text-[11px] text-gray-500">
                      Always ramps chaos 0→100 across the {bulkCount} images. Optional &quot;chaos direction&quot; text nudges every prompt with extra creative inspiration. Results appear in this entry when Google finishes (typically 2–6 h).
                    </p>
                    {(pollSummary || batchJobs.length > 0) && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {pollSummary && <span className="text-xs text-gray-600">{pollSummary}</span>}
                        <BatchStatusBadge jobs={batchJobs} />
                      </div>
                    )}
                    {bulkError && <p className="mt-2 text-xs text-red-600">{bulkError}</p>}
                  </div>
                  {analysis.images.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {analysis.images.map((img, i) => (
                        <div key={img.url} className="relative group">
                          <button
                            type="button"
                            onClick={() => setLightboxIndex(i)}
                            className="block rounded overflow-hidden border border-gray-200 hover:border-gray-400 relative cursor-zoom-in w-full"
                            aria-label={`Preview flash design ${i + 1} of ${analysis.images.length}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.url} alt="Flash design" className="w-full aspect-square object-cover" />
                            {typeof img.chaos === 'number' && (
                              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums">
                                chaos {img.chaos}
                              </span>
                            )}
                            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center text-white opacity-0 group-hover:opacity-100">
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="11" cy="11" r="7" />
                                <path d="M21 21l-4.3-4.3" />
                                <path d="M11 8v6M8 11h6" />
                              </svg>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); void toggleImageFavorite(img.url) }}
                            title={favoritedUrls.has(img.url) ? 'Unfavorite' : 'Favorite'}
                            className={`absolute top-1 right-1 z-10 flex items-center justify-center w-6 h-6 rounded bg-black/60 hover:bg-black/80 cursor-pointer text-sm ${
                              favoritedUrls.has(img.url) ? 'text-amber-400' : 'text-white/70'
                            }`}
                            aria-label={favoritedUrls.has(img.url) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            {favoritedUrls.has(img.url) ? '★' : '☆'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">Pick a base and a blend strand.</p>
        )}
      </div>

      <div className="md:col-span-2 min-w-0">
        <button
          type="button"
          onClick={() => setHistoryOpen(o => !o)}
          className="text-xs text-gray-700 hover:text-gray-900 underline"
        >
          {historyOpen ? '▾' : '▸'} Recent fusion research ({history.length})
        </button>
        {historyOpen && (
          <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden">
            {history.length === 0 ? (
              <li className="p-3 text-xs text-gray-500">No fusion research yet — run one above.</li>
            ) : (
              history.slice(0, 25).map(h => {
                const baseStrand = styles.find(s => s.id === h.baseStyleId)
                const blendStrand = styles.find(s => s.id === h.blendStyleId)
                const imgCount = h.images?.length ?? 0
                const isCurrent = analysis?.entryId === h.id
                const ts = new Date(h.timestamp)
                const tsShort = ts.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                const tsFull = ts.toLocaleString()
                return (
                  <li
                    key={h.id}
                    onClick={() => reopenHistoryEntry(h)}
                    className={`p-3 cursor-pointer text-sm flex items-start gap-3 transition-colors ${isCurrent ? 'bg-[#7B0000]/5' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{h.fusionName}</div>
                      <div className="text-xs text-gray-500 truncate">
                        <span>{(baseStrand?.label ?? h.baseStyleId)} × {(blendStrand?.label ?? h.blendStyleId)}</span>
                        <span className="hidden sm:inline ml-2">{tsFull}</span>
                        <span className="sm:hidden ml-2">{tsShort}</span>
                        <span className="hidden sm:inline ml-2">· {h.model}</span>
                      </div>
                    </div>
                    {imgCount > 0 ? (
                      <div className="shrink-0 flex -space-x-1.5">
                        {h.images!.slice(0, 3).map(img => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={img.url} src={img.url} alt="" className="w-8 h-8 rounded border border-white object-cover" />
                        ))}
                        {imgCount > 3 && <span className="text-[10px] text-gray-500 self-center ml-1">+{imgCount - 3}</span>}
                      </div>
                    ) : (
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-400">no images</span>
                    )}
                  </li>
                )
              })
            )}
          </ul>
        )}
      </div>

      {analysis && analysis.images.length > 0 && (
        <ImageLightbox
          images={analysis.images}
          activeIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onAnalyze={(img, model) => handleAnalyzeImage(img, model)}
          analyzing={!!analyzingImageUrl}
          favoritedUrls={favoritedUrls}
          onToggleFavorite={(img) => { void toggleImageFavorite(img.url) }}
        />
      )}
    </div>
  )
}

function Slider({ label, value, setValue, hint }: { label: string; value: number; setValue: (v: number) => void; hint?: string }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wide text-gray-500">{label}</span>
        <span className="text-xs text-gray-700 tabular-nums">{hint ?? value}</span>
      </div>
      <input
        type="range" min={0} max={100} step={1}
        value={value}
        onChange={e => setValue(Number(e.target.value))}
        className="w-full mt-1 accent-[#7B0000]"
      />
    </label>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-gray-200 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900">{value}</div>
    </div>
  )
}

/**
 * Minimal Markdown rendering: split on blank lines for paragraphs, replace
 * `**bold**` and `*italic*` inline. Avoids pulling in a Markdown dep.
 */
function AnalysisProse({ text }: { text: string }) {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  return (
    <div className="space-y-2 text-sm text-gray-800 leading-relaxed">
      {paragraphs.map((p, i) => (
        <p key={i} dangerouslySetInnerHTML={{ __html: renderInline(p) }} />
      ))}
    </div>
  )
}

/** Wrap a CSV cell value in double-quotes if it contains a comma/quote/newline.
 * Double-quotes inside are escaped by doubling per RFC 4180. */
function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderInline(s: string): string {
  // Escape first to neutralize any HTML in the model output, then apply
  // the safe inline formatters using their escaped forms.
  let safe = escapeHtml(s)
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  safe = safe.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
  return safe
}


function BatchStatusBadge({ jobs }: { jobs: BatchJobRow[] }) {
  if (!jobs || jobs.length === 0) return null
  const open = jobs.filter(j => j.status === "pending" || j.status === "running")
  const recentDone = jobs
    .filter(j => j.completed_at && (Date.now() - new Date(j.completed_at).getTime() < 1000 * 60 * 60 * 24))
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
  if (open.length === 0 && recentDone.length === 0) return null

  const tone = open.length > 0
    ? "bg-amber-100 text-amber-800 border-amber-300"
    : recentDone[0]?.status === "succeeded"
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : "bg-rose-100 text-rose-800 border-rose-300"

  const label = open.length > 0
    ? `${open.length} batch${open.length === 1 ? "" : "es"} pending`
    : recentDone[0]?.status === "succeeded"
      ? `+${recentDone[0].added_image_count} from batch`
      : `Batch ${recentDone[0]?.status}`

  const title = open.length > 0
    ? open.map(j => `${j.id} · ${j.status} · ${j.count}× ${j.model.includes("pro") ? "Pro" : "Flash"} · ${new Date(j.created_at).toLocaleString()}`).join("\n")
    : recentDone.slice(0, 3).map(j => `${j.id} · ${j.status} · +${j.added_image_count}/${j.count} · ${j.completed_at ? new Date(j.completed_at).toLocaleString() : ""}`).join("\n")

  return (
    <span
      title={title}
      className={`shrink-0 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${tone}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${open.length > 0 ? "bg-amber-500 animate-pulse" : "bg-current"}`} />
      {label}
    </span>
  )
}
