import React from 'react';
import { Title, TitleProps } from '@mantine/core';

interface DisplayHeadingProps extends Omit<TitleProps, 'style'> {
  level?: 1 | 2 | 3 | 4;
  highlightWord?: string;
  highlightColor?: string;
  italicWord?: string; // backwards compatibility
  italicColor?: string;
  children?: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  maxWidth?: string | number;
  style?: React.CSSProperties;
}

export const DisplayHeading: React.FC<DisplayHeadingProps> = ({
  level = 1,
  highlightWord,
  highlightColor = '#e01a2b',
  italicWord,
  italicColor,
  children,
  align = 'left',
  maxWidth,
  style,
  ...props
}) => {
  const getOrder = () => {
    switch (level) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 3:
        return 3;
      case 4:
        return 4;
      default:
        return 1;
    }
  };

  const getFontSize = () => {
    switch (level) {
      case 1:
        return 'clamp(2.4rem, 4.5vw, 3.75rem)';
      case 2:
        return 'clamp(1.9rem, 3.2vw, 2.75rem)';
      case 3:
        return 'clamp(1.4rem, 2.4vw, 2rem)';
      case 4:
        return 'clamp(1.15rem, 1.8vw, 1.5rem)';
    }
  };

  const wordToHighlight = highlightWord || italicWord;
  const colorToUse = highlightColor || italicColor || '#e01a2b';

  return (
    <Title
      order={getOrder()}
      style={{
        fontFamily: 'var(--font-heading)',
        fontWeight: level === 1 ? 800 : 700,
        fontSize: getFontSize(),
        lineHeight: level === 1 ? 1.12 : 1.22,
        letterSpacing: '-0.03em',
        textAlign: align,
        maxWidth: maxWidth || 'none',
        color: '#0b0f17',
        ...style,
      }}
      {...props}
    >
      {children}
      {wordToHighlight && (
        <>
          {' '}
          <span
            style={{
              color: colorToUse,
              fontWeight: 'inherit',
            }}
          >
            {wordToHighlight}
          </span>
        </>
      )}
    </Title>
  );
};
