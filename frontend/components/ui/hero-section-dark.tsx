import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

interface HeroSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: {
    regular: string
    gradient: string
  }
  description?: string
  ctaText?: string
  ctaHref?: string
  bottomImage?: {
    light: string
    dark: string
    alt?: string
  }
  gridOptions?: {
    angle?: number
    cellSize?: number
    opacity?: number
    lightLineColor?: string
    darkLineColor?: string
  }
}

const RetroGrid = ({
  angle = 65,
  cellSize = 60,
  opacity = 0.5,
  lightLineColor = 'gray',
  darkLineColor = 'gray',
}) => {
  const gridStyles = {
    '--grid-angle': `${angle}deg`,
    '--cell-size': `${cellSize}px`,
    '--opacity': opacity,
    '--light-line': lightLineColor,
    '--dark-line': darkLineColor,
  } as React.CSSProperties

  return (
    <div
      className={cn(
        'pointer-events-none absolute size-full overflow-hidden [perspective:200px]',
        'opacity-[var(--opacity)]',
      )}
      style={gridStyles}
    >
      <div className="absolute inset-0 [transform:rotateX(var(--grid-angle))]">
        <div className="animate-grid [background-image:linear-gradient(to_right,var(--light-line)_1px,transparent_0),linear-gradient(to_bottom,var(--light-line)_1px,transparent_0)] [background-repeat:repeat] [background-size:var(--cell-size)_var(--cell-size)] [height:300vh] [inset:0%_0px] [margin-left:-200%] [transform-origin:100%_0_0] [width:600vw] dark:[background-image:linear-gradient(to_right,var(--dark-line)_1px,transparent_0),linear-gradient(to_bottom,var(--dark-line)_1px,transparent_0)]" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-boly-bg-app to-transparent to-90%" />
    </div>
  )
}

const HeroSection = React.forwardRef<HTMLDivElement, HeroSectionProps>(
  (
    {
      className,
      title = 'Build products for everyone',
      subtitle = {
        regular: 'Designing your projects faster with ',
        gradient: 'the largest figma UI kit.',
      },
      description = 'Sed ut perspiciatis unde omnis iste natus voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae.',
      ctaText = 'Browse courses',
      ctaHref = '#',
      bottomImage,
      gridOptions,
      ...props
    },
    ref,
  ) => {
    return (
      <div className={cn('relative', className)} ref={ref} {...props}>
        <div className="absolute top-0 z-[0] h-screen w-screen bg-boly-accent/10 bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(74,95,212,0.2),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(74,95,212,0.35),rgba(0,0,0,0))]" />
        <section className="relative z-[1] mx-auto max-w-full">
          <RetroGrid {...gridOptions} />
          <div className="z-10 mx-auto max-w-screen-xl gap-12 px-4 py-28 md:px-8">
            <div className="mx-auto max-w-3xl space-y-5 text-center leading-none lg:leading-normal">
              <h1 className="group mx-auto w-fit rounded-3xl border-2 border-boly-border-subtle bg-gradient-to-tr from-boly-bg-card/40 via-boly-border-subtle/20 to-transparent px-5 py-2 text-sm text-boly-text-muted [font-family:var(--font-body)]">
                {title}
                <ChevronRight
                  className="ml-2 inline h-4 w-4 duration-300 group-hover:translate-x-1"
                  aria-hidden
                />
              </h1>
              <h2 className="mx-auto bg-[linear-gradient(180deg,var(--text-main)_0%,color-mix(in_srgb,var(--text-main)_75%,transparent)_100%)] bg-clip-text text-4xl tracking-tighter text-transparent [font-family:var(--font-display)] md:text-6xl">
                {subtitle.regular}
                <span className="bg-gradient-to-r from-boly-accent to-boly-teal bg-clip-text text-transparent">
                  {subtitle.gradient}
                </span>
              </h2>
              <p className="mx-auto max-w-2xl text-boly-text-body">{description}</p>
              <div className="items-center justify-center gap-x-3 space-y-3 sm:flex sm:space-y-0">
                <span className="relative inline-block overflow-hidden rounded-full p-[1.5px]">
                  <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,color-mix(in_srgb,var(--color-accent)_40%,white)_0%,var(--color-accent)_50%,color-mix(in_srgb,var(--color-accent)_40%,white)_100%)]" />
                  <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-boly-bg-card text-xs font-medium backdrop-blur-3xl">
                    <a
                      href={ctaHref}
                      className="group inline-flex w-full items-center justify-center rounded-full border border-boly-border-subtle bg-gradient-to-tr from-boly-bg-card/40 via-boly-accent/20 to-transparent px-10 py-4 text-center text-boly-text-main transition-all hover:from-boly-bg-card/60 hover:via-boly-accent/30 sm:w-auto"
                    >
                      {ctaText}
                    </a>
                  </div>
                </span>
              </div>
            </div>
            {bottomImage ? (
              <div className="relative z-10 mx-10 mt-32">
                <img
                  src={bottomImage.light}
                  className="w-full rounded-lg border border-boly-border-subtle shadow-lg dark:hidden"
                  alt={bottomImage.alt ?? ''}
                  loading="lazy"
                  decoding="async"
                />
                <img
                  src={bottomImage.dark}
                  className="hidden w-full rounded-lg border border-boly-border-subtle shadow-lg dark:block"
                  alt={bottomImage.alt ?? ''}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ) : null}
          </div>
        </section>
      </div>
    )
  },
)
HeroSection.displayName = 'HeroSection'

export { HeroSection }
