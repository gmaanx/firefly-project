import {
  useMemo,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import type { AppRoutePath } from '../../lib/navigation';

export type KineticVariant =
  | 'lime'
  | 'violet'
  | 'dark'
  | 'outline-dark'
  | 'outline-light';

function splitVietnameseGraphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('vi', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

/**
 * True Lando-inspired per-grapheme staggered liquid wave text.
 * Uses Intl.Segmenter('vi', { granularity: 'grapheme' }) inside a generous 1.44em mask
 * so stacked Vietnamese accents (Ắ, Ậ, Ế, Ổ, Ứ) NEVER clip or jitter.
 */
export function SplitHoverText({ text }: { text: string }) {
  const graphemes = useMemo(() => splitVietnameseGraphemes(text), [text]);

  return (
    <span className="kinetic-text" aria-hidden="true">
      {graphemes.map((ch, idx) => {
        const rendered = ch === ' ' ? '\u00A0' : ch;
        return (
          <span
            key={`${idx}-${ch}`}
            className="kinetic-char-mask"
            style={{ '--char-index': idx } as CSSProperties}
          >
            <span className="kinetic-char-track">
              <span className="kinetic-char-cell">{rendered}</span>
              <span className="kinetic-char-cell">{rendered}</span>
            </span>
          </span>
        );
      })}
    </span>
  );
}

export interface KineticButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: ReactNode;
  variant?: KineticVariant;
}

export function KineticButton({
  label,
  icon,
  variant = 'lime',
  className = '',
  type = 'button',
  ...rest
}: KineticButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={`kinetic-btn kinetic-btn--${variant} ${className}`}
      {...rest}
    >
      <SplitHoverText key={label} text={label} />
      {icon ? (
        <span className="kinetic-btn__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
    </button>
  );
}

export interface KineticRouteLinkProps {
  to: AppRoutePath;
  label: string;
  icon?: ReactNode;
  variant?: KineticVariant;
  className?: string;
  onNavigate?: (to: AppRoutePath, e: MouseEvent<HTMLAnchorElement>) => void;
}

export function KineticRouteLink({
  to,
  label,
  icon,
  variant = 'lime',
  className = '',
  onNavigate,
}: KineticRouteLinkProps) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={`kinetic-btn kinetic-btn--${variant} ${className}`}
      onClick={(e) => {
        if (
          onNavigate &&
          !e.defaultPrevented &&
          e.button === 0 &&
          !e.metaKey &&
          !e.ctrlKey &&
          !e.shiftKey &&
          !e.altKey
        ) {
          onNavigate(to, e);
        }
      }}
    >
      <SplitHoverText key={label} text={label} />
      {icon ? (
        <span className="kinetic-btn__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
    </Link>
  );
}

export interface KineticAnchorProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  label: string;
  icon?: ReactNode;
  variant?: KineticVariant;
}

export function KineticAnchor({
  label,
  icon,
  variant = 'lime',
  className = '',
  ...rest
}: KineticAnchorProps) {
  return (
    <a
      aria-label={label}
      className={`kinetic-btn kinetic-btn--${variant} ${className}`}
      {...rest}
    >
      <SplitHoverText key={label} text={label} />
      {icon ? (
        <span className="kinetic-btn__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
    </a>
  );
}
