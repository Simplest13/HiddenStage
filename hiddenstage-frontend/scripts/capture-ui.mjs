import { chromium } from 'playwright'

const base = 'http://127.0.0.1:5173'
const out = 'screens'
const browser = await chromium.launch()

const customerSession = {
  id: 'customer-one',
  fullName: 'Ananya Rao',
  email: 'ananya@example.test',
  emailVerified: true,
  profileCompleted: true,
  accountType: 'CUSTOMER',
}
const customerProfile = {
  fullName: 'Ananya Rao',
  email: 'ananya@example.test',
  phone: '9876543210',
  pinCode: '560038',
  locality: 'Indiranagar',
  city: 'Bengaluru',
  state: 'Karnataka',
  completedAt: new Date().toISOString(),
}
const iso = '2027-02-12T12:00:00.000Z'
const customerEvent = {
  id: 'event-one',
  name: 'Ananya & Dev — garden reception',
  type: 'Wedding',
  description: 'An intimate garden reception for family and close friends.',
  date: '2027-02-12',
  startTime: '17:00',
  endTime: '22:00',
  guestCount: 90,
  pinCode: '560038',
  locality: 'Indiranagar',
  city: 'Bengaluru',
  state: 'Karnataka',
  venueName: 'The Garden House',
  address: '12 Main Road, Indiranagar',
  requirements: [
    { id: 'r1', category: 'food-and-drink', title: 'Vegetarian dinner catering', description: 'Seasonal vegetarian menu for 90 guests.', budget: 120000, instructions: '' },
    { id: 'r2', category: 'photography', title: 'Evening photography', description: 'Candid coverage from 4pm to 10pm.', budget: 60000, instructions: '' },
  ],
  attachments: [],
  status: 'Submitted',
  createdAt: iso,
  updatedAt: iso,
}
const providerSession = {
  id: 'provider-one',
  fullName: 'Rae Studio',
  email: 'rae@example.test',
  emailVerified: true,
  profileCompleted: true,
  accountType: 'PROVIDER',
}
const providerProfile = {
  displayName: 'Rae Studio',
  description: 'A small styling studio focused on calm tablescapes, seasonal flowers, and warm, low-key celebrations.',
  contact: 'hello@raestudio.test',
  categories: ['decor-and-styling'],
  coverage: [{ pinCode: '560038', locality: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka' }],
  completedAt: new Date().toISOString(),
}

async function newPage(seed) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  if (seed) {
    await context.addInitScript(seed)
  }
  const page = await context.newPage()
  return { context, page }
}

const customerSeed = () => {
  sessionStorage.setItem('hiddenstage.demo.session.v1', JSON.stringify(__customerSession))
  localStorage.setItem('hiddenstage.demo.customer-profile.v1.customer-one', JSON.stringify(__customerProfile))
  localStorage.setItem('hiddenstage.demo.events.v1.customer-one', JSON.stringify(__customerEvents))
}
const providerSeed = () => {
  sessionStorage.setItem('hiddenstage.demo.session.v1', JSON.stringify(__providerSession))
  localStorage.setItem('hiddenstage.demo.provider-profile.v1.provider-one', JSON.stringify(__providerProfile))
  localStorage.setItem('hiddenstage.demo.provider-services.v1.provider-one', JSON.stringify(__providerServices))
}

async function shot(page, name, fullPage = true) {
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${out}/${name}.png`, fullPage })
  console.log('captured', name, page.url())
}

// Public pages
{
  const { context, page } = await newPage()
  for (const [name, path] of [
    ['home-desktop', '/'],
    ['services-desktop', '/services'],
    ['providers-desktop', '/providers'],
    ['how-it-works-desktop', '/how-it-works'],
    ['contact-desktop', '/contact'],
    ['login-desktop', '/auth/login'],
    ['register-desktop', '/auth/register'],
  ]) {
    await page.goto(base + path, { waitUntil: 'networkidle' })
    await shot(page, name)
  }
  await page.goto(base + '/providers', { waitUntil: 'networkidle' })
  const profileHref = await page.locator('a[href^="/providers/"]').first().getAttribute('href')
  if (profileHref) {
    await page.goto(base + profileHref, { waitUntil: 'networkidle' })
    await shot(page, 'provider-profile-desktop')
  }
  await context.close()
}

// Customer workspace
{
  const { context, page } = await newPage(`(${customerSeed.toString().replace('__customerSession', JSON.stringify(customerSession)).replace('__customerProfile', JSON.stringify(customerProfile)).replace('__customerEvents', JSON.stringify([customerEvent]))})()`)
  for (const [name, path] of [
    ['dashboard-desktop', '/app'],
    ['requests-desktop', '/app/events'],
    ['event-detail-desktop', '/app/events/event-one'],
    ['wizard-step1-desktop', '/app/events/new'],
    ['quotes-desktop', '/app/customer/quotes'],
  ]) {
    await page.goto(base + path, { waitUntil: 'networkidle' })
    await shot(page, name)
  }
  await context.close()
}

// Provider workspace
{
  const seed = `(${providerSeed.toString().replace('__providerSession', JSON.stringify(providerSession)).replace('__providerProfile', JSON.stringify(providerProfile)).replace('__providerServices', JSON.stringify([{ id: 's1', category: 'decor-and-styling', title: 'Tablescape styling', description: 'Seasonal tables, florals and place settings.', basePricePaise: 4500000, isActive: true }]))})()`
  const { context, page } = await newPage(seed)
  for (const [name, path] of [
    ['provider-dashboard-desktop', '/app/provider'],
    ['provider-services-desktop', '/app/provider/services'],
    ['provider-coverage-desktop', '/app/provider/coverage'],
    ['provider-inbox-desktop', '/app/provider/requests'],
  ]) {
    await page.goto(base + path, { waitUntil: 'networkidle' })
    await shot(page, name)
  }
  await context.close()
}

// Onboarding
{
  const seed = `(function () {
    sessionStorage.setItem('hiddenstage.demo.session.v1', JSON.stringify({ id: 'new-customer', fullName: 'Mira Sen', email: 'mira@example.test', emailVerified: true, profileCompleted: false, accountType: 'CUSTOMER' }))
  })()`
  const { context, page } = await newPage(seed)
  await page.goto(base + '/onboarding/customer', { waitUntil: 'networkidle' })
  await shot(page, 'onboarding-customer-desktop')
  await context.close()
}
{
  const seed = `(function () {
    sessionStorage.setItem('hiddenstage.demo.session.v1', JSON.stringify({ id: 'new-provider', fullName: 'Nila Events', email: 'nila@example.test', emailVerified: true, profileCompleted: false, accountType: 'PROVIDER' }))
  })()`
  const { context, page } = await newPage(seed)
  await page.goto(base + '/onboarding/provider', { waitUntil: 'networkidle' })
  await shot(page, 'onboarding-provider-desktop')
  await context.close()
}

// Mobile
{
  const { context, page } = await newPage()
  await page.setViewportSize({ width: 390, height: 844 })
  for (const [name, path] of [
    ['home-mobile', '/'],
    ['services-mobile', '/services'],
    ['providers-mobile', '/providers'],
  ]) {
    await page.goto(base + path, { waitUntil: 'networkidle' })
    await shot(page, name)
  }
  await context.close()
}
{
  const { context, page } = await newPage(`(${customerSeed.toString().replace('__customerSession', JSON.stringify(customerSession)).replace('__customerProfile', JSON.stringify(customerProfile)).replace('__customerEvents', JSON.stringify([customerEvent]))})()`)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(base + '/app', { waitUntil: 'networkidle' })
  await shot(page, 'dashboard-mobile')
  await page.goto(base + '/app/events/new', { waitUntil: 'networkidle' })
  await shot(page, 'wizard-mobile')
  await context.close()
}

await browser.close()
