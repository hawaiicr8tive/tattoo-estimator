'use client'
import { useState, useRef, useCallback } from 'react'
import JSZip from 'jszip'
import { Upload, Check, X, Download, Loader2, ImageOff } from 'lucide-react'

type Bucket = 'fills' | 'margin' | 'textured' | 'manual'
type Decision = 'approve' | 'reject'

interface Item {
  id: string
  name: string
  bucket: Bucket
  croppedUrl: string | null
  originalUrl: string
  profile?: { background?: string; drawings?: number; confidence?: number; notes?: string }
  decision: Decision
}

interface FailedItem { id: string; name: string; error: string }

const CONCURRENCY = 3

const BADGE: Record<Bucket, { label: string; cls: string }> = {
  fills:    { label: 'fills',    cls: 'bg-emerald-100 text-emerald-800' },
  margin:   { label: 'margin',   cls: 'bg-sky-100 text-sky-800' },
  textured: { label: 'textured', cls: 'bg-amber-100 text-amber-800' },
  manual:   { label: 'manual',   cls: 'bg-rose-100 text-rose-800' },
}

export default function FlashCropperTab() {
  const [items, setItems] = useState<Item[]>([])
  const [failed, setFailed] = useState<FailedItem[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [committing, setCommitting] = useState(false)
  const [zipping, setZipping] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const approveCount = items.filter(i => i.decision === 'approve').length
  const rejectCount = items.filter(i => i.decision === 'reject').length

  const processFiles = useCallback(async (files: File[]) => {
    const imgs = files.filter(f => /\.(jpe?g|png|webp|tiff?)$/i.test(f.name))
    if (!imgs.length) return
    setBusy(true)
    setNotice(null)
    setProgress(p => ({ done: p.done, total: p.total + imgs.length }))

    const queue = [...imgs]
    async function worker() {
      for (;;) {
        const file = queue.shift()
        if (!file) return
        try {
          const fd = new FormData()
          fd.append('file', file)
          const res = await fetch('/api/admin/flash-cropper', { method: 'POST', body: fd })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Failed')
          const bucket = data.bucket as Bucket
          setItems(prev => [...prev, {
            id: data.id, name: data.name, bucket,
            croppedUrl: data.croppedUrl, originalUrl: data.originalUrl, profile: data.profile,
            decision: bucket === 'manual' ? 'reject' : 'approve', // sensible default, flip as needed
          }])
        } catch (e) {
          setFailed(prev => [...prev, { id: `${file.name}-${Date.now()}`, name: file.name, error: e instanceof Error ? e.message : 'Failed' }])
        } finally {
          setProgress(p => ({ ...p, done: p.done + 1 }))
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))
    setBusy(false)
  }, [])

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length) processFiles(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const files = Array.from(e.dataTransfer.files || [])
    if (files.length) processFiles(files)
  }

  function setDecision(id: string, decision: Decision) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, decision } : i))
  }
  function bulk(decision: Decision) {
    setItems(prev => prev.map(i => ({ ...i, decision })))
  }

  async function commitApproved() {
    const approved = items.filter(i => i.decision === 'approve' && i.croppedUrl)
    if (!approved.length) { setNotice('Nothing marked Approve (with a crop) to add.'); return }
    setCommitting(true); setNotice(null)
    try {
      const payload = approved.map(i => ({
        id: i.id,
        title: i.name.replace(/\.[^.]+$/, ''),
        image: i.croppedUrl as string,
      }))
      const res = await fetch('/api/admin/flash', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      const approvedIds = new Set(approved.map(i => i.id))
      setItems(prev => prev.filter(i => !approvedIds.has(i.id)))
      setNotice(`Added ${data.added} to the flash library (${data.total} total). Run auto-tag on them next.`)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setCommitting(false)
    }
  }

  async function downloadRejected() {
    const rejected = items.filter(i => i.decision === 'reject')
    if (!rejected.length) { setNotice('Nothing marked Reject to download.'); return }
    setZipping(true); setNotice(null)
    try {
      const zip = new JSZip()
      for (const it of rejected) {
        const resp = await fetch(it.originalUrl)
        if (!resp.ok) continue
        const blob = await resp.blob()
        zip.file(it.name, blob)
      }
      const out = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(out)
      const a = document.createElement('a')
      a.href = url; a.download = `flash-rejected-${Date.now()}.zip`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
      const rejectedIds = new Set(rejected.map(i => i.id))
      setItems(prev => prev.filter(i => !rejectedIds.has(i.id)))
      setNotice(`Downloaded ${rejected.length} original${rejected.length > 1 ? 's' : ''} to do by hand.`)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setZipping(false)
    }
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-black text-[#0A0A0A]">Flash Cropper</h2>
        <p className="text-sm text-[#555555] mt-1">
          Drop scanned flash here. AI sorts each one and crops it to a clean square (artwork untouched).
          Review below, send the good ones to the flash library, and download the rest to finish by hand.
        </p>
      </div>

      {/* Dropzone */}
      <label
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 cursor-pointer transition-colors
          ${dragOver ? 'border-[#7B0000] bg-[#7B0000]/5' : 'border-gray-300 bg-white hover:border-[#7B0000]/50'}`}
      >
        <Upload className="w-7 h-7 text-[#7B0000]" />
        <span className="text-sm font-bold text-[#0A0A0A]">Drop scans or click to choose</span>
        <span className="text-xs text-[#555555]">JPG / PNG / WEBP / TIFF · up to 30 MB each</span>
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onPick} className="hidden" />
      </label>

      {/* Progress */}
      {progress.total > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-[#555555] mb-1">
            <span>{busy ? 'Sorting + cropping…' : 'Done'} {progress.done}/{progress.total}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full bg-[#7B0000] transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {notice && <p className="mt-4 text-sm text-[#0A0A0A] bg-[#7B0000]/5 border border-[#7B0000]/20 rounded-lg px-3 py-2">{notice}</p>}

      {/* Toolbar */}
      {items.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3 sticky top-[57px] bg-[#F5F5F0] py-2 z-[5]">
          <span className="text-sm font-bold text-[#0A0A0A]">{items.length} to review</span>
          <span className="text-xs text-emerald-700">{approveCount} approve</span>
          <span className="text-xs text-rose-700">{rejectCount} reject</span>
          <div className="flex-1" />
          <button type="button" onClick={() => bulk('approve')} className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 text-[#555555] hover:text-[#0A0A0A] cursor-pointer">Approve all</button>
          <button type="button" onClick={() => bulk('reject')} className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 text-[#555555] hover:text-[#0A0A0A] cursor-pointer">Reject all</button>
          <button type="button" onClick={downloadRejected} disabled={zipping || !rejectCount}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-[#0A0A0A] hover:bg-gray-50 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5">
            {zipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Download {rejectCount} rejected
          </button>
          <button type="button" onClick={commitApproved} disabled={committing || !approveCount}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#7B0000] text-white font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5">
            {committing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Add {approveCount} to library
          </button>
        </div>
      )}

      {/* Review grid */}
      {items.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {items.map(it => {
            const approved = it.decision === 'approve'
            const showUrl = it.croppedUrl || it.originalUrl
            return (
              <div key={it.id} className={`rounded-xl overflow-hidden border bg-white ${approved ? 'border-emerald-400' : 'border-rose-300'}`}>
                <div className="relative aspect-square bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={showUrl} alt={it.name} className="w-full h-full object-cover" />
                  <span className={`absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${BADGE[it.bucket].cls}`}>{BADGE[it.bucket].label}</span>
                  {!it.croppedUrl && (
                    <span className="absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-800/80 text-white inline-flex items-center gap-1">
                      <ImageOff className="w-3 h-3" /> uncropped
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-[11px] text-[#555555] truncate" title={it.name}>{it.name}</p>
                  <div className="mt-1.5 grid grid-cols-2 gap-1">
                    <button type="button" onClick={() => setDecision(it.id, 'approve')}
                      className={`text-[11px] py-1 rounded-md font-bold inline-flex items-center justify-center gap-1 cursor-pointer
                        ${approved ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-[#555555] hover:bg-gray-200'}`}>
                      <Check className="w-3 h-3" /> Keep
                    </button>
                    <button type="button" onClick={() => setDecision(it.id, 'reject')}
                      className={`text-[11px] py-1 rounded-md font-bold inline-flex items-center justify-center gap-1 cursor-pointer
                        ${!approved ? 'bg-rose-600 text-white' : 'bg-gray-100 text-[#555555] hover:bg-gray-200'}`}>
                      <X className="w-3 h-3" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Failures */}
      {failed.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-bold text-rose-700 mb-2">{failed.length} couldn’t be processed</p>
          <ul className="text-xs text-[#555555] space-y-1">
            {failed.map(f => <li key={f.id}>· {f.name} — {f.error}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
