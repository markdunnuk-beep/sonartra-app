import Image from 'next/image'
import Link from 'next/link'
import { clsx } from 'clsx'

type SonartraLogoProps = {
  mode?: 'full' | 'mark'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  href?: string
  priority?: boolean
}

const logoConfig = {
  full: {
    src: '/logo/sonartra-logo.svg',
    alt: 'Sonartra',
    sizes: {
      sm: { width: 120, height: 28 },
      md: { width: 150, height: 34 },
      lg: { width: 180, height: 42 },
    },
  },
  mark: {
    src: '/logo/sonartra-mark.svg',
    alt: 'Sonartra mark',
    sizes: {
      sm: { width: 24, height: 24 },
      md: { width: 30, height: 30 },
      lg: { width: 36, height: 36 },
    },
  },
} as const

export function SonartraLogo({ mode = 'full', size = 'md', className, href, priority = false }: SonartraLogoProps) {
  const config = logoConfig[mode]
  const dimensions = config.sizes[size]
  const image = (
    <Image
      src={config.src}
      alt={config.alt}
      width={dimensions.width}
      height={dimensions.height}
      priority={priority}
      className={clsx('h-auto w-auto object-contain', className)}
    />
  )

  if (href) {
    return (
      <Link href={href} aria-label="Sonartra home" className="inline-flex items-center">
        {image}
      </Link>
    )
  }

  return image
}
