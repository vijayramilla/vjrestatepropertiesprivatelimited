import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import LazyImage from '@/components/common/LazyImage';

const SHOWCASE_IMAGE =
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1800&auto=format&fit=crop&q=80';

export default function HomeScrollShowcase() {
  return (
    <section className="bg-background overflow-hidden">
      <ContainerScroll
        titleComponent={
          <>
            <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
              FEATURED PORTFOLIO
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-normal text-foreground leading-tight">
              Explore Bangalore&apos;s finest
              <br />
              <span className="text-4xl md:text-[5.5rem] font-normal mt-1 leading-none block">
                rental income assets
              </span>
            </h2>
          </>
        }
      >
        <LazyImage
          src={SHOWCASE_IMAGE}
          alt="Luxury villa property in Bangalore"
          className="mx-auto rounded-2xl object-cover h-full w-full object-center"
        />
      </ContainerScroll>
    </section>
  );
}
