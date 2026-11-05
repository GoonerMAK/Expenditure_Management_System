import { ReactNode, useId } from 'react';
import { cn } from '../lib/utils';

interface SectionCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

const SectionCard = ({ title, children, className }: SectionCardProps) => {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cn('rounded-lg border border-section bg-card p-6 text-card-foreground shadow-sm', className)}
    >
      <h2 id={headingId} className="mb-4 text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
};

export default SectionCard;
