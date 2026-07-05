import type { EffectiveModuleFlags } from '@/lib/platformSettings'

export type LandingHeroModule = 'default' | 'login' | 'demo' | 'finn' | 'los'

export type HeroContent = {
  eyebrow: string
  title: string
  titleAccent: string
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
    title: t('heroTitle'),
    titleAccent: t('heroTitleAccent'),
    description: t('heroDesc'),
  }
}

export function resolveHeroContent(
  module: LandingHeroModule,
  flags: EffectiveModuleFlags,
  t: TranslateFn
): HeroContent {
  switch (module) {
    case 'login':
      return {
        eyebrow: t('heroModuleLoginEyebrow'),
        title: t('heroModuleLoginTitle'),
        titleAccent: t('heroModuleLoginTitleAccent'),
        description: t('heroModuleLoginDesc'),
      }
    case 'demo':
      return {
        eyebrow: t('heroModuleDemoEyebrow'),
        title: t('heroModuleDemoTitle'),
        titleAccent: t('heroModuleDemoTitleAccent'),
        description: t('heroModuleDemoDesc'),
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
