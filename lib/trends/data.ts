import type { IndustryDataset, StyleStrand } from './types'

const tattooStyles: StyleStrand[] = [
  {
    id: 'americana-traditional',
    label: 'Americana Traditional',
    tagline: 'Bold lines, limited palette, eternal',
    description:
      'Sailor Jerry, Bert Grimm, Ed Hardy lineage. Heavy black outlines, a tight palette of red/yellow/green/black, classic motifs (eagles, daggers, panthers, pin-ups). Built to age well across 40+ years on skin.',
    origin: 1900,
    ancestors: [],
    curve: [
      { year: 1920, value: 35 },
      { year: 1945, value: 78 },
      { year: 1960, value: 55 },
      { year: 1975, value: 30 },
      { year: 1990, value: 38 },
      { year: 2005, value: 70 },
      { year: 2015, value: 84 },
      { year: 2022, value: 88 },
      { year: 2025, value: 82 },
    ],
    signals: ['nostalgia', 'craft revival', 'analog backlash', 'durability bias'],
    tags: ['bold', 'iconographic', 'colored', 'heritage'],
    pioneers: ['Sailor Jerry Collins', 'Bert Grimm', 'Ed Hardy'],
  },
  {
    id: 'fine-line',
    label: 'Fine Line / Single Needle',
    tagline: 'Whisper-thin lines, micro detail',
    description:
      'Single-needle origins in 1970s East LA prison and Chicano scenes (Jack Rudy, Freddy Negrete, Charlie Cartwright at Good Time Charlie\'s). Resurfaced as celebrity-friendly micro tattoos around 2005, then exploded post-2017 with Dr. Woo and Instagram-native artists.',
    origin: 1970,
    ancestors: ['black-grey-chicano'],
    curve: [
      { year: 1975, value: 42 },
      { year: 1985, value: 55 },
      { year: 1995, value: 28 },
      { year: 2005, value: 48 },
      { year: 2015, value: 70 },
      { year: 2020, value: 88 },
      { year: 2024, value: 95 },
      { year: 2025, value: 96 },
    ],
    signals: ['minimalism', 'instagram-native', 'celebrity adoption', 'micro detail'],
    tags: ['delicate', 'minimal', 'monochrome', 'modern'],
    pioneers: ['Jack Rudy', 'Freddy Negrete', 'Dr. Woo', 'JonBoy'],
  },
  {
    id: 'black-grey-chicano',
    label: 'Black & Grey Chicano',
    tagline: 'Photorealism in soft greys, smoky shading',
    description:
      'Born in 1970s LA from prison-yard single-needle work. Religious iconography, lowrider culture, smoke and roses. Bridge between fine line and full realism.',
    origin: 1970,
    ancestors: [],
    curve: [
      { year: 1975, value: 38 },
      { year: 1990, value: 65 },
      { year: 2005, value: 78 },
      { year: 2015, value: 68 },
      { year: 2022, value: 60 },
      { year: 2025, value: 64 },
    ],
    signals: ['heritage', 'realism', 'storytelling'],
    tags: ['monochrome', 'smoky', 'cultural'],
    pioneers: ['Mister Cartoon', 'Chuey Quintanar'],
  },
  {
    id: 'tribal',
    label: 'Tribal / Polynesian',
    tagline: 'Solid black geometry rooted in Oceania',
    description:
      'True Polynesian (Tatau, Marquesan, Samoan) is millennia old. Western "tribal" shorthand peaked in the 1990s post-grunge. Authentic Polynesian work has steadily climbed since 2010 alongside indigenous reclamation.',
    origin: 1980,
    ancestors: [],
    curve: [
      { year: 1990, value: 60 },
      { year: 1998, value: 92 },
      { year: 2005, value: 70 },
      { year: 2012, value: 30 },
      { year: 2018, value: 38 },
      { year: 2024, value: 52 },
      { year: 2025, value: 56 },
    ],
    signals: ['cultural reclamation', 'indigenous craft', 'bold shapes'],
    tags: ['blackwork', 'cultural', 'pattern'],
  },
  {
    id: 'realism',
    label: 'Photo Realism',
    tagline: 'Skin as a print, every pore rendered',
    description:
      'Emerged in the late 1990s with rotary machines and refined cartridges; matured around 2010 with hyperrealism. High-effort, high-skill style that competes with portraiture and oil painting.',
    origin: 1995,
    ancestors: ['black-grey-chicano'],
    curve: [
      { year: 2000, value: 35 },
      { year: 2010, value: 70 },
      { year: 2017, value: 86 },
      { year: 2022, value: 78 },
      { year: 2025, value: 70 },
    ],
    signals: ['technical mastery', 'portrait commission', 'memorial'],
    tags: ['detailed', 'modern', 'monochrome'],
    pioneers: ['Nikko Hurtado', 'Bob Tyrrell'],
  },
  {
    id: 'micro-realism',
    label: 'Micro Realism',
    tagline: 'Realism shrunk to a coin',
    description:
      'Korean and Spanish scenes (Inal Bersekov, Eva Krbdk) compressed full realism into 2-inch panels with fine line outlines. Defined the late 2010s Instagram aesthetic of pets, flowers and tiny still lifes.',
    origin: 2014,
    ancestors: ['fine-line', 'realism'],
    curve: [
      { year: 2016, value: 30 },
      { year: 2019, value: 65 },
      { year: 2022, value: 88 },
      { year: 2025, value: 86 },
    ],
    signals: ['instagram-native', 'collectible', 'small format'],
    tags: ['minimal', 'detailed', 'modern'],
    pioneers: ['Inal Bersekov', 'Eva Krbdk'],
  },
  {
    id: 'neo-traditional',
    label: 'Neo-Traditional',
    tagline: 'Traditional bones, painterly skin',
    description:
      'Expands Americana with deeper palettes, soft gradients, art nouveau line weights. Late-2000s wave (Jeff Gogue, Russ Abbott) into a steady mainstream presence.',
    origin: 2005,
    ancestors: ['americana-traditional'],
    curve: [
      { year: 2008, value: 45 },
      { year: 2015, value: 78 },
      { year: 2020, value: 80 },
      { year: 2025, value: 72 },
    ],
    signals: ['painterly', 'palette expansion', 'illustrative'],
    tags: ['colored', 'illustrative', 'modern'],
  },
  {
    id: 'new-school',
    label: 'New School',
    tagline: 'Cartoonish, bulging, candy-colored',
    description:
      'Mid-1990s Skribblz / Marcus Pacheco era. Exaggerated proportions, 3D rendering, graffiti DNA. Faded after 2005, low-key revival forming in collaboration with cyber sigilism artists.',
    origin: 1990,
    ancestors: ['americana-traditional'],
    curve: [
      { year: 1995, value: 55 },
      { year: 2002, value: 78 },
      { year: 2010, value: 35 },
      { year: 2020, value: 18 },
      { year: 2025, value: 26 },
    ],
    signals: ['cartoon revival', 'graffiti', 'maximalist color'],
    tags: ['colored', 'illustrative', 'maximal'],
  },
  {
    id: 'japanese-irezumi',
    label: 'Japanese Irezumi',
    tagline: 'Bodysuits, koi, dragons, wind bars',
    description:
      'Edo-period roots. Western adoption surged in the 1980s through Horiyoshi III and Don Ed Hardy. Steady, slow-burning popularity; never a fad, never the lead.',
    origin: 1700,
    ancestors: [],
    curve: [
      { year: 1985, value: 55 },
      { year: 2000, value: 60 },
      { year: 2015, value: 65 },
      { year: 2025, value: 60 },
    ],
    signals: ['heritage', 'large scale', 'narrative'],
    tags: ['colored', 'heritage', 'pattern'],
    pioneers: ['Horiyoshi III'],
  },
  {
    id: 'blackwork',
    label: 'Blackwork',
    tagline: 'Saturated black geometry and ornament',
    description:
      'Distinct from tribal; descends from European etching, mehndi, sacred geometry. Strongly tied to ornamental, mandala and dotwork. Steady riser since 2012.',
    origin: 2008,
    ancestors: ['tribal'],
    curve: [
      { year: 2012, value: 40 },
      { year: 2018, value: 70 },
      { year: 2022, value: 78 },
      { year: 2025, value: 74 },
    ],
    signals: ['ornament', 'sacred geometry', 'monochrome maximalism'],
    tags: ['blackwork', 'pattern', 'modern'],
  },
  {
    id: 'dotwork',
    label: 'Dotwork / Stippling',
    tagline: 'Tonal shading made of dots',
    description:
      'Xed LeHead-era dotwork from the 1990s Berlin scene. Used as a shading vocabulary inside ornamental and geometric. Rarely the headline, often the substrate.',
    origin: 1992,
    ancestors: [],
    curve: [
      { year: 1998, value: 30 },
      { year: 2010, value: 55 },
      { year: 2018, value: 70 },
      { year: 2025, value: 64 },
    ],
    signals: ['craft', 'patience', 'texture'],
    tags: ['blackwork', 'pattern'],
  },
  {
    id: 'geometric',
    label: 'Geometric',
    tagline: 'Sacred geometry, ruler-true lines',
    description:
      'Mandala and sacred geometry boom around 2013, often paired with dotwork or fine line. Now a substyle backbone for ornamental and cyber sigilism.',
    origin: 2010,
    ancestors: ['dotwork', 'blackwork'],
    curve: [
      { year: 2013, value: 55 },
      { year: 2018, value: 78 },
      { year: 2022, value: 70 },
      { year: 2025, value: 62 },
    ],
    signals: ['symmetry', 'meditation', 'craft'],
    tags: ['blackwork', 'pattern', 'modern'],
  },
  {
    id: 'watercolor',
    label: 'Watercolor',
    tagline: 'Splashes, drips, no outlines',
    description:
      'Early-2010s viral aesthetic (Ondrash). Aged poorly; popularity peaked then fell as collectors saw 5-year results. Lives on as an accent inside neo-traditional.',
    origin: 2010,
    ancestors: ['neo-traditional'],
    curve: [
      { year: 2013, value: 70 },
      { year: 2017, value: 78 },
      { year: 2021, value: 45 },
      { year: 2025, value: 28 },
    ],
    signals: ['painterly', 'no outline', 'pinterest era'],
    tags: ['colored', 'illustrative'],
  },
  {
    id: 'trash-polka',
    label: 'Trash Polka',
    tagline: 'Red and black collage chaos',
    description:
      'Buena Vista Tattoo Club, Germany. Early 2010s peak. Photorealism + brushstrokes + typographic noise.',
    origin: 2008,
    ancestors: ['realism'],
    curve: [
      { year: 2012, value: 60 },
      { year: 2016, value: 70 },
      { year: 2022, value: 32 },
      { year: 2025, value: 24 },
    ],
    signals: ['collage', 'editorial', 'bold contrast'],
    tags: ['colored', 'maximal', 'modern'],
  },
  {
    id: 'cyber-sigilism',
    label: 'Cyber Sigilism',
    tagline: 'Y2K chrome meets occult linework',
    description:
      'A 2020+ TikTok-fueled fusion: tribal silhouettes, fine line execution, sigil and Y2K typography. Compresses the canonical 22-year cycle to ~4 years end-to-end.',
    origin: 2020,
    ancestors: ['fine-line', 'tribal', 'blackwork'],
    curve: [
      { year: 2021, value: 28 },
      { year: 2023, value: 70 },
      { year: 2025, value: 88 },
    ],
    signals: ['tiktok-native', 'y2k revival', 'gen-z occult', 'fast cycle'],
    tags: ['blackwork', 'pattern', 'modern', 'fusion'],
  },
  {
    id: 'illustrative-anime',
    label: 'Illustrative / Anime',
    tagline: 'Manga lineart, cel shading',
    description:
      'Driven by post-2018 anime mainstreaming. Big in Asia and Latin America. Often colored, often single-panel comp.',
    origin: 2015,
    ancestors: ['new-school', 'neo-traditional'],
    curve: [
      { year: 2018, value: 40 },
      { year: 2022, value: 70 },
      { year: 2025, value: 78 },
    ],
    signals: ['fandom', 'streaming', 'illustration'],
    tags: ['colored', 'illustrative', 'modern'],
  },
  {
    id: 'ignorant-handpoke',
    label: 'Ignorant / Handpoke',
    tagline: 'Wonky lines, deliberate amateurism',
    description:
      'Fuzi Uvtpk-led 2010s scene; handpoke made it portable. Reads as anti-craft but is a craft of its own. Pairs with fine line on a single sleeve.',
    origin: 2009,
    ancestors: [],
    curve: [
      { year: 2012, value: 35 },
      { year: 2018, value: 62 },
      { year: 2022, value: 70 },
      { year: 2025, value: 64 },
    ],
    signals: ['anti-craft', 'punk', 'flash culture'],
    tags: ['minimal', 'illustrative', 'modern'],
  },
  {
    id: 'ornamental',
    label: 'Ornamental',
    tagline: 'Lace, jewelry, body-as-frame',
    description:
      'Decorative blackwork descended from mehndi and Eastern European ornament. Used as clothing-line work that follows anatomy.',
    origin: 2014,
    ancestors: ['blackwork', 'dotwork'],
    curve: [
      { year: 2016, value: 45 },
      { year: 2020, value: 70 },
      { year: 2024, value: 80 },
      { year: 2025, value: 78 },
    ],
    signals: ['anatomical', 'craft', 'feminine maximalism'],
    tags: ['blackwork', 'pattern', 'modern'],
  },
]

export const TATTOO_DATASET: IndustryDataset = {
  industry: {
    id: 'tattoo',
    label: 'Tattoo',
    blurb: 'Cycle window 18-25 years, compressing toward 6-10 since 2017.',
    status: 'active',
  },
  styles: tattooStyles,
  cycleNotes: [
    'Sailor Jerry Americana peaked ~1945, dipped, came back hard ~2005 and has held the lead among under-30 collectors for two decades.',
    'Fine line shows two distinct waves: 1975-1985 East LA single-needle, then a Dr. Woo / Instagram explosion 2017-now.',
    'Tribal sat dormant ~2008-2018 then re-emerged as cyber sigilism — a clear "fusion-driven" comeback rather than a faithful one.',
    'Watercolor is a textbook accelerated cycle: 7-year peak-to-trough vs the canonical 22, killed by visible aging.',
  ],
  yearRange: { start: 1900, end: 2030 },
}

export const FASHION_DATASET: IndustryDataset = {
  industry: {
    id: 'fashion',
    label: 'Fashion',
    blurb: 'Scaffold dataset — bell bottoms, mod, grunge, Y2K. Add your own strands.',
    status: 'scaffold',
  },
  styles: [
    {
      id: 'bell-bottoms',
      label: 'Bell Bottoms',
      tagline: 'Flared denim, hip-hugger waist',
      description: '1970s peak, late-1990s revival, low-rise flare 2022-now.',
      origin: 1965,
      ancestors: [],
      curve: [
        { year: 1972, value: 90 },
        { year: 1980, value: 30 },
        { year: 1998, value: 78 },
        { year: 2005, value: 35 },
        { year: 2022, value: 70 },
        { year: 2025, value: 78 },
      ],
      signals: ['silhouette', 'denim', 'nostalgia'],
      tags: ['silhouette', 'denim'],
    },
    {
      id: 'mod-60s',
      label: 'Mod (60s)',
      tagline: 'A-line, monochrome, geometric prints',
      description: 'British 1960s peak, Hedi Slimane echoes 2005, microtrend 2024.',
      origin: 1960,
      ancestors: [],
      curve: [
        { year: 1965, value: 90 },
        { year: 1985, value: 28 },
        { year: 2005, value: 60 },
        { year: 2018, value: 35 },
        { year: 2025, value: 52 },
      ],
      signals: ['geometric', 'monochrome', 'pop'],
      tags: ['silhouette', 'graphic'],
    },
  ],
  cycleNotes: ['Add fashion strands; engine works once you have at least 3 peaks.'],
  yearRange: { start: 1950, end: 2030 },
}

export const MUSIC_DATASET: IndustryDataset = {
  industry: {
    id: 'music',
    label: 'Music',
    blurb: 'Scaffold — drop genre curves to predict the next sonic revival.',
    status: 'scaffold',
  },
  styles: [],
  cycleNotes: [],
  yearRange: { start: 1960, end: 2030 },
}

export const INTERIOR_DATASET: IndustryDataset = {
  industry: {
    id: 'interior',
    label: 'Interior Design',
    blurb: 'Scaffold — add mid-century, brutalist, cottagecore strands here.',
    status: 'scaffold',
  },
  styles: [],
  cycleNotes: [],
  yearRange: { start: 1950, end: 2030 },
}

export const DATASETS: Record<string, IndustryDataset> = {
  tattoo: TATTOO_DATASET,
  fashion: FASHION_DATASET,
  music: MUSIC_DATASET,
  interior: INTERIOR_DATASET,
}

export function getDataset(id: string): IndustryDataset {
  return DATASETS[id] ?? TATTOO_DATASET
}
