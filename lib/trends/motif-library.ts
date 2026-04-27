/**
 * A category groups motif items (Flowers, Animals, Hawaiian, etc.).
 * Categories are filtered per-industry by their items' `industries` field —
 * if a category has zero applicable items for the current industry, it's hidden.
 */
export interface MotifCategory {
  id: string
  label: string
  /** Description shown as a hint in the UI. */
  description?: string
}

/**
 * A specific tattoo motif/content type a user can pick from in the Fusion Lab.
 * Items are scoped to industries — `industries: ['*']` means "applies to all".
 */
export interface MotifItem {
  id: string
  label: string
  categoryId: string
  /** List of industry ids this item applies to, or ['*'] for all. */
  industries: string[]
  /** Optional alternative names (used by CSV imports / search). */
  aliases?: string[]
  /** Optional one-line note to help the model render it. */
  description?: string
}

export interface MotifLibrary {
  categories: MotifCategory[]
  items: MotifItem[]
}

export const MOTIF_LIBRARY_SEED: MotifLibrary = {
  categories: [
    { id: 'flowers',        label: 'Flowers',         description: 'Floral motifs — botanical or stylized.' },
    { id: 'animals',        label: 'Animals',         description: 'Land, air, and sea creatures.' },
    { id: 'symbols',        label: 'Symbols',         description: 'Cultural, spiritual, and abstract symbols.' },
    { id: 'mythical',       label: 'Mythical',        description: 'Legendary creatures and divine figures.' },
    { id: 'celestial',      label: 'Celestial',       description: 'Sun, moon, stars, cosmic imagery.' },
    { id: 'plants',         label: 'Plants & Botanical', description: 'Trees, leaves, fungi, succulents.' },
    { id: 'hawaiian',       label: 'Hawaiian / Polynesian', description: 'Hawaii-specific cultural and tourist motifs.' },
    { id: 'objects',        label: 'Objects',         description: 'Daggers, anchors, hourglasses, and other still-life items.' },
    { id: 'lettering',      label: 'Lettering & Script', description: 'Words, names, numerals, language.' },
    { id: 'pop-culture',    label: 'Pop Culture',     description: 'Characters, references from media.' },
  ],
  items: [
    // ── Flowers (20) ─────────────────────────────────────────────
    { id: 'rose',          label: 'Rose',           categoryId: 'flowers', industries: ['*'] },
    { id: 'lotus',         label: 'Lotus',          categoryId: 'flowers', industries: ['*'] },
    { id: 'plumeria',      label: 'Plumeria',       categoryId: 'flowers', industries: ['hawaii-souvenir', 'tattoo', 'walkin'] },
    { id: 'hibiscus',      label: 'Hibiscus',       categoryId: 'flowers', industries: ['hawaii-souvenir', 'tattoo', 'walkin'] },
    { id: 'peony',         label: 'Peony',          categoryId: 'flowers', industries: ['tattoo', 'walkin'] },
    { id: 'cherry-blossom',label: 'Cherry Blossom', categoryId: 'flowers', industries: ['tattoo', 'walkin'] },
    { id: 'daisy',         label: 'Daisy',          categoryId: 'flowers', industries: ['*'] },
    { id: 'sunflower',     label: 'Sunflower',      categoryId: 'flowers', industries: ['*'] },
    { id: 'magnolia',      label: 'Magnolia',       categoryId: 'flowers', industries: ['tattoo', 'walkin'] },
    { id: 'daffodil',      label: 'Daffodil',       categoryId: 'flowers', industries: ['*'] },
    { id: 'tulip',         label: 'Tulip',          categoryId: 'flowers', industries: ['*'] },
    { id: 'iris',          label: 'Iris',           categoryId: 'flowers', industries: ['tattoo', 'walkin'] },
    { id: 'orchid',        label: 'Orchid',         categoryId: 'flowers', industries: ['*'] },
    { id: 'dahlia',        label: 'Dahlia',         categoryId: 'flowers', industries: ['tattoo', 'walkin'] },
    { id: 'chrysanthemum', label: 'Chrysanthemum',  categoryId: 'flowers', industries: ['tattoo'] },
    { id: 'lavender',      label: 'Lavender',       categoryId: 'flowers', industries: ['*'] },
    { id: 'lily',          label: 'Lily',           categoryId: 'flowers', industries: ['*'] },
    { id: 'poppy',         label: 'Poppy',          categoryId: 'flowers', industries: ['*'] },
    { id: 'gardenia',      label: 'Gardenia',       categoryId: 'flowers', industries: ['hawaii-souvenir', 'tattoo'] },
    { id: 'bird-of-paradise',label: 'Bird of Paradise', categoryId: 'flowers', industries: ['hawaii-souvenir', 'tattoo'] },

    // ── Animals (24) ─────────────────────────────────────────────
    { id: 'wolf',          label: 'Wolf',           categoryId: 'animals', industries: ['tattoo', 'walkin'] },
    { id: 'lion',          label: 'Lion',           categoryId: 'animals', industries: ['tattoo', 'walkin'] },
    { id: 'tiger',         label: 'Tiger',          categoryId: 'animals', industries: ['tattoo', 'walkin'] },
    { id: 'bear',          label: 'Bear',           categoryId: 'animals', industries: ['tattoo', 'walkin'] },
    { id: 'fox',           label: 'Fox',            categoryId: 'animals', industries: ['tattoo', 'walkin'] },
    { id: 'deer',          label: 'Deer',           categoryId: 'animals', industries: ['tattoo', 'walkin'] },
    { id: 'owl',           label: 'Owl',            categoryId: 'animals', industries: ['tattoo', 'walkin'] },
    { id: 'eagle',         label: 'Eagle',          categoryId: 'animals', industries: ['tattoo', 'walkin'] },
    { id: 'hawk',          label: 'Hawk',           categoryId: 'animals', industries: ['tattoo', 'walkin'] },
    { id: 'raven',         label: 'Raven',          categoryId: 'animals', industries: ['tattoo', 'walkin'] },
    { id: 'dove',          label: 'Dove',           categoryId: 'animals', industries: ['*'] },
    { id: 'hummingbird',   label: 'Hummingbird',    categoryId: 'animals', industries: ['*'] },
    { id: 'swallow',       label: 'Swallow',        categoryId: 'animals', industries: ['tattoo', 'walkin'] },
    { id: 'butterfly',     label: 'Butterfly',      categoryId: 'animals', industries: ['*'] },
    { id: 'dragonfly',     label: 'Dragonfly',      categoryId: 'animals', industries: ['*'] },
    { id: 'bee',           label: 'Bee',            categoryId: 'animals', industries: ['*'] },
    { id: 'snake',         label: 'Snake',          categoryId: 'animals', industries: ['tattoo', 'walkin'] },
    { id: 'koi',           label: 'Koi',            categoryId: 'animals', industries: ['tattoo'] },
    { id: 'shark',         label: 'Shark',          categoryId: 'animals', industries: ['tattoo', 'walkin', 'hawaii-souvenir'] },
    { id: 'octopus',       label: 'Octopus',        categoryId: 'animals', industries: ['tattoo', 'walkin', 'hawaii-souvenir'] },
    { id: 'turtle',        label: 'Turtle',         categoryId: 'animals', industries: ['tattoo', 'walkin', 'hawaii-souvenir'] },
    { id: 'dolphin',       label: 'Dolphin',        categoryId: 'animals', industries: ['walkin', 'hawaii-souvenir'] },
    { id: 'whale',         label: 'Whale',          categoryId: 'animals', industries: ['tattoo', 'hawaii-souvenir'] },
    { id: 'jellyfish',     label: 'Jellyfish',      categoryId: 'animals', industries: ['tattoo', 'walkin'] },

    // ── Symbols (12) ─────────────────────────────────────────────
    { id: 'anchor',        label: 'Anchor',         categoryId: 'symbols', industries: ['tattoo', 'walkin'] },
    { id: 'compass',       label: 'Compass',        categoryId: 'symbols', industries: ['tattoo', 'walkin'] },
    { id: 'infinity',      label: 'Infinity',       categoryId: 'symbols', industries: ['walkin'] },
    { id: 'cross',         label: 'Cross',          categoryId: 'symbols', industries: ['tattoo', 'walkin'] },
    { id: 'ankh',          label: 'Ankh',           categoryId: 'symbols', industries: ['tattoo'] },
    { id: 'om',            label: 'Om',             categoryId: 'symbols', industries: ['tattoo'] },
    { id: 'hamsa',         label: 'Hamsa',          categoryId: 'symbols', industries: ['tattoo', 'walkin'] },
    { id: 'evil-eye',      label: 'Evil Eye',       categoryId: 'symbols', industries: ['tattoo', 'walkin'] },
    { id: 'yin-yang',      label: 'Yin Yang',       categoryId: 'symbols', industries: ['tattoo', 'walkin'] },
    { id: 'pentagram',     label: 'Pentagram',      categoryId: 'symbols', industries: ['tattoo'] },
    { id: 'sigil',         label: 'Sigil',          categoryId: 'symbols', industries: ['tattoo'] },
    { id: 'runes',         label: 'Runes',          categoryId: 'symbols', industries: ['tattoo'] },

    // ── Mythical (10) ────────────────────────────────────────────
    { id: 'phoenix',       label: 'Phoenix',        categoryId: 'mythical', industries: ['tattoo', 'walkin'] },
    { id: 'dragon',        label: 'Dragon',         categoryId: 'mythical', industries: ['tattoo'] },
    { id: 'mermaid',       label: 'Mermaid',        categoryId: 'mythical', industries: ['tattoo', 'hawaii-souvenir'] },
    { id: 'pegasus',       label: 'Pegasus',        categoryId: 'mythical', industries: ['tattoo'] },
    { id: 'unicorn',       label: 'Unicorn',        categoryId: 'mythical', industries: ['tattoo', 'walkin'] },
    { id: 'gargoyle',      label: 'Gargoyle',       categoryId: 'mythical', industries: ['tattoo'] },
    { id: 'demon',         label: 'Demon',          categoryId: 'mythical', industries: ['tattoo'] },
    { id: 'angel',         label: 'Angel',          categoryId: 'mythical', industries: ['tattoo', 'walkin'] },
    { id: 'goddess',       label: 'Goddess',        categoryId: 'mythical', industries: ['tattoo'] },
    { id: 'kraken',        label: 'Kraken',         categoryId: 'mythical', industries: ['tattoo'] },

    // ── Celestial (8) ────────────────────────────────────────────
    { id: 'sun',           label: 'Sun',            categoryId: 'celestial', industries: ['*'] },
    { id: 'moon',          label: 'Moon',           categoryId: 'celestial', industries: ['*'] },
    { id: 'stars',         label: 'Stars',          categoryId: 'celestial', industries: ['*'] },
    { id: 'constellation', label: 'Constellation',  categoryId: 'celestial', industries: ['tattoo', 'walkin'] },
    { id: 'galaxy',        label: 'Galaxy',         categoryId: 'celestial', industries: ['tattoo'] },
    { id: 'planet',        label: 'Planet',         categoryId: 'celestial', industries: ['tattoo'] },
    { id: 'comet',         label: 'Comet',          categoryId: 'celestial', industries: ['tattoo'] },
    { id: 'eclipse',       label: 'Eclipse',        categoryId: 'celestial', industries: ['tattoo'] },

    // ── Plants & Botanical (8) ───────────────────────────────────
    { id: 'palm-tree',     label: 'Palm Tree',      categoryId: 'plants', industries: ['hawaii-souvenir', 'walkin', 'tattoo'] },
    { id: 'oak-tree',      label: 'Oak Tree',       categoryId: 'plants', industries: ['tattoo'] },
    { id: 'willow-tree',   label: 'Willow Tree',    categoryId: 'plants', industries: ['tattoo'] },
    { id: 'mushroom',      label: 'Mushroom',       categoryId: 'plants', industries: ['tattoo', 'walkin'] },
    { id: 'succulent',     label: 'Succulent',      categoryId: 'plants', industries: ['tattoo', 'walkin'] },
    { id: 'ivy',           label: 'Ivy',            categoryId: 'plants', industries: ['tattoo'] },
    { id: 'fern',          label: 'Fern',           categoryId: 'plants', industries: ['tattoo', 'walkin'] },
    { id: 'pineapple',     label: 'Pineapple',      categoryId: 'plants', industries: ['hawaii-souvenir', 'walkin', 'tattoo'] },

    // ── Hawaiian / Polynesian (12) ───────────────────────────────
    { id: 'tiki',          label: 'Tiki Head',      categoryId: 'hawaiian', industries: ['hawaii-souvenir', 'tattoo'] },
    { id: 'honu',          label: 'Honu (Sea Turtle)', categoryId: 'hawaiian', industries: ['hawaii-souvenir', 'tattoo'] },
    { id: 'manta-ray',     label: 'Manta Ray',      categoryId: 'hawaiian', industries: ['hawaii-souvenir', 'tattoo'] },
    { id: 'hammerhead',    label: 'Hammerhead Shark', categoryId: 'hawaiian', industries: ['hawaii-souvenir', 'tattoo'] },
    { id: 'lei',           label: 'Lei',            categoryId: 'hawaiian', industries: ['hawaii-souvenir'] },
    { id: 'gecko',         label: 'Gecko',          categoryId: 'hawaiian', industries: ['hawaii-souvenir', 'walkin'] },
    { id: 'petroglyph',    label: 'Petroglyph',     categoryId: 'hawaiian', industries: ['hawaii-souvenir', 'tattoo'] },
    { id: 'mokulua',       label: 'Mokulua Twin Islands', categoryId: 'hawaiian', industries: ['hawaii-souvenir'] },
    { id: 'diamond-head',  label: 'Diamond Head',   categoryId: 'hawaiian', industries: ['hawaii-souvenir'] },
    { id: 'mauna-kea',     label: 'Mauna Kea',      categoryId: 'hawaiian', industries: ['hawaii-souvenir', 'tattoo'] },
    { id: 'wave-hawaii',   label: 'Pipeline Wave',  categoryId: 'hawaiian', industries: ['hawaii-souvenir', 'tattoo'] },
    { id: 'surfboard',     label: 'Surfboard',      categoryId: 'hawaiian', industries: ['hawaii-souvenir'] },

    // ── Objects (14) ─────────────────────────────────────────────
    { id: 'dagger',        label: 'Dagger',         categoryId: 'objects', industries: ['tattoo', 'walkin'] },
    { id: 'sword',         label: 'Sword',          categoryId: 'objects', industries: ['tattoo'] },
    { id: 'key',           label: 'Key',            categoryId: 'objects', industries: ['tattoo', 'walkin'] },
    { id: 'lock',          label: 'Lock',           categoryId: 'objects', industries: ['tattoo', 'walkin'] },
    { id: 'hourglass',     label: 'Hourglass',      categoryId: 'objects', industries: ['tattoo'] },
    { id: 'clock',         label: 'Clock',          categoryId: 'objects', industries: ['tattoo'] },
    { id: 'lantern',       label: 'Lantern',        categoryId: 'objects', industries: ['tattoo'] },
    { id: 'rope',          label: 'Rope',           categoryId: 'objects', industries: ['tattoo'] },
    { id: 'chain',         label: 'Chain',          categoryId: 'objects', industries: ['tattoo'] },
    { id: 'candle',        label: 'Candle',         categoryId: 'objects', industries: ['tattoo'] },
    { id: 'skull',         label: 'Skull',          categoryId: 'objects', industries: ['tattoo', 'walkin'] },
    { id: 'hand',          label: 'Hand',           categoryId: 'objects', industries: ['tattoo'] },
    { id: 'eye',           label: 'Eye',            categoryId: 'objects', industries: ['tattoo', 'walkin'] },
    { id: 'crown',         label: 'Crown',          categoryId: 'objects', industries: ['tattoo', 'walkin'] },

    // ── Lettering & Script (7) ──────────────────────────────────
    { id: 'initial',       label: 'Single Initial', categoryId: 'lettering', industries: ['*'] },
    { id: 'name-script',   label: 'Name in Script', categoryId: 'lettering', industries: ['*'] },
    { id: 'quote',         label: 'Quote / Phrase', categoryId: 'lettering', industries: ['tattoo', 'walkin'] },
    { id: 'love-text',     label: '"Love"',         categoryId: 'lettering', industries: ['walkin'] },
    { id: 'ohana-text',    label: '"ʻOhana"',       categoryId: 'lettering', industries: ['hawaii-souvenir'] },
    { id: 'aloha-text',    label: '"Aloha"',        categoryId: 'lettering', industries: ['hawaii-souvenir'] },
    { id: 'roman-numeral', label: 'Roman Numerals', categoryId: 'lettering', industries: ['tattoo', 'walkin'] },

    // ── Pop Culture (5) ──────────────────────────────────────────
    { id: 'stitch',        label: 'Stitch (Lilo & Stitch)', categoryId: 'pop-culture', industries: ['walkin', 'hawaii-souvenir'] },
    { id: 'pikachu',       label: 'Pikachu',        categoryId: 'pop-culture', industries: ['walkin'] },
    { id: 'mickey',        label: 'Mickey Mouse',   categoryId: 'pop-culture', industries: ['walkin'] },
    { id: 'hello-kitty',   label: 'Hello Kitty',    categoryId: 'pop-culture', industries: ['walkin'] },
    { id: 'demogorgon',    label: 'Demogorgon (Stranger Things)', categoryId: 'pop-culture', industries: ['walkin'] },
  ],
}

/**
 * Returns true if the item's industries list applies to the given industry.
 */
export function itemAppliesToIndustry(item: MotifItem, industryId: string): boolean {
  return item.industries.includes('*') || item.industries.includes(industryId)
}

/**
 * Filter the library down to items applicable to a single industry, and drop
 * any categories that have zero applicable items.
 */
export function filterLibraryByIndustry(library: MotifLibrary, industryId: string): MotifLibrary {
  const items = library.items.filter(i => itemAppliesToIndustry(i, industryId))
  const usedCategoryIds = new Set(items.map(i => i.categoryId))
  const categories = library.categories.filter(c => usedCategoryIds.has(c.id))
  return { categories, items }
}
