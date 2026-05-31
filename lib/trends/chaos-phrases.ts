/**
 * Chaos-direction phrase library. Each phrase is short stylistic anchor text
 * that gets injected into bulk batch prompts to steer the aesthetic.
 *
 * Schema design:
 * - Each phrase has ONE primary category (where it lives by default).
 * - Each phrase has MANY tags — these cross-cut categories so the user can
 *   browse all "japanese" phrases regardless of original heading, or all
 *   "dotwork" phrases, etc.
 *
 * No duplication is needed because tags handle the cross-cutting.
 */

export interface ChaosCategory {
  id: string
  label: string
  description?: string
}

export interface ChaosTag {
  id: string
  label: string
}

export interface ChaosPhrase {
  id: string
  phrase: string
  description?: string
  categoryId: string
  tagIds?: string[]
}

export interface ChaosPhraseLibrary {
  categories: ChaosCategory[]
  tags: ChaosTag[]
  phrases: ChaosPhrase[]
}

export const CHAOS_CATEGORIES: ChaosCategory[] = [
  { id: 'art-movements',     label: 'Art Movements & Periods',     description: 'Historical and contemporary art-movement aesthetics.' },
  { id: 'specific-artists',  label: 'Specific Artist Styles',      description: 'Named artists whose visual signatures are model-recognizable.' },
  { id: 'cultural-regional', label: 'Cultural & Regional',          description: 'Cultural traditions, regional folk art, indigenous styles.' },
  { id: 'material-printmaking', label: 'Material & Printmaking',    description: 'References to physical media and printing techniques.' },
  { id: 'era-decade',        label: 'Era & Decade Vibes',          description: 'Time-period aesthetic signals.' },
  { id: 'mood-energy',       label: 'Mood & Emotional Energy',     description: 'Emotional/atmospheric color and feeling.' },
  { id: 'line-technique',    label: 'Line & Technique Focus',      description: 'Specific linework, shading, and rendering techniques.' },
  { id: 'compositional',     label: 'Compositional Angles',        description: 'How the subject is arranged within the frame.' },
  { id: 'subculture-craft',  label: 'Subculture & Craft Traditions', description: 'Tattoo subgenres and craft traditions.' },
  { id: 'genre-concept',     label: 'Genre & Concept References',  description: 'Narrative or genre framings.' },
  { id: 'subtle-variation',  label: 'Subtle Variation',            description: 'For tight within-batch micro-variation. Same drawing, different breath.' },
  { id: 'stamp-flash',       label: 'Stamp Flash',                 description: 'Postage-stamp framed vignette aesthetic.' },
]

export const CHAOS_TAGS: ChaosTag[] = [
  { id: 'japanese',    label: 'Japanese' },
  { id: 'floral',      label: 'Floral' },
  { id: 'dotwork',     label: 'Dotwork' },
  { id: 'vintage',     label: 'Vintage' },
  { id: 'gothic',      label: 'Gothic' },
  { id: 'religious',   label: 'Religious' },
  { id: 'mystical',    label: 'Mystical / Occult' },
  { id: 'minimalist',  label: 'Minimalist' },
  { id: 'ornate',      label: 'Ornate' },
  { id: 'traditional', label: 'Traditional (tattoo)' },
  { id: 'horror',      label: 'Horror' },
  { id: 'whimsical',   label: 'Whimsical' },
  { id: 'bold',        label: 'Bold / High Contrast' },
  { id: 'delicate',    label: 'Delicate / Fine Line' },
  { id: 'geometric',   label: 'Geometric' },
  { id: 'folk',        label: 'Folk Art' },
  { id: 'modernist',   label: 'Modernist' },
  { id: 'celestial',   label: 'Celestial' },
  { id: 'nautical',    label: 'Nautical' },
  { id: 'western',     label: 'Western Americana' },
  { id: 'dark',        label: 'Dark / Dramatic' },
  { id: 'raw',         label: 'Raw / Unpolished' },
  { id: 'tribal',      label: 'Tribal' },
  { id: 'ancient',     label: 'Ancient' },
  { id: 'spiritual',   label: 'Spiritual / Sacred' },
  { id: 'scientific',  label: 'Scientific / Specimen' },
  { id: 'sci-fi',      label: 'Sci-Fi' },
  { id: 'mythical',    label: 'Mythical' },
  { id: 'dreamy',      label: 'Dreamy / Surreal' },
  { id: 'type',        label: 'Typographic' },
  { id: 'dynamic',     label: 'Dynamic Motion' },
  { id: 'realism',     label: 'Realism' },
]

/** Helper for keeping the seed terse. */
function p(
  id: string,
  phrase: string,
  description: string,
  categoryId: string,
  tagIds: string[] = [],
): ChaosPhrase {
  return { id, phrase, description, categoryId, tagIds }
}

export const CHAOS_PHRASES_SEED: ChaosPhrase[] = [
  // ───── Art Movements & Periods ─────────────────────────────────────────
  p('art-nouveau-organic-flow',      'art nouveau organic flow',           'Whip-curve lines, asymmetric florals, Mucha-style ornament', 'art-movements', ['floral','ornate','vintage']),
  p('ukiyo-e-japanese-woodblock',    'ukiyo-e Japanese woodblock',         'Flat composition, stylized waves/clouds, expressive faces', 'art-movements', ['japanese','traditional','vintage']),
  p('art-deco-geometric-symmetry',   'art deco geometric symmetry',        'Fan-shapes, zigzags, formal mirror compositions, gold-leaf feel', 'art-movements', ['geometric','vintage','ornate']),
  p('bauhaus-reductive-minimalism',  'Bauhaus reductive minimalism',       'Pure geometry, primary colors implied, no decoration', 'art-movements', ['minimalist','geometric','modernist']),
  p('memphis-design-playful',        'Memphis design playful',             'Mismatched pattern blocks, bright squiggles, 80s zine energy', 'art-movements', ['bold','whimsical','vintage']),
  p('futurism-dynamic-motion',       'futurism dynamic motion lines',      'Speed lines, fragmented forms, machine-age energy', 'art-movements', ['modernist','dynamic','vintage']),
  p('aubrey-beardsley-decadent',     'Aubrey Beardsley decadent',          'Heavy blacks, intricate organic borders, art-nouveau erotica energy', 'art-movements', ['ornate','gothic','vintage','bold']),
  p('constructivist-propaganda',     'constructivist propaganda poster',   'Heavy diagonals, bold reds, blocky lettering vibe', 'art-movements', ['bold','vintage','modernist']),
  p('surrealist-dream-logic',        'surrealist dream logic',             'Melting forms, impossible geometry, Dalí-flavored absurdity', 'art-movements', ['dreamy','mystical']),
  p('cubist-fractured-plane',        'cubist fractured plane',             'Multiple angles at once, geometric subject deconstruction', 'art-movements', ['geometric','modernist']),
  p('expressionist-raw-mark',        'expressionist raw mark',             'Aggressive linework, distorted proportions, emotional weight', 'art-movements', ['raw','bold']),
  p('pre-raphaelite-ornate',         'pre-Raphaelite ornate detail',       'Heavy decoration, mythological undertone, dense floral borders', 'art-movements', ['floral','ornate','mythical','vintage']),
  p('impressionist-soft-edges',      'impressionist soft edges',           'Loose hatching, dissolved outlines, atmospheric haze', 'art-movements', ['delicate','dreamy']),
  p('pop-art-flat-fills',            'pop art bold flat fills',            'Lichtenstein dots, comic-strip outlines, screen-print look', 'art-movements', ['bold','vintage']),
  p('minimalist-single-line',        'minimalist single-line drawing',     'Continuous unbroken line, one stroke total', 'art-movements', ['minimalist','delicate']),
  p('op-art-retinal-pattern',        'op art retinal pattern',             'Optical illusions, vibrating stripes, repeated geometric loops', 'art-movements', ['geometric','modernist']),

  // ───── Specific Artist Styles ──────────────────────────────────────────
  p('mucha-floral-framing',          'Alphonse Mucha floral framing',      'Stylized woman framed by botanical halos, gold-leaf feel', 'specific-artists', ['floral','ornate','vintage']),
  p('sailor-jerry-traditional',      'Sailor Jerry traditional',           'American traditional, bold outlines, limited palette implied', 'specific-artists', ['traditional','bold','vintage']),
  p('don-ed-hardy-fusion',           'Don Ed Hardy fusion',                'American-Japanese mashup, dense compositions, bold color blocks', 'specific-artists', ['japanese','traditional','bold']),
  p('horiyoshi-iii-irezumi',         'Horiyoshi III irezumi',              'Japanese traditional bodysuit aesthetic, mythological figures', 'specific-artists', ['japanese','traditional','ornate','mythical']),
  p('giger-biomechanical',           'H. R. Giger biomechanical',          'Industrial flesh, hex-grid bone, sci-fi dread', 'specific-artists', ['horror','sci-fi','gothic','dark']),
  p('dore-engraving',                'Gustave Doré engraving',             'Dramatic crosshatching, biblical-grandeur composition', 'specific-artists', ['religious','gothic','vintage','ornate']),
  p('durer-woodcut',                 'Albrecht Dürer woodcut',             'Fine crosshatched detail, renaissance precision', 'specific-artists', ['vintage','religious','delicate']),
  p('yoshitoshi-yokai',              'Yoshitoshi Tsukioka',                'Late Edo period yokai/horror, refined ukiyo-e', 'specific-artists', ['japanese','horror','traditional']),
  p('hokusai-wave',                  'Hokusai wave composition',           'Spiraling water, stylized Mount Fuji, blue palette implied', 'specific-artists', ['japanese','traditional','dynamic']),
  p('escher-impossible',             'M.C. Escher impossible geometry',    'Tessellations, recursive figures, perspective tricks', 'specific-artists', ['geometric','mystical']),
  p('schiele-jagged',                'Egon Schiele jagged line',           'Angular bodies, exposed nerve quality, raw', 'specific-artists', ['raw','modernist']),
  p('moebius-clean-scifi',           'Jean Giraud Moebius',                'Clean sci-fi linework, surreal landscape detail', 'specific-artists', ['sci-fi','modernist','dreamy']),
  p('junji-ito-horror',              'Junji Ito horror detail',            'Obsessive hatching, body horror, spiral motifs', 'specific-artists', ['japanese','horror','gothic','delicate']),

  // ───── Cultural & Regional ─────────────────────────────────────────────
  p('japanese-irezumi-traditional',  'Japanese irezumi traditional',       'Tebori-influenced bodysuit elements, mythological', 'cultural-regional', ['japanese','traditional','ornate']),
  p('ukiyo-e-print',                 'ukiyo-e woodblock print',            'Flat composition, stylized waves/clouds, expressive faces', 'cultural-regional', ['japanese','traditional','vintage']),
  p('polynesian-tribal',             'Polynesian tribal density',          'Repeating geometric pattern fills, no negative space', 'cultural-regional', ['tribal','geometric','bold']),
  p('maori-moko',                    'Maori moko spiritual',               'Curvilinear facial-pattern spirals, sacred geometry', 'cultural-regional', ['tribal','spiritual','geometric']),
  p('hawaiian-petroglyph',           'Hawaiian petroglyph',                'Stick-figure abstraction, ancient stone-carved look', 'cultural-regional', ['tribal','ancient','minimalist']),
  p('hawaiian-kapa',                 'Hawaiian floral kapa',               'Bark-cloth printing, repeating botanical stamps', 'cultural-regional', ['floral','tribal','folk']),
  p('russian-criminal',              'Russian criminal tattoo iconography','Cathedral domes, barbed wire, stark Soviet symbolism', 'cultural-regional', ['traditional','religious','dark']),
  p('mexican-folk-bright',           'Mexican folk art bright',            'Talavera tile patterns, Day of the Dead motifs, dense color', 'cultural-regional', ['folk','bold','vintage']),
  p('dia-de-los-muertos',            'Día de los Muertos sugar skull',     'Ornate decorated skull, marigold and rose framing', 'cultural-regional', ['folk','mystical','ornate']),
  p('indian-mehndi',                 'Indian mehndi intricate',            'Henna-fine paisley patterns, dense organic curves', 'cultural-regional', ['ornate','delicate','floral']),
  p('persian-miniature',             'Persian miniature ornate',           'Tiny meticulous detail, gold-leaf borders implied', 'cultural-regional', ['ornate','delicate','vintage']),
  p('tibetan-thangka',               'Tibetan thangka sacred',             'Mandala structure, deity-figure symmetry', 'cultural-regional', ['religious','spiritual','ornate']),
  p('aztec-codex',                   'Aztec codex symbolism',              'Glyphic pictograms, mesoamerican stepped patterns', 'cultural-regional', ['geometric','ancient','tribal']),
  p('celtic-knotwork',               'Celtic knotwork interlace',          'Endless interwoven cords, no clear start/end', 'cultural-regional', ['geometric','ornate','tribal']),
  p('viking-runestone',              'Viking runestone carving',           'Norse animal interlace, blocky angular runes', 'cultural-regional', ['tribal','ancient','geometric']),
  p('egyptian-hieroglyphic',         'Egyptian hieroglyphic',              'Profile silhouettes, side-view stylization, cartouche framing', 'cultural-regional', ['ancient','religious']),
  p('inuit-print',                   'Inuit print stylization',            'Bold black-and-white animal silhouettes, Arctic motifs', 'cultural-regional', ['tribal','minimalist','bold']),
  p('aboriginal-dot',                'Aboriginal dot painting',            'Dot-cluster fill patterns, dreamtime symbolism', 'cultural-regional', ['dotwork','tribal','spiritual']),
  p('african-adinkra',               'African Adinkra symbol',             'Stamped geometric ideograms, dense pattern fields', 'cultural-regional', ['geometric','tribal','folk']),
  p('byzantine-icon',                'Byzantine icon reverence',           'Gold-halo formality, frontal pose, religious gravitas', 'cultural-regional', ['religious','ornate','vintage']),

  // ───── Material & Printmaking ──────────────────────────────────────────
  p('linocut-block',                 'linocut block print',                'Chunky line weight, gouged-out negative space', 'material-printmaking', ['bold']),
  p('woodcut-high-contrast',         'woodcut high contrast',              'Coarser than linocut, grain-suggesting edges', 'material-printmaking', ['vintage','bold']),
  p('scrimshaw',                     'scrimshaw whalebone etching',        'Fine line scratched into bone, sailor-art feel', 'material-printmaking', ['nautical','delicate','vintage']),
  p('copperplate-engraving',         'copperplate engraving',              'Ultra-fine parallel hatching, banknote precision', 'material-printmaking', ['delicate','vintage']),
  p('metal-etching',                 'metal etching plate',                'Bitten line acid-etched depth, antique illustration', 'material-printmaking', ['delicate','vintage']),
  p('stained-glass',                 'stained glass leaded sections',      'Thick black borders separating flat color zones', 'material-printmaking', ['religious','geometric','ornate','bold']),
  p('mosaic-tile',                   'mosaic tile arrangement',            'Pixel-like small tile patterns forming the image', 'material-printmaking', ['geometric','ornate']),
  p('ink-wash-bleed',                'ink-wash brush bleed',               'Sumi-e wet brush gradient, controlled mess', 'material-printmaking', ['japanese','delicate']),
  p('silkscreen-poster',             'silkscreen poster',                  'Flat color overlays, slight registration off', 'material-printmaking', ['vintage','bold']),
  p('risograph',                     'Risograph print',                    'Limited color overprints, dotted texture, zine feel', 'material-printmaking', ['vintage','whimsical']),
  p('cyanotype',                     'cyanotype blueprint',                'Pure blue-on-white silhouette, photogram aesthetic', 'material-printmaking', ['vintage','minimalist','delicate']),
  p('embroidered-patch',             'embroidered patch',                  'Visible stitch lines, satin-thread fills', 'material-printmaking', ['folk','ornate']),
  p('papercut-silhouette',           'paper cut silhouette',               'Stark white-on-black or black-on-white cutout shapes', 'material-printmaking', ['minimalist','bold']),
  p('letterpress',                   'letterpress impression',             'Deep-pressed type and image, vintage print quality', 'material-printmaking', ['vintage','type']),
  p('charcoal-smudge',               'charcoal smudge raw',                'Soft graphite gradients, smudged shadow areas', 'material-printmaking', ['raw','delicate']),
  p('pencil-sketch',                 'pencil sketch underdrawing',         'Visible construction lines, unfinished feel', 'material-printmaking', ['raw','delicate']),
  p('oil-pastel',                    'oil pastel waxy',                    'Thick crayon-like strokes, layered color buildup', 'material-printmaking', ['bold']),
  p('watercolor-wet',                'watercolor wet edges',               'Pigment pooling at borders, soft bleeds', 'material-printmaking', ['delicate','whimsical']),

  // ───── Era & Decade Vibes ─────────────────────────────────────────────
  p('belle-epoque-1890s',            '1890s belle epoque ornate',          'Heavy decoration, gilded-frame energy', 'era-decade', ['vintage','ornate']),
  p('art-nouveau-paris-1900s',       '1900s art-nouveau Paris',            'Mucha-poster aesthetics', 'era-decade', ['vintage','floral','ornate']),
  p('flapper-deco-1920s',            '1920s flapper deco',                 'Sharp deco geometry + jazz-age glamour', 'era-decade', ['vintage','geometric','ornate']),
  p('wpa-1930s',                     '1930s WPA poster',                   'Bold flat colors, public-works idealism', 'era-decade', ['vintage','bold']),
  p('pinup-1940s',                   '1940s vintage pinup',                'Mid-century glamour with subtle pinup framing', 'era-decade', ['vintage']),
  p('atomic-diner-1950s',            '1950s atomic-age diner',             'Boomerang shapes, retrofuturism', 'era-decade', ['vintage','whimsical','sci-fi']),
  p('psychedelic-1960s',             '1960s psychedelic poster',           'Warped lettering forms, kaleidoscope swirl', 'era-decade', ['vintage','whimsical','dreamy']),
  p('prog-rock-1970s',               '1970s prog rock album cover',        'Roger Dean fantasy, gatefold scope', 'era-decade', ['vintage','dreamy','mythical']),
  p('vhs-box-1980s',                 '1980s VHS box art',                  'Airbrushed neon, action-adventure energy', 'era-decade', ['vintage','bold']),
  p('grunge-zine-1990s',             '1990s grunge zine',                  'Photocopier roughness, hand-drawn ransom-note quality', 'era-decade', ['vintage','raw']),
  p('y2k-early-internet',            'Y2K early internet aesthetic',       'Lens flares, gradient mesh, chrome typography', 'era-decade', ['vintage','whimsical']),
  p('flat-design-2010s',             '2010s flat design',                  'Pure geometric shapes, no shadows, Material Design simplicity', 'era-decade', ['minimalist','geometric']),
  p('victorian-botanical',           'Victorian botanical illustration',   'Precise scientific specimen drawing, latin labels', 'era-decade', ['vintage','floral','delicate','scientific']),
  p('illuminated-manuscript',        'medieval illuminated manuscript',    'Gold-leaf borders, gothic majuscule, marginalia', 'era-decade', ['religious','ornate','gothic','vintage']),
  p('renaissance-anatomy',           'Renaissance anatomical study',       'Da Vinci precision, exploded views, ink on paper', 'era-decade', ['vintage','delicate','scientific']),
  p('edwardian-scifi',               'Edwardian science fiction',          'Verne/Wells brass-and-rivet retrofuturism', 'era-decade', ['vintage','sci-fi']),

  // ───── Mood & Emotional Energy ─────────────────────────────────────────
  p('heavy-metal-album',             'heavy metal album cover energy',     'Dramatic peril, gothic typography, dark fantasy', 'mood-energy', ['gothic','bold','dark']),
  p('horror-movie-poster',           'horror movie poster dread',          'Backlit silhouette, dripping atmosphere', 'mood-energy', ['horror','dark']),
  p('childrens-book-whimsy',         "children's book whimsy",             'Friendly proportions, soft lines, warm naïveté', 'mood-energy', ['whimsical','delicate']),
  p('melancholy-victorian',          'melancholy Victorian',               'Withered florals, mourning ornament', 'mood-energy', ['gothic','vintage','ornate','floral']),
  p('punk-rock-zine',                'punk rock zine rough cut',           'Photocopy contrast, ransom-note collage', 'mood-energy', ['raw','bold','vintage']),
  p('religious-icon-reverence',      'religious icon reverence',           'Frontal gaze, gold halo, sacred geometry', 'mood-energy', ['religious','spiritual','ornate']),
  p('cyberpunk-neon',                'cyberpunk neon menace',              'Wireframe glow, dystopian density', 'mood-energy', ['sci-fi','dark','bold']),
  p('solarpunk-botanical',           'solarpunk hopeful botanical',        'Lush regrowth, futuristic-but-green', 'mood-energy', ['floral','whimsical','sci-fi']),
  p('cottagecore',                   'cottagecore pastoral',               'Soft florals, country-kitchen warmth', 'mood-energy', ['floral','delicate','whimsical']),
  p('dark-academia',                 'dark academia gothic',               'Old-library gravitas, ornate frames', 'mood-energy', ['gothic','ornate','vintage']),
  p('vaporwave',                     'vaporwave nostalgia',                'Pastel palettes, 80s grid, broken Greek bust', 'mood-energy', ['vintage','whimsical','dreamy']),
  p('liminal-space',                 'liminal space uncanny',              'Empty interiors, off-key perspective', 'mood-energy', ['dreamy','mystical']),
  p('cosmic-horror',                 'cosmic horror Lovecraftian',         'Indescribable geometry, tentacular hints', 'mood-energy', ['horror','mystical','dark']),
  p('monastic-contemplative',        'monastic quiet contemplative',       'Spare composition, silent reverence', 'mood-energy', ['religious','spiritual','minimalist']),
  p('carnival-sideshow',             'carnival sideshow garish',           'Wild lettering, exaggerated barker drama', 'mood-energy', ['bold','vintage','whimsical']),
  p('noir-shadow',                   'noir detective shadow',              'Hard angles of light, venetian-blind line breaks', 'mood-energy', ['gothic','dark','vintage']),
  p('pastoral-idyll',                'pastoral idyll',                     'Soft sunset, rolling-hill calm', 'mood-energy', ['delicate','floral','whimsical']),
  p('apocalyptic-overgrown',         'apocalyptic ruin overgrown',         'Decay reclaimed by vines, broken architecture', 'mood-energy', ['dark','floral','dreamy']),
  p('dreamcore',                     'dreamcore surreal soft',             'Pastel weirdness, off-logic composition', 'mood-energy', ['dreamy','whimsical']),

  // ───── Line & Technique Focus ──────────────────────────────────────────
  p('single-weight-line',            'single weight line only',            'One consistent line thickness throughout', 'line-technique', ['minimalist']),
  p('whisper-thin-single-needle',    'whisper-thin single needle',         'Ultra-fine hairline, almost ghosted', 'line-technique', ['delicate','minimalist']),
  p('bold-traditional-outline',      'bold traditional outline',           'Thick consistent black perimeter, fills inside', 'line-technique', ['bold','traditional']),
  p('heavy-blackwork-solid',         'heavy blackwork solid',              'Maximal black fill, silhouette-driven', 'line-technique', ['bold','dark']),
  p('dotwork-stippling-dense',       'dotwork stippling dense',            'Pure dot-built shading, no continuous lines', 'line-technique', ['dotwork','delicate']),
  p('crosshatching-parallel',        'crosshatching parallel',             'Strict directional hatching for tone', 'line-technique', ['delicate']),
  p('circular-hatching',             'circular hatching',                  'Curved hatching following form contours', 'line-technique', ['delicate']),
  p('negative-space-dominant',       'negative space dominant',            "Image emerges from what's NOT drawn", 'line-technique', ['minimalist','bold']),
  p('geometric-line-construction',   'geometric line construction',        'Visible angular framework, ruler-built', 'line-technique', ['geometric']),
  p('freehand-wobble',               'freehand wobble organic',            'Hand-drawn imperfection, no straight edges', 'line-technique', ['raw']),
  p('linework-only-no-shading',      'linework only no shading',           'Pure outline definition, no tone', 'line-technique', ['minimalist']),
  p('silhouette-detail-outline',     'silhouette with detail outline',     'Solid black shape + outlined inner detail', 'line-technique', ['bold','minimalist']),
  p('wash-and-line',                 'wash and line combination',          'Solid outlines + grey-wash interior shading', 'line-technique', ['delicate']),
  p('pointillism-dot-field',         'pointillism dot field',              'Image built entirely from dot density variations', 'line-technique', ['dotwork']),
  p('engraved-fine-line',            'engraved fine line',                 'Banknote-density parallel etching', 'line-technique', ['delicate','vintage']),

  // ───── Compositional Angles ───────────────────────────────────────────
  p('circular-mandala-layout',       'circular mandala layout',            'Radial symmetry, centered focal point', 'compositional', ['geometric','spiritual','ornate']),
  p('vertical-scroll',               'vertical scroll composition',        'Tall stacked elements reading top-to-bottom', 'compositional', ['japanese']),
  p('horizontal-banner',             'horizontal banner spread',           'Wide low-profile, frieze-like', 'compositional', ['vintage']),
  p('triangular-pyramid',            'triangular pyramid balance',         'Stable base, single apex focal point', 'compositional', ['geometric']),
  p('asymmetric-off-center',         'asymmetric off-center',              'Subject pushed to one edge, negative space dominates other', 'compositional', ['dynamic']),
  p('framed-within-border',          'framed within ornament border',      'Decorative cartouche surrounding the subject', 'compositional', ['ornate','vintage']),
  p('bursting-from-frame',           'bursting from frame edges',          'Subject breaking out of imagined box', 'compositional', ['dynamic','bold']),
  p('nested-fractal',                'nested fractal repeating',           'Self-similar pattern at multiple scales', 'compositional', ['geometric','mystical']),
  p('top-down-flat-lay',             'top-down flat-lay arrangement',      "Bird's-eye view, items laid out evenly", 'compositional', ['minimalist']),
  p('cross-section-anatomical',      'cross-section anatomical',           'Subject cut open to reveal interior', 'compositional', ['scientific']),
  p('exploded-view',                 'exploded view diagram',              'Components separated and labeled', 'compositional', ['scientific']),
  p('silhouette-profile',            'silhouette portrait profile',        'Pure side-view filled silhouette', 'compositional', ['bold','minimalist']),
  p('mirror-symmetric-heraldic',     'mirror-symmetric heraldic',          'Coat-of-arms style left-right mirror', 'compositional', ['geometric','ornate']),
  p('spiraling-vortex-inward',       'spiraling vortex inward',            'Lines drawing eye toward center', 'compositional', ['dynamic','mystical']),
  p('radiating-outward',             'radiating outward from center',      'Sun-burst lines pushing outward', 'compositional', ['dynamic','bold','celestial']),

  // ───── Subculture & Craft Traditions ──────────────────────────────────
  p('prison-stick-and-poke',         'prison stick-and-poke raw',          'Crude unpolished hand-poked aesthetic', 'subculture-craft', ['raw','traditional','dark']),
  p('american-traditional-bold',     'American traditional bold',          'Sailor Jerry / Norman Rockwell hybrid', 'subculture-craft', ['traditional','bold','vintage']),
  p('chicano-fine-line',             'chicano fine-line single needle',    'Smoky grey-wash, religious iconography', 'subculture-craft', ['delicate','religious','traditional']),
  p('neo-traditional-saturated',     'neo-traditional saturated',          'Modern colors + old-school structure', 'subculture-craft', ['traditional','bold']),
  p('blackwork-heavy-fill',          'blackwork heavy fill',               'Maximum black solid sections', 'subculture-craft', ['bold','dark']),
  p('geometric-blackwork-sacred',    'geometric blackwork sacred',         'Pattern blackwork with sacred geometry', 'subculture-craft', ['geometric','spiritual','bold','dark']),
  p('dotwork-mandala-spiritual',     'dotwork mandala spiritual',          'Hand-pulled stipple density', 'subculture-craft', ['dotwork','spiritual','geometric']),
  p('realism-portrait-grayscale',    'realism portrait grayscale',         'Photoreal greyscale rendering', 'subculture-craft', ['realism','delicate']),
  p('watercolor-splash-modern',      'watercolor splash modern',           'Wet-on-wet color bleed', 'subculture-craft', ['delicate','whimsical']),
  p('trash-polka',                   'trash polka chaos',                  'Black ink + red splatter + collage feel', 'subculture-craft', ['raw','bold','dark']),
  p('ignorant-style',                'ignorant style crude',               'Deliberately childlike, scribbly', 'subculture-craft', ['raw','whimsical']),
  p('single-line-minimalist',        'single-line minimalist',             'One continuous unbroken line', 'subculture-craft', ['minimalist','delicate']),
  p('script-lettering',              'script lettering only',              'Pure typographic composition', 'subculture-craft', ['type']),
  p('gothic-blackletter',            'gothic blackletter type',            'Old-English heavy-serif lettering vibe', 'subculture-craft', ['gothic','type','ornate']),
  p('graffiti-tag',                  'graffiti tag aesthetic',             'Spray-paint drips, wildstyle letterforms', 'subculture-craft', ['raw','bold','type']),

  // ───── Genre & Concept References ─────────────────────────────────────
  p('nautical-tradition',            'nautical maritime tradition',        'Anchors, roses, swallows, ship wheels', 'genre-concept', ['nautical','traditional','vintage']),
  p('western-frontier',              'western frontier americana',         'Cowboy silhouettes, cacti, eagle heraldry', 'genre-concept', ['western','vintage']),
  p('occult-esoteric',               'occult esoteric symbolism',          'Sigils, pentagrams, alchemical glyphs', 'genre-concept', ['mystical','dark','religious']),
  p('tarot-composition',             'tarot card composition',             'Iconic figure central, banner above and below', 'genre-concept', ['mystical','religious','vintage','ornate']),
  p('botanical-specimen',            'botanical specimen scientific',      'Latin-labeled scientific accuracy', 'genre-concept', ['floral','scientific','delicate','vintage']),
  p('entomology-pinned',             'entomology pinned specimen',         'Insect mounted under glass, lab precision', 'genre-concept', ['scientific','delicate','vintage']),
  p('vintage-circus-poster',         'vintage circus poster',              'Hand-lettered banners, scrollwork frames', 'genre-concept', ['vintage','bold','whimsical']),
  p('apothecary-label',              'apothecary label antique',           'Brown bottle, cursive label, mysterious tincture', 'genre-concept', ['vintage','mystical']),
  p('nautical-cartography',          'nautical map cartography',           'Sea-monster marginalia, compass roses', 'genre-concept', ['nautical','vintage','mythical']),
  p('astrology-celestial-chart',     'astrology celestial chart',          'Zodiac symbols, planetary alignments', 'genre-concept', ['mystical','celestial']),
  p('alchemy-lab',                   'alchemy laboratory',                 'Glassware, formulae, mystical symbols', 'genre-concept', ['mystical','scientific','dark']),
  p('medieval-bestiary',             'medieval bestiary',                  'Mythical creature catalog, monastic illustration', 'genre-concept', ['vintage','religious','mythical']),
  p('memento-mori',                  'Renaissance memento mori',           'Skull, hourglass, vanitas symbolism', 'genre-concept', ['vintage','religious','dark','mystical']),
  p('victorian-taxidermy',           'Victorian taxidermy',                'Anthropomorphic preserved animals', 'genre-concept', ['vintage','scientific','dark']),
  p('pulp-fiction-cover',            'pulp fiction cover',                 'Lurid dramatic action, period typography', 'genre-concept', ['vintage','bold']),

  // ───── Subtle Variation (new) — for tight within-batch micro-difference
  p('alternate-sketch-slight',       'alternate sketch of the same piece, slight line variation', "Same drawing, breath of the line differs slightly", 'subtle-variation', ['delicate']),
  p('redrawn-from-memory',           'redrawn from memory, same composition slightly different flow', 'Second attempt without re-tracing', 'subtle-variation', ['delicate']),
  p('second-pass-breathes',          'second pass of the same design, hand breathes differently', 'Energy of the artist shifts between attempts', 'subtle-variation', ['delicate']),
  p('artist-sketched-six-times',     'artist sketched this six times, each subtly distinct', 'Series of takes, each with its own micro-variation', 'subtle-variation', ['delicate']),
  p('variant-copy-next-sheet',       'variant copy on the next sheet of paper', 'Drawing immediately after the previous one', 'subtle-variation', ['delicate']),
  p('draft-pencil-over',             'draft pencil-over of the same piece', 'Re-traced version with subtle drift', 'subtle-variation', ['delicate','raw']),
  p('slightly-looser-hand',          'slightly looser hand on this attempt', 'Loose-energy variant', 'subtle-variation', ['delicate','raw']),
  p('slightly-tighter-hand',         'slightly tighter, more deliberate this time', 'Tighter-energy variant', 'subtle-variation', ['delicate']),
  p('warm-up-sketch-relaxed',        'warm-up sketch energy, same subject relaxed', 'Pre-coffee loose attempt', 'subtle-variation', ['delicate','raw']),
  p('final-clean-redraw',            'final clean redraw of the same piece', 'Polished final-pass attempt', 'subtle-variation', ['delicate']),
  p('practice-pass-pressure',        'practice pass — same elements, different pressure', 'Pressure-modulated re-attempt', 'subtle-variation', ['delicate']),
  p('line-weight-distribution',      'slight variation in line weight distribution', 'Same composition, weights redistributed', 'subtle-variation', ['delicate']),
  p('curve-emphasis-subtle',         'same composition, subtle differences in curve emphasis', 'Specific curves emphasized differently', 'subtle-variation', ['delicate']),
  p('mirror-trace-wobble',           'mirror-trace with hand wobble, same elements', 'Mirrored copy with natural hand drift', 'subtle-variation', ['delicate','raw']),
  p('identical-layout-breath',       'identical layout, breath differs in the linework', 'Same skeleton, different hand-breath', 'subtle-variation', ['delicate']),
  p('different-times-of-day',        'sketched at different times of day, same hand', 'Series spanning the artists day', 'subtle-variation', ['delicate']),
  p('fresh-morning-version',         'fresh morning version of the same piece', 'Energetic clean morning attempt', 'subtle-variation', ['delicate']),
  p('late-night-redraw',             'late-night redraw of the same design', 'Tired-energy variant', 'subtle-variation', ['delicate','raw']),
  p('end-of-shift-attempt',          'end-of-shift attempt, same piece', 'Worn-down final-pass variant', 'subtle-variation', ['delicate','raw']),
  p('subtle-leaf-curl',              'identical composition, slightly different leaf curl', 'One leaf or element subtly tweaked', 'subtle-variation', ['delicate','floral']),
  p('petal-angles-shifted',          'same piece, petal angles shifted a few degrees', 'Petals rotated minimally', 'subtle-variation', ['delicate','floral']),
  p('motif-gently-rotated',          'one motif gently rotated, everything else identical', 'A single element rotated, rest fixed', 'subtle-variation', ['delicate']),

  // ───── Stamp Flash ─────────────────────────────────────────────────────
  p('stamp-perforated-vignette',     'postage stamp border with perforated scalloped edges, small framed vignette, fine single-needle linework, whimsical illustrative', 'Vintage postage-stamp framed tattoo vignette', 'stamp-flash', ['whimsical','delicate','vintage','ornate']),
  p('stamp-tarot-frame',             'stamp-flash style with tarot-card scalloped border, illustrative vignette inside', 'Tarot-tinged stamp aesthetic', 'stamp-flash', ['mystical','vintage','ornate']),
  p('stamp-vintage-postage',         'small vintage postage stamp design with perforated edges, single tiny denomination price in corner, monochrome', 'Classic philately aesthetic', 'stamp-flash', ['vintage','minimalist','delicate']),
  p('stamp-zine-cutout',             'rough stamp-cutout frame with chunky perforated edges, zine-style interior illustration', 'Punk-zine take on stamp framing', 'stamp-flash', ['raw','bold','whimsical']),
]

export const CHAOS_LIBRARY_SEED: ChaosPhraseLibrary = {
  categories: CHAOS_CATEGORIES,
  tags: CHAOS_TAGS,
  phrases: CHAOS_PHRASES_SEED,
}
