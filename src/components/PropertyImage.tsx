import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import LazyImage from './common/LazyImage';

type PropertyImageVariant = 'card' | 'detail' | 'thumb';

interface PropertyImageProps {
  src: string;
  alt: string;
  variant?: PropertyImageVariant;
  className?: string;
  imgClassName?: string;
}

const detailContainer =
  'relative w-full aspect-[4/5] lg:aspect-[3/4] lg:max-h-[520px] bg-[#f2f2f2] overflow-hidden';

const thumbContainer =
  'relative w-full h-full min-h-[64px] bg-[#f2f2f2] overflow-hidden';

const cardSquareStyle = { aspectRatio: '1 / 1' } as const;

export default function PropertyImage({
  src,
  alt,
  variant = 'card',
  className,
  imgClassName,
}: PropertyImageProps) {
  if (variant === 'card') {
    return (
      <div
        className={cn('relative w-full overflow-hidden bg-[#f2f2f2]', className)}
        style={cardSquareStyle}
      >
        <LazyImage
          src={src}
          alt={alt}
          className={cn('absolute inset-0 w-full h-full object-contain object-center', imgClassName)}
        />
      </div>
    );
  }

  const containerClass = variant === 'detail' ? detailContainer : thumbContainer;
  const imgClass =
    variant === 'detail'
      ? 'absolute inset-0 w-full h-full object-contain object-center'
      : 'absolute inset-0 w-full h-full object-cover object-center';

  return (
    <div className={cn(containerClass, className)}>
      <LazyImage src={src} alt={alt} className={cn(imgClass, imgClassName)} />
    </div>
  );
}

interface PropertyImagePlaceholderProps {
  variant?: PropertyImageVariant;
  className?: string;
  children: ReactNode;
}

export function PropertyImagePlaceholder({
  variant = 'card',
  className,
  children,
}: PropertyImagePlaceholderProps) {
  if (variant === 'card') {
    return (
      <div
        className={cn(
          'relative w-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#f2f2f2] to-[#e8e8e8]',
          className,
        )}
        style={cardSquareStyle}
      >
        {children}
      </div>
    );
  }

  const containerClass = variant === 'detail' ? detailContainer : thumbContainer;

  return (
    <div
      className={cn(
        containerClass,
        'flex items-center justify-center bg-gradient-to-br from-[#f2f2f2] to-[#e8e8e8]',
        className,
      )}
    >
      {children}
    </div>
  );
}
