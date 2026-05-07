const express = require('express')
const puppeteer = require('puppeteer')

const app = express()
app.use(express.json())

const PORT = process.env.PORT || 3100

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.post('/generate', async (req, res) => {
  const { url, filename = 'cv' } = req.body

  if (!url) {
    return res.status(400).json({ error: 'url gerekli' })
  }

  let browser
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 794, height: 1123 }) // A4 at 96dpi

    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    })

    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready')

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    })

    const safeFilename = filename.replace(/[^a-zA-Z0-9_\-À-ɏ]/g, '_')
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.pdf"`)
    res.send(pdf)
  } catch (err) {
    console.error('PDF generation error:', err)
    res.status(500).json({ error: 'PDF oluşturulamadı', detail: err.message })
  } finally {
    if (browser) await browser.close()
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PDF service running on port ${PORT}`)
})
