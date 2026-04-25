'use client'
import { useBranding } from '@/components/BrandingProvider'
import { hexToRgb } from '@/lib/branding'
import type { PlacementKey } from '@/lib/types'

const GROUPS = [
  {
    label: 'EASY',
    color: 'bg-green-50 text-green-800 border-green-200',
    placements: [
      { id: 'outer-arm' as PlacementKey, label: 'Outer Arm' },
      { id: 'thigh' as PlacementKey, label: 'Thigh' },
      { id: 'calf' as PlacementKey, label: 'Calf' },
      { id: 'shoulder' as PlacementKey, label: 'Shoulder' },
      { id: 'upper-back' as PlacementKey, label: 'Upper Back' },
    ],
  },
  {
    label: 'MODERATE',
    color: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    placements: [
      { id: 'inner-arm' as PlacementKey, label: 'Inner Arm' },
      { id: 'forearm' as PlacementKey, label: 'Forearm' },
      { id: 'chest' as PlacementKey, label: 'Chest' },
      { id: 'stomach' as PlacementKey, label: 'Stomach' },
      { id: 'lower-back' as PlacementKey, label: 'Lower Back' },
      { id: 'shin' as PlacementKey, label: 'Shin' },
    ],
  },
  {
    label: 'DIFFICULT',
    color: 'bg-orange-50 text-orange-800 border-orange-200',
    placements: [
      { id: 'ribs' as PlacementKey, label: 'Ribs' },
      { id: 'spine' as PlacementKey, label: 'Spine' },
      { id: 'neck' as PlacementKey, label: 'Neck' },
      { id: 'hands' as PlacementKey, label: 'Hands' },
      { id: 'feet' as PlacementKey, label: 'Feet' },
      { id: 'ankle' as PlacementKey, label: 'Ankle' },
    ],
  },
  {
    label: 'PREMIUM',
    color: 'bg-red-50 text-red-800 border-red-200',
    placements: [
      { id: 'fingers' as PlacementKey, label: 'Fingers' },
      { id: 'behind-ear' as PlacementKey, label: 'Behind Ear' },
      { id: 'face' as PlacementKey, label: 'Face' },
    ],
  },
]

interface Props {
  value: PlacementKey | null
  onChange: (placement: PlacementKey) => void
}

export default function PlacementSelector({ value, onChange }: Props) {
  const { primary, pillDefaultBg, pillDefaultText, pillBg, pillOpacity, pillText } = useBranding()
  const pillRgb = hexToRgb(pillBg)
  const selectedStyle: React.CSSProperties = {
    borderColor: primary,
    backgroundColor: `rgba(${pillRgb}, ${pillOpacity / 100})`,
    color: pillText,
  }
  const defaultStyle: React.CSSProperties = {
    backgroundColor: pillDefaultBg,
    color: pillDefaultText,
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-center text-[var(--brand-text)]">Where on your body?</h2>
      <div className="space-y-3">
        {GROUPS.map(group => (
          <div key={group.label}>
            <div className={`mb-2 inline-block rounded px-2 py-0.5 text-xs font-bold border ${group.color}`}>
              {group.label}
            </div>
            <div className="flex flex-wrap gap-2">
              {group.placements.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onPointerDown={() => onChange(p.id)}
                  style={value === p.id ? selectedStyle : defaultStyle}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all cursor-pointer
                    ${value === p.id
                      ? ''
                      : 'border-[var(--brand-border)] hover:border-[var(--brand-primary)]'
                    }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
