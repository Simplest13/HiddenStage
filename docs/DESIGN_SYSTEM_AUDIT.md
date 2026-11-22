# Design System Audit

This document inventories current tokens and inconsistencies only. No styles were changed.

## Defined light-theme tokens

Source: [global stylesheet](../hiddenstage-frontend/src/index.css).

| Group | Token values |
|---|---|
| Base palette | `--color-white: #ffffff`; `--color-rose: #f8b6c1`; `--color-rose-soft: #fef4f6`; `--color-rose-light: #fce7eb`; `--color-rose-border: #f5c4cd`; `--color-espresso: #6b3e26`; `--color-espresso-dark: #3a1e11`; `--color-espresso-light: #8a5336`; `--color-orange: #ff7a00`; `--color-orange-hover: #e66e00`; `--color-orange-active: #cc6200`; `--color-orange-soft: #fff3e6`; `--color-orange-light: #ffe5cc`; `--color-black: #000000`; `--color-obsidian: #120a06`; `--color-dark-surface: #1e100a`. |
| Semantic aliases | `--color-primary → --color-orange`; `--color-primary-hover → --color-orange-hover`; `--color-burgundy → --color-orange`; `--color-gold → --color-orange`; `--color-walnut → --color-espresso`; `--color-champagne → --color-rose`; `--color-indigo` and `--color-midnight → --color-espresso-dark`. |
| Surface/text/status | `--color-canvas: #fff9fc`; `--color-paper: #ffffff`; `--color-paper-bright: #ffffff`; `--color-surface: #ffffff`; `--color-tint: #fef4f6`; `--color-tint-strong: #fce7eb`; `--color-ink` and `--color-text: #1a1215`; `--color-muted` and `--color-text-muted: #6b3e26`; `--color-accent → --color-orange`; `--color-accent-dark → --color-orange-hover`; `--color-accent-soft → --color-orange-soft`; `--color-border` and `--color-line: #f3e1e5`; `--color-line-strong: #e4c5cc`; `--color-success: #1f7a46`; `--color-success-soft: #eaf7ef`; `--color-warning: #b35900`; `--color-danger: #c42b2b`; `--color-danger-soft: #fde8e8`. |
| Typography | `--font-body` and `--font-ui: 'Segoe UI', system-ui, -apple-system, sans-serif`; `--font-display: 'Palatino Linotype', 'Book Antiqua', Georgia, serif`. |
| Spacing | `--space-1: .25rem`; `--space-2: .5rem`; `--space-3: .75rem`; `--space-4: 1rem`; `--space-5: 1.25rem`; `--space-6: 1.5rem`; `--space-8: 2rem`; `--space-10: 2.5rem`; `--space-12: 3rem`; `--space-16: 4rem`; `--space-20: 5rem`. |
| Radius | `--radius-sm: 6px`; `--radius-md: 10px`; `--radius-lg: 16px`; `--radius-pill: 999px`. |
| Shadows | `--shadow-soft: 0 2px 8px rgba(107,62,38,.06), 0 12px 30px rgba(107,62,38,.08)`; `--shadow-lift: 0 4px 12px rgba(107,62,38,.1), 0 20px 48px rgba(107,62,38,.14)`; `--shadow-header: 0 1px 0 rgba(107,62,38,.08), 0 4px 20px rgba(107,62,38,.04)`; `--shadow-orange: 0 4px 14px rgba(255,122,0,.28)`. |
| Layout | `--content-width: 1200px`; `--header-height: 4.75rem`; `--breakpoint-tablet: 900px`; `--breakpoint-desktop: 1120px`. |

## Dark-theme overrides

`[data-theme="dark"]` sets: canvas `#111019`; paper/surface `#1a1926`; paper-bright `#232234`; tint `#241d2c`; tint-strong `#32263c`; ink/text `#f4f0f8`; muted/text-muted `#a8a0b8`; indigo `#f4f0f8`; espresso `#f4f0f8`; espresso-dark `#ffffff`; border/line `#2e2a42`; line-strong `#433d5e`; orange-soft `rgba(255,122,0,.15)`; rose-soft `rgba(248,182,193,.12)`; and dark variants of the three base shadows. Other base tokens retain their light values unless overridden by a consuming component.

## Observed inconsistencies (not changed)

- Workspace chrome retains dark-brown hard-coded backgrounds and light text; the global dark theme uses a plum/charcoal surface palette. This can make dashboard shell appearance diverge from token-driven surfaces.
- The workspace admin-switch link references `--color-primary-600` (undefined globally) with a hard-coded indigo fallback (`#4f46e5`), inconsistent with the orange primary alias.
- Discovery styles reference `--font-heading`, which is not a global font token; a fallback is used. Several discovery rules also retain older palette fallbacks such as slate/indigo and `#fdfbf7`.
- Multiple screens use direct hex/RGB values and component-local colors instead of the shared palette. The customer/provider dashboard also includes direct icon colors. This is a consistency observation, not a measured contrast/accessibility result.
- A CSS reference scan found additional undeclared custom-property names (`--accent`, `--accent-bg`, `--accent-border`, `--border`, `--color-cream`, `--shadow`, `--social-bg`, `--text-h`) in addition to the two examples above; some references may provide `var()` fallbacks. Runtime impact was not assessed.
- `workspaceConfig.ts` uses emoji and miscellaneous text glyphs for navigation icons, while feature screens use the icon package; icon style is not uniform.

## Proposed (not implemented)

Consolidate remaining hard-coded colors and font references only after visual review, define explicit light/dark token contracts for workspace chrome, and validate contrast per state. The audit makes no visual recommendation that changes current style behavior.

## Evidence limits

Token values are source-extracted, not screenshot-measured. No browser matrix, contrast audit, or visual regression run was performed. No styles or theme behavior were changed.
