#!/usr/bin/env node
/**
 * PRD §15.8 M5 — verify no/se/en key parity in lib/i18n domain files.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const i18nDir = join(__dirname, '../lib/i18n')
const locales = ['no', 'se', 'en']

function extractKeys(block) {
  const keys = new Set()
  const re = /^\s+([a-zA-Z][a-zA-Z0-9_]*):/gm
  let m
  while ((m = re.exec(block)) !== null) {
    keys.add(m[1])
  }
  return keys
}

function parseLocaleBlocks(source) {
  const blocks = {}
  for (const loc of locales) {
    const re = new RegExp(`${loc}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`, 'm')
    const match = source.match(re)
    if (!match) {
      throw new Error(`Missing locale block: ${loc}`)
    }
    blocks[loc] = extractKeys(match[1])
  }
  return blocks
}

let failed = false
const files = readdirSync(i18nDir).filter((f) => f.endsWith('.ts') && f !== 'index.ts')

for (const file of files) {
  const source = readFileSync(join(i18nDir, file), 'utf8')
  let blocks
  try {
    blocks = parseLocaleBlocks(source)
  } catch (e) {
    console.error(`[i18n-audit] ${file}: ${e.message}`)
    failed = true
    continue
  }

  const base = blocks.no
  for (const loc of locales) {
    for (const key of base) {
      if (!blocks[loc].has(key)) {
        console.error(`[i18n-audit] ${file}: missing ${loc}.${key}`)
        failed = true
      }
    }
    for (const key of blocks[loc]) {
      if (!base.has(key)) {
        console.error(`[i18n-audit] ${file}: extra ${loc}.${key} (not in no)`)
        failed = true
      }
    }
  }
}

if (failed) {
  process.exit(1)
}
console.log(`[i18n-audit] OK — ${files.length} domain files, locales ${locales.join('/')}`)
