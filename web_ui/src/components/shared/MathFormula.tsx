import { memo, useMemo } from 'react';
import katex from 'katex';

export interface MathFormulaProps {
  tex: string;
  display?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const MathFormula = memo(function MathFormula({
  tex,
  display = false,
  className = '',
  ariaLabel,
}: MathFormulaProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
        strict: false,
        output: 'html',
      });
    } catch {
      return '';
    }
  }, [tex, display]);

  if (!html) {
    return (
      <code className={`math-fallback ${className}`} aria-label={ariaLabel ?? tex}>
        {tex}
      </code>
    );
  }

  const Tag = display ? 'div' : 'span';
  return (
    <Tag
      role="math"
      aria-label={ariaLabel ?? tex}
      className={`math-formula ${display ? 'math-formula--block' : 'math-formula--inline'} ${className}`}
    >
      <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
    </Tag>
  );
});
