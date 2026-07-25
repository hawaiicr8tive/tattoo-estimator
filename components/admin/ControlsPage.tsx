'use client'

import { useState } from 'react'
import ChaosPhraseLibrary from './ChaosPhraseLibrary'
import PromptLibrary from './PromptLibrary'
import UsersTab from './UsersTab'

type SubTab = 'phrases' | 'prompts' | 'users'

const SUBTABS: { id: SubTab; label: string; description: string }[] = [
  { id: 'phrases', label: 'Chaos Phrases',  description: 'Short stylistic anchors injected into image-gen batches.' },
  { id: 'prompts', label: 'Prompt Library', description: 'Full named prompts saved from the Fusion Lab analyzer.' },
  { id: 'users',   label: 'Users',          description: 'Who can sign in, and which pages and actions they can reach.' },
]

interface Props {
  /** Hides the Users sub-tab from anyone without `users:manage`. */
  canManageUsers: boolean
}

/**
 * Top-level Controls tab — central database for everything that feeds the
 * Fusion Lab image generators. Sub-tabs swap between the two libraries
 * without changing the URL, so users can flip back and forth quickly.
 */
export default function ControlsPage({ canManageUsers }: Props) {
  const [active, setActive] = useState<SubTab>('phrases')
  const subtabs = SUBTABS.filter(tab => tab.id !== 'users' || canManageUsers)
  const current = subtabs.find(t => t.id === active) ?? subtabs[0]
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl sm:text-2xl font-black text-[var(--brand-text)]">Controls</h1>
        <p className="text-xs text-[var(--brand-text-mid)] mt-1">
          Central database for the chaos phrases and saved prompts that feed the dashboard&apos;s Fusion Lab image generators.
        </p>
      </header>

      <nav className="flex gap-0 border-b border-[var(--brand-border)] -mb-px">
        {subtabs.map(tab => {
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={`relative px-3 sm:px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors ${
                isActive
                  ? 'text-[var(--brand-primary)]'
                  : 'text-[var(--brand-text-mid)] hover:text-[var(--brand-text)]'
              }`}
            >
              {tab.label}
              {isActive && (
                <span
                  className="absolute left-0 right-0 bottom-0 h-[2px]"
                  style={{ background: 'var(--brand-gradient)', boxShadow: '0 0 10px var(--brand-glow)' }}
                />
              )}
            </button>
          )
        })}
      </nav>

      <p className="text-[11px] text-[var(--brand-text-mid)] italic">{current.description}</p>

      {active === 'phrases' && <ChaosPhraseLibrary />}
      {active === 'prompts' && <PromptLibrary />}
      {active === 'users' && canManageUsers && <UsersTab />}
    </div>
  )
}
