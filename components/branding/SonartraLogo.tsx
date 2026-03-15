import { clsx } from 'clsx'
import Image from 'next/image'
import Link from 'next/link'

type SonartraLogoProps = {
  mode?: 'full' | 'mark'
  size?: 'sm' | 'md' | 'lg'
  tone?: 'default' | 'light'
  className?: string
  href?: string
  priority?: boolean
}

const logoConfig = {
  full: {
    src: '/logo/sonartra-logo.svg',
    alt: 'Sonartra',
    sizes: {
      sm: { width: 118, height: 26, className: 'h-[26px] w-[118px]' },
      md: { width: 136, height: 30, className: 'h-[30px] w-[136px]' },
      lg: { width: 160, height: 36, className: 'h-[36px] w-[160px]' },
    },
  },
  mark: {
    src: '/logo/sonartra-mark.svg',
    alt: 'Sonartra mark',
    sizes: {
      sm: { width: 20, height: 20, className: 'h-5 w-5' },
      md: { width: 24, height: 24, className: 'h-6 w-6' },
      lg: { width: 28, height: 28, className: 'h-7 w-7' },
    },
  },
} as const

export function SonartraLogo({ mode = 'full', size = 'md', tone = 'default', className, href, priority = false }: SonartraLogoProps) {
  const config = logoConfig[mode]
  const dimensions = config.sizes[size]

  const image = (
    <span className={clsx('inline-flex shrink-0 items-center justify-center', dimensions.className, className)}>
      <Image
        src={config.src}
        alt={config.alt}
        width={dimensions.width}
        height={dimensions.height}
        priority={priority}
        style={tone === 'light' ? { filter: 'brightness(0) invert(1)' } : undefined}
        className="h-full w-full object-contain"
      />
    </span>
  )

  if (href) {
    return (
      <Link href={href} aria-label="Sonartra home" className="inline-flex items-center rounded-md transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/65 focus-visible:ring-offset-2 focus-visible:ring-offset-bg">
        {image}
      </Link>
    )
  }

  return image
}
