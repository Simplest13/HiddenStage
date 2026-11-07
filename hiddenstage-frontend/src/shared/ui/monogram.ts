const categoryGlyphMap: Array<[RegExp, string]> = [
  [/space|venue/i, '⌂'],
  [/food|cater/i, '✦'],
  [/music|performance/i, '♪'],
  [/photo/i, '◉'],
  [/video/i, '▶'],
  [/decor|styl/i, '❀'],
  [/dj|sound/i, '♫'],
  [/host/i, '✧'],
  [/plan/i, '◷'],
]

export function categoryGlyph(name: string) {
  return categoryGlyphMap.find(([pattern]) => pattern.test(name))?.[1] ?? name.slice(0, 1).toUpperCase()
}

export function providerInitials(name: string) {
  const words = name.replace(/\(demo\)/gi, '').split(/[\s&]+/).filter(Boolean)
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join('') || 'HS'
}
