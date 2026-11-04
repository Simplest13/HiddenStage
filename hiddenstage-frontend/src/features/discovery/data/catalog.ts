export type ServiceCategory = { slug: string; name: string; description: string; sampleOffering: string }

export const serviceCategories: ServiceCategory[] = [
  { slug: 'spaces', name: 'Spaces', description: 'Places with room for everyone and everything you have in mind.', sampleOffering: 'Private dining rooms and gathering spaces' },
  { slug: 'food-and-drink', name: 'Food & drink', description: 'Thoughtful menus, drinks, and service for the table.', sampleOffering: 'Seasonal menus and event catering' },
  { slug: 'music-and-performance', name: 'Music & performance', description: 'A sound or performance that gives the day its rhythm.', sampleOffering: 'Live acoustic sets and event music' },
  { slug: 'photography', name: 'Photography', description: 'A considered eye for the moments you want to keep.', sampleOffering: 'Event and portrait photography' },
  { slug: 'decor-and-styling', name: 'Decor & styling', description: 'A setting shaped around your occasion and point of view.', sampleOffering: 'Tablescapes and floral styling' },
  { slug: 'planning', name: 'Planning', description: 'A steady hand to bring the many details together.', sampleOffering: 'Event planning and coordination' },
]

export type DemoProvider = {
  id: string
  name: string
  categories: string[]
  description: string
  locality: string
  city: string
  pinCode: string
  coverage: string[]
  verificationStatus: 'approved' | 'notSubmitted'
  portfolio: string[]
}

// Fictional preview records. These are not real businesses or marketplace listings.
export const demoProviders: DemoProvider[] = [
  { id: 'studio-ambar', name: 'Studio Ambar (demo)', categories: ['decor-and-styling', 'planning'], description: 'A fictional styling studio concept focused on intimate tablescapes, seasonal details, and calm event coordination.', locality: 'Indiranagar', city: 'Bengaluru', pinCode: '560038', coverage: ['Bengaluru', 'Mysuru'], verificationStatus: 'approved', portfolio: ['Sample table setting', 'Demo floral palette'] },
  { id: 'the-small-feast', name: 'The Small Feast (demo)', categories: ['food-and-drink'], description: 'A fictional catering concept with flexible menus for family gatherings and small celebrations.', locality: 'Koregaon Park', city: 'Pune', pinCode: '411001', coverage: ['Pune', 'Pimpri-Chinchwad'], verificationStatus: 'notSubmitted', portfolio: ['Sample seasonal menu', 'Demo dining spread'] },
  { id: 'raag-room', name: 'Raag Room (demo)', categories: ['music-and-performance'], description: 'A fictional acoustic music collective concept for warm, low-key occasions.', locality: 'Bandra West', city: 'Mumbai', pinCode: '400050', coverage: ['Mumbai', 'Thane'], verificationStatus: 'notSubmitted', portfolio: ['Sample performance setup', 'Demo set list'] },
  { id: 'light-and-lens', name: 'Light & Lens (demo)', categories: ['photography'], description: 'A fictional photography profile concept built around natural light and candid event moments.', locality: 'Jubilee Hills', city: 'Hyderabad', pinCode: '500033', coverage: ['Hyderabad', 'Secunderabad'], verificationStatus: 'approved', portfolio: ['Sample portrait composition', 'Demo event detail'] },
  { id: 'courtyard-collective', name: 'Courtyard Collective (demo)', categories: ['spaces'], description: 'A fictional venue concept: an imagined courtyard for dinners, workshops, and small celebrations.', locality: 'Alwarpet', city: 'Chennai', pinCode: '600018', coverage: ['Chennai'], verificationStatus: 'notSubmitted', portfolio: ['Sample courtyard layout', 'Demo seating plan'] },
]

export function categoryName(slug: string) {
  return serviceCategories.find((category) => category.slug === slug)?.name ?? slug.replaceAll('-', ' ')
}
