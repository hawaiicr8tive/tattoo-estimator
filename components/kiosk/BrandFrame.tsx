'use client'

/**
 * The "custom visual dynamic graphic over the screen" layer.
 *
 * Kept deliberately GPU-cheap for the Mali-G52: static gradients + a
 * single vignette. This is the seam to drop in richer canvas/WebGL art
 * later — prototype any shader work on the device before shipping it.
 */
export default function BrandFrame({ shopName }: { shopName: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {/* Vignette to make full-bleed art pop and frame the content */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 35%, transparent 55%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      {/* Top brand bar */}
      <div className="absolute inset-x-0 top-0 flex flex-col items-center pt-6">
        <div
          className="rounded-full px-5 py-2 text-xl font-black tracking-tight text-white"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          {shopName}
        </div>
        <p className="mt-1 text-xs font-medium uppercase tracking-[0.25em] text-white/70">
          Flash &amp; Artists
        </p>
      </div>

      {/* Corner accents */}
      <span className="absolute left-4 top-4 h-8 w-8 rounded-tl-xl border-l-2 border-t-2 border-white/40" />
      <span className="absolute right-4 top-4 h-8 w-8 rounded-tr-xl border-r-2 border-t-2 border-white/40" />
      <span className="absolute bottom-4 left-4 h-8 w-8 rounded-bl-xl border-b-2 border-l-2 border-white/40" />
      <span className="absolute bottom-4 right-4 h-8 w-8 rounded-br-xl border-b-2 border-r-2 border-white/40" />
    </div>
  )
}
