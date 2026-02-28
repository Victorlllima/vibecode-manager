import { cn } from '@/lib/utils'
import React from 'react'

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  reverse?: boolean
  pauseOnHover?: boolean
  children?: React.ReactNode
  repeat?: number
}

const Marquee = React.forwardRef<HTMLDivElement, MarqueeProps>(
  (
    {
      className,
      reverse,
      pauseOnHover = false,
      children,
      repeat = 4,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      {...props}
      className={cn(
        'overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]',
        className
      )}
    >
      <div
        className={cn(
          'flex gap-4 w-max',
          reverse ? 'animate-marquee-reverse' : 'animate-marquee',
          pauseOnHover && 'group-hover:[animation-play-state:paused]'
        )}
      >
        {[...Array(repeat)].map((_, i) => (
          <React.Fragment key={i}>{children}</React.Fragment>
        ))}
      </div>
    </div>
  )
)
Marquee.displayName = 'Marquee'

export { Marquee }
