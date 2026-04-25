'use client'
import type { PriceEstimate, XlConfig } from '@/lib/types'

interface Props {
  estimate: PriceEstimate
  firstName: string
  xlConfig?: XlConfig
}

export default function PriceCard({ estimate, firstName, xlConfig }: Props) {
  const { priceRange, timeRange, disclaimer, isConsultationOnly } = estimate
  const showXl = isConsultationOnly && xlConfig

  return (
    <div className="rounded-2xl bg-[var(--brand-card)] border border-[var(--brand-border)] shadow-sm p-6">
      <h2 className="text-xl font-bold text-[var(--brand-text)] mb-1">
        {firstName ? `${firstName}'s Estimate` : 'Your Estimate'}
      </h2>
      <p className="text-xs text-[var(--brand-text-mid)] mb-5">Based on your selections — not a final quote</p>

      {showXl ? (
        <div className="rounded-xl bg-[var(--brand-primary-5)] border border-[var(--brand-primary-20)] p-4">
          <p className="text-sm font-bold text-[var(--brand-primary)] text-center mb-3">Custom / Large Piece</p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-lg bg-[var(--brand-bg)] p-3 text-center">
              <p className="text-xs font-medium text-[var(--brand-text-mid)] uppercase tracking-wide mb-1">Half Day</p>
              <p className="text-lg font-black text-[var(--brand-result-price-text)]">
                ${xlConfig.halfDayRate.min.toLocaleString()} – ${xlConfig.halfDayRate.max.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--brand-bg)] p-3 text-center">
              <p className="text-xs font-medium text-[var(--brand-text-mid)] uppercase tracking-wide mb-1">Full Day</p>
              <p className="text-lg font-black text-[var(--brand-result-price-text)]">
                ${xlConfig.fullDayRate.min.toLocaleString()} – ${xlConfig.fullDayRate.max.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-[var(--brand-card)] border border-[var(--brand-border)] p-3 text-center">
            <p className="text-xs font-medium text-[var(--brand-text-mid)] uppercase tracking-wide mb-1">Estimated Sessions</p>
            <p className="text-lg font-black text-[var(--brand-result-price-text)]">
              {xlConfig.sessionsRange.min === xlConfig.sessionsRange.max
                ? `${xlConfig.sessionsRange.min} ${xlConfig.sessionsRange.min === 1 ? 'session' : 'sessions'}`
                : `${xlConfig.sessionsRange.min}–${xlConfig.sessionsRange.max} sessions`}
            </p>
          </div>
        </div>
      ) : isConsultationOnly ? (
        <div className="rounded-xl bg-[var(--brand-primary-5)] border border-[var(--brand-primary-20)] p-4 text-center">
          <p className="text-sm font-bold text-[var(--brand-primary)] mb-1">Custom / Large Piece</p>
          <p className="text-3xl font-black text-[var(--brand-result-price-text)]">
            ${priceRange.min.toLocaleString()} – ${priceRange.max.toLocaleString()}
          </p>
          <p className="text-xs text-[var(--brand-text-mid)] mt-1">{timeRange.min}–{timeRange.max} hours · final pricing at consultation</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded-xl bg-[var(--brand-bg)] p-4 text-center">
            <p className="text-xs font-medium text-[var(--brand-text-mid)] uppercase tracking-wide mb-1">Estimated Cost</p>
            <p className="text-2xl font-black text-[var(--brand-result-price-text)]">
              ${priceRange.min.toLocaleString()} – ${priceRange.max.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--brand-bg)] p-4 text-center">
            <p className="text-xs font-medium text-[var(--brand-text-mid)] uppercase tracking-wide mb-1">Session Time</p>
            <p className="text-2xl font-black text-[var(--brand-result-price-text)]">
              {timeRange.min}–{timeRange.max}h
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-[var(--brand-text-mid)] text-center mt-3">
        {showXl ? xlConfig.disclaimer : disclaimer}
      </p>
    </div>
  )
}
