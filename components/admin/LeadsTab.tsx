'use client'
import { useState, useEffect } from 'react'
import type { Lead } from '@/lib/types'

export default function LeadsTab() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/leads')
      .then(r => r.json())
      .then(data => { if (data.error) throw new Error(data.error); setLeads(data) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-[#0A0A0A]">Leads</h2>
        <span className="text-sm text-[#555555]">{leads.length} total</span>
      </div>

      {loading && <p className="text-[#555555] py-8 text-center">Loading…</p>}
      {error && <p className="text-red-600 py-4">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl bg-white border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9F9F7] border-b border-gray-200">
                {['Date', 'Name', 'Email', 'Style', 'Size', 'Placement', 'Color', 'Estimate', 'Opted In', 'Notes'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#555555] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => (
                <tr key={lead.id} className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-[#F9F9F7]/50' : ''}`}>
                  <td className="px-4 py-3 text-[#555555] whitespace-nowrap text-xs">
                    {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-[#0A0A0A]">{lead.first_name}</td>
                  <td className="px-4 py-3 text-[#555555] text-xs">{lead.email}</td>
                  <td className="px-4 py-3 text-[#555555] capitalize text-xs">{lead.style}</td>
                  <td className="px-4 py-3 text-[#555555] capitalize text-xs">{lead.size}</td>
                  <td className="px-4 py-3 text-[#555555] text-xs">{lead.placement}</td>
                  <td className="px-4 py-3 text-[#555555] text-xs">{lead.is_color ? 'Color' : 'B&G'}</td>
                  <td className="px-4 py-3 font-medium text-[#0A0A0A] whitespace-nowrap text-xs">
                    ${lead.price_min.toLocaleString()}–${lead.price_max.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center text-green-600">{lead.opted_in ? '✓' : ''}</td>
                  <td className="px-4 py-3 text-[#555555] text-xs max-w-[200px] truncate">{lead.notes || '—'}</td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-[#555555]">No leads yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
