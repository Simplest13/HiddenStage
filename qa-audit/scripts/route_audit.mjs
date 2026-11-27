/**
 * HiddenStage route audit.
 *
 * Visits every discovered route as the role that owns it, recording HTTP status,
 * final URL, heading, blank-screen detection, console/page errors, failed API
 * requests and horizontal overflow. Fixtures come from seed_audit_data.py.
 *
 * Run from hiddenstage-frontend:
 *   node ../qa-audit/scripts/route_audit.mjs
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

// The script lives outside the frontend package, so resolve Playwright from the
// frontend's node_modules (run this from hiddenstage-frontend).
const require = createRequire(path.join(process.cwd(), 'package.json'))
const { chromium } = require('@playwright/test')

const BASE = process.env.AUDIT_WEB || 'http://127.0.0.1:5174'
const STATE = JSON.parse(fs.readFileSync(path.join(process.cwd(), '..', 'qa-audit', 'scripts', 'seed_state.json'), 'utf8'))
const OUT = path.join(process.cwd(), '..', 'qa-audit', 'scripts', 'route_audit_results.json')
const results = []

const PUBLIC = [
  ['/', 'home'], ['/my-networks', 'my networks'], ['/services', 'services'],
  ['/services/photography', 'service category'], ['/providers', 'providers'],
  [`/providers/${STATE.provider_profiles.manager}`, 'provider detail'],
  ['/how-it-works', 'how it works'], ['/for-professionals', 'for professionals'],
  ['/about', 'about'], ['/contact', 'contact'], ['/help', 'help'],
  ['/privacy', 'privacy'], ['/terms', 'terms'], ['/theme-preview', 'theme preview'],
  ['/auth/login', 'login'], ['/auth/register', 'register'], ['/auth/verify-email', 'verify email'],
  ['/auth/forgot-password', 'forgot password'], ['/auth/reset-password', 'reset password'],
  ['/403', 'forbidden'], ['/this-route-does-not-exist', 'not found'],
]

const CUSTOMER = [
  ['/app', 'customer dashboard'], ['/app/events', 'events'], ['/app/events/new', 'event create'],
  [`/app/events/${STATE.event_id}`, 'event detail'], [`/app/events/${STATE.event_id}/edit`, 'event edit'],
  [`/app/events/${STATE.event_id}/providers`, 'event providers'], [`/app/events/${STATE.event_id}/quotes`, 'event quotes'],
  ['/app/bookings', 'bookings'], ['/app/network', 'customer network'], ['/app/payments', 'payments'],
  ['/app/customer/quotes', 'customer quotes'], ['/app/customer/commitments', 'customer commitments'],
  ['/app/settings', 'settings'], ['/app/customer', 'legacy customer redirect'],
]

const PROVIDER = [
  ['/app/provider', 'provider dashboard'], ['/app/provider/profile', 'provider profile'],
  ['/app/provider/services', 'provider services'], ['/app/provider/coverage', 'coverage redirect'],
  ['/app/provider/opportunities', 'opportunities'], ['/app/provider/requests', 'request inbox'],
  ['/app/provider/quotes', 'provider quotes'], [`/app/provider/quotes/${STATE.event_id}`, 'quote editor'],
  ['/app/provider/commitments', 'provider commitments'], ['/app/provider/network', 'my network'],
  ['/app/provider/customer-network', 'customer network'], ['/app/provider/network/discover', 'discover workers'],
  ['/app/provider/assignments', 'assignments'], [`/app/provider/assignments/${STATE.assignment_id}`, 'assignment detail'],
  ['/app/provider/settings', 'provider settings'], ['/onboarding/provider', 'provider onboarding'],
]

const ADMIN = [
  ['/admin', 'admin overview'], ['/admin/businesses', 'admin businesses'],
  ['/admin/reviews', 'admin reviews'], ['/admin/audit', 'admin audit'],
  ['/app/admin', 'legacy admin redirect'],
]

async function login(page, email, admin = false) {
  await page.goto(`${BASE}${admin ? '/admin/login' : '/auth/login'}`, { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel(admin ? 'Password' : 'Password', { exact: true }).fill(STATE.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForFunction(
    (isAdmin) => isAdmin
      ? location.pathname.startsWith('/admin') && !location.pathname.startsWith('/admin/login')
      : !location.pathname.startsWith('/auth/login'),
    admin,
    { timeout: 30000 },
  )
  await page.waitForTimeout(800)
}

async function audit(page, route, label, viewport) {
  const consoleErrors = []
  const pageErrors = []
  const failedRequests = []
  const onConsole = (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300)) }
  const onPageError = (err) => pageErrors.push(String(err).slice(0, 300))
  const onFailed = (req) => {
    const failure = req.failure()
    if (failure) failedRequests.push(`${req.method()} ${req.url().replace(BASE, '')} :: ${failure.errorText}`)
  }
  page.on('console', onConsole)
  page.on('pageerror', onPageError)
  page.on('requestfailed', onFailed)

  let status = 0
  let navError = null
  try {
    const response = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    status = response ? response.status() : 0
    await page.waitForTimeout(1800)
  } catch (error) {
    navError = String(error).slice(0, 300)
  }

  const info = await page.evaluate(() => {
    const h1 = document.querySelector('h1')
    const main = document.querySelector('main') || document.body
    const text = (main?.innerText || '').trim()
    const spinner = document.querySelector('[role="status"], .spinner, .loading-state')
    return {
      heading: h1 ? h1.innerText.trim().slice(0, 120) : '',
      textLength: text.length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      spinner: spinner ? (spinner.innerText || 'present').trim().slice(0, 40) : '',
      title: document.title,
      bodyClass: document.body.className.slice(0, 80),
    }
  }).catch(() => ({ heading: '', textLength: 0, overflow: 0, spinner: '', title: '', bodyClass: '' }))

  page.off('console', onConsole)
  page.off('pageerror', onPageError)
  page.off('requestfailed', onFailed)

  const record = {
    role: page.__role, route, label, viewport,
    status, finalUrl: page.url().replace(BASE, ''),
    heading: info.heading, textLength: info.textLength,
    overflow: info.overflow, spinner: info.spinner,
    consoleErrors: [...new Set(consoleErrors)].slice(0, 6),
    pageErrors: [...new Set(pageErrors)].slice(0, 4),
    failedRequests: [...new Set(failedRequests)].slice(0, 6),
    navError,
  }
  record.pass =
    !navError &&
    status < 400 &&
    info.textLength > 40 &&
    !info.spinner &&
    info.overflow <= 2 &&
    record.pageErrors.length === 0 &&
    record.failedRequests.length === 0
  results.push(record)
  const flags = [
    navError ? 'NAV' : '', record.pageErrors.length ? 'JS' : '',
    record.failedRequests.length ? 'REQ' : '', info.overflow > 2 ? `OVERFLOW:${info.overflow}` : '',
    info.spinner ? 'STUCK' : '', info.textLength <= 40 ? 'BLANK' : '',
    status >= 400 ? `HTTP:${status}` : '',
  ].filter(Boolean).join(',')
  console.log(`${record.pass ? 'PASS' : 'FAIL'} | ${record.role.padEnd(9)} | ${route.padEnd(52)} | ${String(status).padEnd(3)} | ${info.heading.slice(0, 46).padEnd(46)} ${flags ? '| ' + flags : ''}`)
}

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  page.__role = 'anonymous'
  for (const [route, label] of PUBLIC) await audit(page, route, label, 'desktop')

  for (const [role, email, routes] of [
    ['customer', STATE.accounts.customer, CUSTOMER],
    ['manager', STATE.accounts.manager, PROVIDER],
    ['individual', STATE.accounts.individual, PROVIDER],
    ['associated', STATE.accounts.associated, PROVIDER],
    ['talent', STATE.accounts.talent, PROVIDER],
    ['worker', STATE.accounts.worker, PROVIDER],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const p = await ctx.newPage()
    p.__role = role
    await login(p, email)
    for (const [route, label] of routes) await audit(p, route, label, 'desktop')
    await ctx.close()
  }

  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const adminPage = await adminCtx.newPage()
  adminPage.__role = 'admin'
  await login(adminPage, STATE.accounts.admin, true)
  for (const [route, label] of ADMIN) await audit(adminPage, route, label, 'desktop')
  await adminCtx.close()

  // Responsive spot checks on the pages most likely to overflow.
  for (const [width, height, name] of [[768, 1024, 'tablet'], [390, 844, 'mobile']]) {
    const ctx = await browser.newContext({ viewport: { width, height } })
    const p = await ctx.newPage()
    p.__role = 'customer'
    await login(p, STATE.accounts.customer)
    for (const [route, label] of [['/', 'home'], ['/services', 'services'], ['/app', 'customer dashboard'], ['/app/events/new', 'event create'], ['/app/settings', 'settings']]) {
      await audit(p, route, label, name)
    }
    await ctx.close()

    const pctx = await browser.newContext({ viewport: { width, height } })
    const pp = await pctx.newPage()
    pp.__role = 'manager'
    await login(pp, STATE.accounts.manager)
    for (const [route, label] of [['/app/provider', 'provider dashboard'], ['/app/provider/quotes', 'provider quotes'], ['/app/provider/assignments', 'assignments']]) {
      await audit(pp, route, label, name)
    }
    await pctx.close()
  }

  await browser.close()
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2))
  const passed = results.filter((r) => r.pass).length
  console.log(`\n${passed}/${results.length} route checks passed`)
}

main().catch((error) => { console.error(error); process.exit(1) })
