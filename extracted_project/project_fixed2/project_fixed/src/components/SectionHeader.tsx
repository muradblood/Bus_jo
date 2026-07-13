import React from 'react';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  light?: boolean;
  align?: 'center' | 'left';
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  eyebrow,
  title,
  description,
  light = false,
  align = 'center',
}) => {
  return (
    <div
      className={`max-w-[600px] ${align === 'center' ? 'mx-auto text-center' : ''} mb-10 md:mb-14`}
    >
      {eyebrow && (
        <span
          className={`block text-xs font-medium tracking-[3px] uppercase mb-3 ${
            light ? 'text-brand-gold-light' : 'text-brand-gold'
          }`}
        >
          {eyebrow}
        </span>
      )}
      <h2
        className={`text-2xl md:text-4xl font-bold leading-tight ${
          light ? 'text-white' : 'text-text-primary'
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-4 text-base leading-relaxed max-w-[500px] ${
            align === 'center' ? 'mx-auto' : ''
          } ${light ? 'text-white/65' : 'text-text-secondary'}`}
        >
          {description}
        </p>
      )}
    </div>
  );
};

export default SectionHeader;
