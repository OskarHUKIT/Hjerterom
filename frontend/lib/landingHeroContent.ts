import type { EffectiveModuleFlags } from '@/lib/platformSettings'

export type LandingHeroModule = 'default' | 'kommune' | 'landlord' | 'finn' | 'los'

export type HeroContent = {
  eyebrow: string
  title: string
  titleAccent: string
  /** Default hero: accent word on its own line below the title. */
  accentOnOwnLine?: boolean
  description: string
}

type TranslateFn = (key: string) => string

export function buildDefaultEyebrow(flags: EffectiveModuleFlags, t: TranslateFn): string {
  const parts: string[] = []
  if (flags.kommunePortal) parts.push(t('heroEyebrowKommune'))
  if (flags.homeownerPortal) parts.push(t('heroEyebrowLandlord'))
  if (flags.finn) parts.push(t('heroEyebrowGuest'))
  if (flags.los) parts.push(t('heroEyebrowYouth'))
  if (parts.length === 0) return t('heroEyebrow')
  return parts.join(t('heroEyebrowSeparator'))
}

function defaultHero(flags: EffectiveModuleFlags, t: TranslateFn): HeroContent {
  return {
    eyebrow: buildDefaultEyebrow(flags, t),
    title: t('heroTitleLine1'),
    titleAccent: t('heroTitleAccent'),
    accentOnOwnLine: true,
    description: t('heroDesc'),
  }
}

export function resolveHeroContent(
  module: LandingHeroModule,
  flags: EffectiveModuleFlags,
  t: TranslateFn
): HeroContent {
  switch (module) {
    case 'kommune':
      return {
        eyebrow: t('heroModuleKommuneEyebrow'),
        title: t('heroModuleKommuneTitle'),
        titleAccent: t('heroModuleKommuneTitleAccent'),
        description: t('heroModuleKommuneDesc'),
      }
    case 'landlord':
      return {
        eyebrow: t('heroModuleLandlordEyebrow'),
        title: t('heroModuleLandlordTitle'),
        titleAccent: t('heroModuleLandlordTitleAccent'),
        description: t('heroModuleLandlordDesc'),
      }
    case 'finn':
      if (!flags.finn) return defaultHero(flags, t)
      return {
        eyebrow: t('heroModuleFinnEyebrow'),
        title: t('heroModuleFinnTitle'),
        titleAccent: t('heroModuleFinnTitleAccent'),
        description: t('heroModuleFinnDesc'),
      }
    case 'los':
      if (!flags.los) return defaultHero(flags, t)
      return {
        eyebrow: t('heroModuleLosEyebrow'),
        title: t('heroModuleLosTitle'),
        titleAccent: t('heroModuleLosTitleAccent'),
        description: t('heroModuleLosDesc'),
      }
    default:
      return defaultHero(flags, t)
  }
}

export function splitHeroTitle(title: string, accent: string): [string, string, string] {
  if (!accent || !title.includes(accent)) {
    return [title, '', '']
  }
  const idx = title.indexOf(accent)
  return [title.slice(0, idx), accent, title.slice(idx + accent.length)]
}
