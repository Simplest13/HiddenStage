import type { ApiQuotation, ApiQuoteItem, ApiQuoteRevision } from './types'

/**
 * Acceptance follows the server rules in `apps/commitments/services.py`:
 * - a package is all-or-nothing (every item sharing `package_key`);
 * - a requirement inside a package can only be accepted with that package;
 * - individual service lines are accepted per requirement.
 */
export type AcceptanceOption = {
  id: string
  kind: 'PACKAGE' | 'LINE'
  packageKey: string | null
  requirementId: string | null
  title: string
  description: string
  amountPaise: number
  items: ApiQuoteItem[]
}

export type AcceptanceSelection = { packageKeys: string[]; requirementIds: string[] }

export function acceptanceOptions(revision: ApiQuoteRevision): AcceptanceOption[] {
  const packages = new Map<string, ApiQuoteItem[]>()
  const options: AcceptanceOption[] = []

  for (const item of revision.items) {
    if (item.package_key) {
      packages.set(item.package_key, [...(packages.get(item.package_key) ?? []), item])
    }
  }
  for (const [packageKey, items] of packages) {
    options.push({
      id: `package:${packageKey}`,
      kind: 'PACKAGE',
      packageKey,
      requirementId: null,
      title: packageKey.replace(/[-_]+/g, ' ').replace(/^\w/, (character) => character.toUpperCase()),
      description: items.map((item) => item.title).join(' · '),
      amountPaise: items.reduce((total, item) => total + item.amount_paise, 0),
      items,
    })
  }
  for (const item of revision.items) {
    if (item.package_key) continue
    options.push({
      id: `requirement:${item.requirement}`,
      kind: 'LINE',
      packageKey: null,
      requirementId: item.requirement,
      title: item.requirement_title || item.title,
      description: item.description || item.title,
      amountPaise: item.amount_paise,
      items: [item],
    })
  }
  return options
}

export function selectionFromOptions(options: AcceptanceOption[], selectedIds: Iterable<string>): AcceptanceSelection {
  const selected = new Set(selectedIds)
  const packageKeys = new Set<string>()
  const requirementIds = new Set<string>()
  for (const option of options) {
    if (!selected.has(option.id)) continue
    if (option.kind === 'PACKAGE' && option.packageKey) packageKeys.add(option.packageKey)
    if (option.kind === 'LINE' && option.requirementId) requirementIds.add(option.requirementId)
  }
  return { packageKeys: [...packageKeys], requirementIds: [...requirementIds] }
}

export function selectionTotal(options: AcceptanceOption[], selectedIds: Iterable<string>) {
  const selected = new Set(selectedIds)
  return options.filter((option) => selected.has(option.id)).reduce((total, option) => total + option.amountPaise, 0)
}

/** The revision the organiser can act on: latest submitted, still valid, not expired. */
export function actionableRevision(quotation: ApiQuotation): ApiQuoteRevision | null {
  const submitted = quotation.revisions.find((revision) => revision.status === 'SUBMITTED')
  if (!submitted) return null
  if (!submitted.valid_until) return submitted
  return submitted.valid_until >= new Date().toISOString().slice(0, 10) ? submitted : null
}

export function latestRevision(quotation: ApiQuotation): ApiQuoteRevision | null {
  return quotation.revisions.find((revision) => revision.status === 'SUBMITTED')
    ?? quotation.revisions.slice().sort((a, b) => b.revision_number - a.revision_number)[0]
    ?? null
}

export function quotationTotal(quotation: ApiQuotation) {
  return latestRevision(quotation)?.total_paise ?? 0
}
