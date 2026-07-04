#!/usr/bin/env node
/**
 * M5 i18n audit — ensures no/se/en key parity in frontend/lib/translations.ts
 * Exit 0 when all locales have the same keys; exit 1 on missing se/en or empty se values.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const translationsPath = path.join(__dirname, '../lib/translations.ts')

const source = fs.readFileSync(translationsPath, 'utf8')

function sliceLocaleBlock(source, locale, nextLocale) {
  const startMarker = `  ${locale}: {`
  const start = source.indexOf(startMarker)
  if (start < 0) throw new Error(`Locale block "${locale}" not found`)
  const contentStart = start + startMarker.length
  const end =
    nextLocale != null
      ? source.indexOf(`  ${nextLocale}: {`, contentStart)
      : source.indexOf('\n} as const', contentStart)
  if (end < 0) throw new Error(`End of locale block "${locale}" not found`)
  return source.slice(contentStart, end)
}

function extractKeys(block) {
  const keys = new Map()
  const re = /^\s{4}([A-Za-z0-9_]+):\s/gm
  let m
  while ((m = re.exec(block)) !== null) {
    keys.set(m[1], true)
  }
  return keys
}

function extractStringValues(block, key) {
  const re = new RegExp(`^\\s{4}${key}:\\s*("(?:\\\\.|[^"\\\\])*")`, 'm')
  const m = block.match(re)
  if (!m) return null
  try {
    return JSON.parse(m[1])
  } catch {
    return m[1]
  }
}

const noBlock = sliceLocaleBlock(source, 'no', 'se')
const seBlock = sliceLocaleBlock(source, 'se', 'en')
const enBlock = sliceLocaleBlock(source, 'en', null)

const noKeys = extractKeys(noBlock)
const seKeys = extractKeys(seBlock)
const enKeys = extractKeys(enBlock)

const errors = []

for (const key of noKeys.keys()) {
  if (!seKeys.has(key)) errors.push(`missing se key: ${key}`)
  if (!enKeys.has(key)) errors.push(`missing en key: ${key}`)
}

for (const key of seKeys.keys()) {
  if (!noKeys.has(key)) errors.push(`extra se key (not in no): ${key}`)
}

const stubSe = []
for (const key of noKeys.keys()) {
  const seVal = extractStringValues(seBlock, key)
  const noVal = extractStringValues(noBlock, key)
  if (typeof seVal === 'string' && typeof noVal === 'string' && seVal === noVal) {
    if (/^[A-Za-z0-9_]+$/.test(seVal)) {
      errors.push(`se raw key fallback: ${key}`)
    } else if (seVal.length > 2) {
      stubSe.push(key)
    }
  }
  if (seVal === '' || seVal === key) {
    errors.push(`empty or raw se value: ${key}`)
  }
}

console.log(`i18n audit: ${noKeys.size} no keys, ${seKeys.size} se keys, ${enKeys.size} en keys`)

if (stubSe.length > 0) {
  console.warn(`warn: ${stubSe.length} se keys identical to no (review for M5):`)
  for (const k of stubSe.slice(0, 30)) console.warn(`  - ${k}`)
  if (stubSe.length > 30) console.warn(`  … and ${stubSe.length - 30} more`)
}

if (errors.length > 0) {
  console.error(`FAIL: ${errors.length} issue(s):`)
  for (const e of errors.slice(0, 50)) console.error(`  - ${e}`)
  if (errors.length > 50) console.error(`  … and ${errors.length - 50} more`)
  process.exit(1)
}

console.log('PASS: locale key parity OK')
process.exit(0)
