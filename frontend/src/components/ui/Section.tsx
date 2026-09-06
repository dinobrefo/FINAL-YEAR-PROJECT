import React from 'react';
import clsx from 'clsx';

export interface SectionProps {
  id?: string;
  eyebrow?: string;
  title?: string;
  intro?: string;
  children: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({
  id,
  eyebrow,
  title,
  intro,
  children,
  className,
}) => {
  const hasHeader = Boolean(eyebrow || title || intro);

  return (
    <section id={id} className={clsx('scroll-mt-20 py-20 sm:py-24', className)}>
      <div className="container-page">
        {hasHeader && (
          <div className="max-w-2xl mb-12 sm:mb-16">
            {eyebrow && <div className="eyebrow mb-4">{eyebrow}</div>}
            {title && (
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
                {title}
              </h2>
            )}
            {intro && <p className="mt-4 text-ink-muted sm:text-lg">{intro}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
};

export default Section;
