#!/usr/bin/env node
/**
 * M5 i18n audit — ensures no/se/en key parity across lib/i18n/*.ts barrels.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const i18nDir = path.join(__dirname, '../lib/i18n')

const localeRe = /\b(no|se|en):\s*\{/g
const keyRe = /^\s{4}([A-Za-z0-9_]+):/gm

function extractLocaleKeys(source, locale) {
  const marker = `${locale}: {`
  const start = source.indexOf(marker)
  if (start < 0) return null
  const contentStart = start + marker.length
  let depth = 1
  let i = contentStart
  while (i < source.length && depth > 0) {
    const ch = source[i]
    if (ch === '{') depth += 1
    if (ch === '}') depth -= 1
    i += 1
  }
  const block = source.slice(contentStart, i - 1)
  const keys = new Set()
  for (const match of block.matchAll(keyRe)) keys.add(match[1])
  return keys
}

const files = fs.readdirSync(i18nDir).filter((f) => f.endsWith('.ts') && f !== 'index.ts')
let failed = false

for (const file of files) {
  const source = fs.readFileSync(path.join(i18nDir, file), 'utf8')
  const locales = [...source.matchAll(localeRe)].map((m) => m[1])
  if (locales.length === 0) continue

  const byLocale = {}
  for (const locale of locales) {
    byLocale[locale] = extractLocaleKeys(source, locale)
    if (!byLocale[locale]) {
      console.error(`${file}: missing locale block "${locale}"`)
      failed = true
    }
  }

  const reference = byLocale.no ?? byLocale.en
  if (!reference) continue

  for (const locale of locales) {
    if (locale === 'no') continue
    const keys = byLocale[locale]
    for (const key of reference) {
      if (!keys.has(key)) {
        console.error(`${file}: ${locale} missing key "${key}" (present in no)`)
        failed = true
      }
    }
    for (const key of keys) {
      if (!reference.has(key)) {
        console.error(`${file}: no missing key "${key}" (present in ${locale})`)
        failed = true
      }
    }
  }
}

if (failed) {
  console.error('i18n audit failed')
  process.exit(1)
}

console.log('i18n audit OK')
