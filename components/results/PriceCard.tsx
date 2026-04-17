'use client'
import type { PriceEstimate } from '@/lib/types'

interface Props {
  estimate: PriceEstimate
  firstName: string
}

export default function PriceCard({ estimate, firstName }: Props) {
  const { priceRange, timeRange, disclaimer, isConsultationOnly } = estimate

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <h2 className="text-xl font-bold text-[#0A0A0A] mb-1">
        {firstName ? `${firstName}'s Estimate` : 'Your Estimate'}
      </h2>
      <p className="text-xs text-[#555555] mb-5">Based on your selections — not a final quote</p>

      {isConsultationOnly ? (
        <div className="rounded-xl bg-[#7B0000]/5 border border-[#7B0000]/20 p-4 text-center">
          <p className="text-sm font-bold text-[#7B0000] mb-1">Custom / Large Piece</p>
          <p className="text-3xl font-black text-[#0A0A0A]">
            ${priceRange.min.toLocaleString()} – ${priceRange.max.toLocaleString()}
          </p>
          <p className="text-xs text-[#555555] mt-1">{timeRange.min}–{timeRange.max} hours · final pricing at consultation</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded-xl bg-[#F5F5F0] p-4 text-center">
            <p className="text-xs font-medium text-[#555555] uppercase tracking-wide mb-1">Estimated Cost</p>
            <p className="text-2xl font-black text-[#0A0A0A]">
              ${priceRange.min.toLocaleString()} – ${priceRange.max.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl bg-[#F5F5F0] p-4 text-center">
            <p className="text-xs font-medium text-[#555555] uppercase tracking-wide mb-1">Session Time</p>
            <p className="text-2xl font-black text-[#0A0A0A]">
              {timeRange.min}–{timeRange.max}h
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-[#555555] text-center">{disclaimer}</p>
    </div>
  )
}
