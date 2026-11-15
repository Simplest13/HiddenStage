import { expect, test } from '@playwright/test'
import { completeProviderOnboarding, register, shot, unique } from './helpers'

const TAG = Date.now().toString(36).slice(-5)
const WORKER_NAME = `QA Network Worker ${TAG}`
const MANAGER_NAME = `QA Network Manager ${TAG}`

const base = {
  description: 'Network journey participant for invitation and association checks.',
  pin: '560001',
  locality: 'MG Road',
  city: 'Bengaluru',
  state: 'Karnataka',
}

test('manager invites an independent worker, who accepts and becomes associated', async ({ browser }) => {
  const workerContext = await browser.newContext()
  const worker = await workerContext.newPage()
  await register(worker, { email: unique('net-worker'), name: 'QA Network Worker User', type: 'PROVIDER' })
  await completeProviderOnboarding(worker, {
    ...base,
    name: WORKER_NAME,
    kind: 'WORKER',
    contact: '+919812345671',
  })

  const managerContext = await browser.newContext()
  const manager = await managerContext.newPage()
  await register(manager, { email: unique('net-manager'), name: 'QA Network Manager User', type: 'PROVIDER' })
  await completeProviderOnboarding(manager, {
    ...base,
    name: MANAGER_NAME,
    kind: 'MANAGER',
    contact: '+919812345672',
  })

  // Manager discovers the Worker and invites them.
  await manager.goto('/app/provider/network/discover')
  await manager.getByRole('button', { name: 'Search Workers' }).click()
  const workerCard = manager.locator('.network-card').filter({ hasText: WORKER_NAME }).first()
  await expect(workerCard).toBeVisible({ timeout: 30000 })
  await shot(manager, 'net-01-worker-discovery')
  await workerCard.getByRole('button', { name: 'Add to My Network' }).click()
  const inviteDialog = manager.getByRole('dialog')
  await expect(inviteDialog).toBeVisible({ timeout: 20000 })
  await inviteDialog.getByLabel('Message (optional)').fill('We coordinate photography crews across Bengaluru.')
  await inviteDialog.getByRole('button', { name: 'Send invitation' }).click()
  await expect(workerCard.getByText('Invitation sent')).toBeVisible({ timeout: 25000 })
  await shot(manager, 'net-02-invitation-sent')
  // Worker accepts the invitation from their own network screen.
  await worker.goto('/app/provider/network')
  await expect(worker.getByText(MANAGER_NAME).first()).toBeVisible({ timeout: 30000 })
  await shot(worker, 'net-03-worker-invitation')
  await worker.getByRole('button', { name: 'Accept invitation' }).first().click()
  await expect(worker.getByText(MANAGER_NAME).first()).toBeVisible({ timeout: 30000 })
  // The invitation is consumed once accepted: the counter must drop to zero.
  await expect(worker.locator('.dashboard-stat').filter({ hasText: 'Invitations to review' })).toContainText('0', { timeout: 30000 })
  await shot(worker, 'net-04-worker-accepted')

  // The association is non-exclusive and visible to the Manager.
  await manager.goto('/app/provider/network')
  await expect(manager.getByText(WORKER_NAME).first()).toBeVisible({ timeout: 30000 })
  await shot(manager, 'net-05-manager-association')

  // Assignments need an accepted commitment; with none, the screen must be a real empty state.
  await manager.goto('/app/provider/assignments')
  await expect(manager.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 25000 })
  await shot(manager, 'net-06-assignments-empty')
})
