/**
 * lib/print/pdf.ts — Server-side HTML → PDF using puppeteer-core + @sparticuz/chromium.
 * Only runs on the Node.js runtime (never Edge). Vercel function maxDuration = 60.
 */

import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

export async function htmlToPdf(html: string): Promise<Uint8Array> {
  const executablePath = await chromium.executablePath()

  const browser = await puppeteer.launch({
    args:            chromium.args,
    executablePath,
    headless:        true,
    defaultViewport: { width: 794, height: 1123 },
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    const pdf = await page.pdf({
      format:          'A4',
      printBackground: true,
      margin: { top: '1in', bottom: '1in', left: '1.25in', right: '1.25in' },
    })
    return new Uint8Array(pdf)
  } finally {
    await browser.close()
  }
}
