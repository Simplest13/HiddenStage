import {
  Award,
  Cake,
  Calendar,
  Camera,
  MapPin,
  Music,
  Palette,
  Sparkles,
  Star,
  Users,
  Utensils,
  Video,
} from 'kubai-icons-react'

export interface CategoryIconProps {
  slug: string
  size?: number
  color?: string
  className?: string
}

export function CategoryIcon({ slug, size = 34, color = '#ffffff', className }: CategoryIconProps) {
  const s = (slug || '').toLowerCase()
  if (s.includes('photo')) return <Camera size={size} color={color} className={className} />
  if (s.includes('video') || s.includes('film') || s.includes('cinemat')) return <Video size={size} color={color} className={className} />
  if (s.includes('music') || s.includes('dj') || s.includes('sound') || s.includes('audio') || s.includes('band')) return <Music size={size} color={color} className={className} />
  if (s.includes('food') || s.includes('cater') || s.includes('menu')) return <Utensils size={size} color={color} className={className} />
  if (s.includes('cake') || s.includes('dessert') || s.includes('bake') || s.includes('drink') || s.includes('bar')) return <Cake size={size} color={color} className={className} />
  if (s.includes('space') || s.includes('venue') || s.includes('hall') || s.includes('resort') || s.includes('locat')) return <MapPin size={size} color={color} className={className} />
  if (s.includes('plan') || s.includes('coord') || s.includes('manage')) return <Calendar size={size} color={color} className={className} />
  if (s.includes('decor') || s.includes('styl') || s.includes('flor') || s.includes('design') || s.includes('light')) return <Sparkles size={size} color={color} className={className} />
  if (s.includes('makeup') || s.includes('hair') || s.includes('beauty') || s.includes('mehendi') || s.includes('mehndi')) return <Palette size={size} color={color} className={className} />
  if (s.includes('entertain') || s.includes('host') || s.includes('anchor') || s.includes('emcee') || s.includes('performer')) return <Users size={size} color={color} className={className} />
  if (s.includes('hire') || s.includes('crew') || s.includes('staff')) return <Award size={size} color={color} className={className} />
  return <Star size={size} color={color} className={className} />
}
