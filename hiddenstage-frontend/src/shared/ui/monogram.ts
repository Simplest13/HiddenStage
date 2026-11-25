import type { IconName } from './Icon'

const categoryIconMap: Array<[RegExp, IconName]> = [
  [/space|venue/i, 'mapPin'],
  [/food|cater/i, 'briefcase'],
  [/music|performance/i, 'music'],
  [/photo/i, 'camera'],
  [/video/i, 'video'],
  [/decor|styl/i, 'flower'],
  [/dj|sound/i, 'music'],
  [/host/i, 'users'],
  [/plan/i, 'calendar'],
]

export function categoryIconName(name: string): IconName {
  return categoryIconMap.find(([pattern]) => pattern.test(name))?.[1] ?? 'star'
}

export function providerInitials(name: string) {
  const words = name.replace(/\(demo\)/gi, '').split(/[\s&]+/).filter(Boolean)
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join('') || 'HS'
}
