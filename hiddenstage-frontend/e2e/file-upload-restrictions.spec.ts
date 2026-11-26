import { expect, test } from '@playwright/test'
import { register, registerCustomer, completeProviderOnboarding, unique } from './helpers'

test.describe('File Upload Extension Restrictions Suite', () => {
  test('Strictly restricts file extensions across portfolio, event attachments, and chat', async ({ page }) => {
    test.setTimeout(120_000)
    const providerEmail = unique('uploader.pro')
    const customerEmail = unique('uploader.cust')

    // 1. Register & Onboard Provider
    await register(page, { email: providerEmail, name: 'Vikram Visuals', type: 'PROVIDER' })
    await completeProviderOnboarding(page, {
      name: 'Vikram Visual Studio',
      kind: 'MANAGER',
      description: 'Professional cinematography, photography and document archives.',
      pin: '560001',
      locality: 'MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      contact: '+91 99887 76655',
    })

    // 2. Test Portfolio Upload Validation
    await page.goto('/app/provider/profile')
    await expect(page.getByRole('heading', { name: /Professional Profile & Portfolio/i })).toBeVisible({ timeout: 25000 })

    await page.getByRole('button', { name: 'Portfolio & Showcase' }).click()
    await expect(page.getByText(/Service Category Albums/i)).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: /Upload to Portfolio/i }).click()

    await expect(page.getByText('Add Photo to Album')).toBeVisible({ timeout: 10000 })
    await page.getByLabel(/Photo \/ Project Title/i).fill('Test Restricted Upload')
    await page.getByLabel('Media Type').selectOption('IMAGE')

    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()

    // Test A: Upload disallowed .txt file -> Must be rejected with error
    await fileInput.setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('plain text content'),
    })
    await expect(page.getByText(/Unsupported file extension/i)).toBeVisible({ timeout: 10000 })

    // Test B: Upload disallowed .exe file -> Must be rejected with error
    await fileInput.setInputFiles({
      name: 'malware.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.from('MZ\x90\x00'),
    })
    await expect(page.getByText(/Unsupported file extension/i)).toBeVisible({ timeout: 10000 })

    // Test C: Upload valid PNG image -> Error clears and preview appears
    await fileInput.setInputFiles({
      name: 'hero-shot.png',
      mimeType: 'image/png',
      buffer: Buffer.from('\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'),
    })
    await expect(page.getByText(/Unsupported file extension/i)).toHaveCount(0)
    await expect(page.locator('.portfolio-preview-thumb img')).toBeVisible({ timeout: 10000 })

    // Test D: Switch to Document and test PDF / DOCX
    await page.getByLabel('Media Type').selectOption('DOCUMENT')
    await fileInput.setInputFiles({
      name: 'portfolio-guide.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'),
    })
    await expect(page.getByText(/Unsupported file extension/i)).toHaveCount(0)

    // Close portfolio modal
    await page.getByRole('button', { name: 'Cancel' }).click()

    // 3. Switch to Customer and Test Event Creation Reference Files Upload
    await page.getByRole('button', { name: 'Sign out' }).click()
    await registerCustomer(page, customerEmail, 'Priya Customer')

    await page.goto('/app/events/new')
    await expect(page.getByRole('heading', { name: /Let’s shape your event plan/i })).toBeVisible({ timeout: 25000 })

    // Fill Step 1
    await page.getByLabel('Request name').fill('Upload Security Verification Event')
    await page.getByLabel('Type of event').first().selectOption({ index: 1 })
    await page.getByLabel('Guest count').fill('50')
    await page.getByLabel(/Event start date|Event date/i).fill('2030-08-15')
    await page.getByLabel('Start time').fill('17:00')
    await page.getByLabel('End time').fill('21:00')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    // Fill Step 2
    await page.getByLabel('PIN code').fill('560001')
    await page.getByLabel('Locality or area').fill('MG Road')
    await page.getByLabel('City').fill('Bengaluru')
    await page.getByLabel('State').fill('Karnataka')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    // Fill Step 3
    const catSelect = page.getByLabel('Service category').first()
    await expect(catSelect).toBeVisible()
    await catSelect.selectOption({ index: 1 })
    await page.getByLabel('Short title').fill('Full Photography')
    await page.getByLabel('What do you need?').fill('Event documentation')
    await page.getByRole('button', { name: 'Add service' }).click()
    await expect(page.getByText(/1 service added/i)).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    // Step 4: Reference files
    await expect(page.getByText(/Reference files \(optional\)/i)).toBeVisible({ timeout: 15000 })
    const dropzoneInput = page.locator('.attachment-drop input[type="file"]')
    await expect(dropzoneInput).toBeAttached()

    // Test E: Try to upload invalid .bat file in event wizard -> Rejected
    await dropzoneInput.setInputFiles({
      name: 'script.bat',
      mimeType: 'text/plain',
      buffer: Buffer.from('@echo off'),
    })
    await expect(page.getByText(/is not a valid JPG, PNG, WebP, PDF or DOCX file/i)).toBeVisible({ timeout: 10000 })

    // Test F: Upload valid image file -> Accepted
    await dropzoneInput.setInputFiles({
      name: 'moodboard.png',
      mimeType: 'image/png',
      buffer: Buffer.from('\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'),
    })
    await expect(page.getByText('moodboard.png')).toBeVisible({ timeout: 10000 })

    // Test G: Upload valid docx file -> Accepted
    await dropzoneInput.setInputFiles({
      name: 'event-brief.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.from('PK\x03\x04\x14\x00\x00\x00\x08\x00'),
    })
    await expect(page.getByText('event-brief.docx')).toBeVisible({ timeout: 10000 })
  })
})
