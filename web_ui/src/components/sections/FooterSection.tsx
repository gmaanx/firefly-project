import { useRef, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { TEAM_ASSIGNMENTS } from '../../data/teamAssignmentData';
import { useSectionReveal } from '../../lib/useEditorialMotion';
import { ContourBackdrop } from '../shared/ContourBackdrop';
import { SplitHoverText } from '../shared/KineticButton';
import { useRouteCurtain } from '../shared/RouteCurtain';

export interface FooterSectionProps {
  reducedMotion: boolean;
}

function ZeitHoverArrow() {
  return (
    <span className="zeit-hover-arrow" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" className="zeit-hover-arrow__svg">
        <path
          d="M3.5 12H19.5M13.5 6L19.5 12L13.5 18"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function FooterSection({ reducedMotion }: FooterSectionProps) {
  const footerRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { navigateWithCurtain, navigateWithDarkZoom } = useRouteCurtain();

  const isOnAssignmentRoute = location.pathname.startsWith('/phan-cong');
  const isOnSubpageDetail =
    isOnAssignmentRoute ||
    (location.pathname.startsWith('/thuc-nghiem/') &&
      location.pathname !== '/thuc-nghiem/');

  useSectionReveal(footerRef, reducedMotion);

  const handleOpenSubpage = (
    toPath: string,
    origin?: HTMLElement | MouseEvent<HTMLElement> | null
  ) => {
    if (
      origin &&
      'metaKey' in origin &&
      (origin.metaKey || origin.ctrlKey || origin.shiftKey || origin.button !== 0)
    ) {
      return;
    }

    if (location.pathname === toPath) {
      if (origin && 'preventDefault' in origin) {
        origin.preventDefault();
      }
      window.scrollTo({ top: 0, left: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      window.dispatchEvent(
        new CustomEvent('app:lenis-scroll', {
          detail: { top: 0, immediate: reducedMotion },
        })
      );
      return;
    }

    if (isOnSubpageDetail) {
      if (origin && 'preventDefault' in origin) {
        origin.preventDefault();
      }
      navigate(toPath);
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      window.dispatchEvent(
        new CustomEvent('app:lenis-scroll', { detail: { top: 0, immediate: true } })
      );
      return;
    }

    navigateWithDarkZoom(toPath, origin ?? null, {
      returnPath: location.pathname,
    });
  };

  return (
    <footer
      id="tong-ket"
      ref={footerRef}
      className={`lando-footer-frame ${isOnAssignmentRoute ? 'lando-footer-frame--compact' : ''}`.trim()}
      data-surface="dark"
      aria-labelledby="footer-heading"
    >
      <div className="lando-footer-chamber">
        {/* Authentic Lando Raised Center Tab protruding upward into the bright neon-lime blend sky */}
        <div className="lando-footer-raised-tab" aria-hidden="true">
          <svg
            viewBox="0 0 72 36"
            preserveAspectRatio="none"
            className="lando-footer-raised-tab__ramp"
          >
            <path d="M0,35 C28,35 42,0 72,0 V36 H0 Z" fill="#26291f" />
          </svg>
          <div className="lando-footer-raised-tab__plateau" />
          <svg
            viewBox="0 0 72 36"
            preserveAspectRatio="none"
            className="lando-footer-raised-tab__ramp"
          >
            <path d="M0,0 C30,0 44,35 72,35 V36 H0 Z" fill="#26291f" />
          </svg>
        </div>

        <div className="lando-footer-chamber__backdrop" aria-hidden="true">
          <ContourBackdrop variant="dark" />
        </div>

        {/* Subtle Top-Left Lando Corner Watermark */}
        <div className="lando-footer-watermark" aria-hidden="true">
          <span>FIREFLY</span>
          <span>ALGORITHM</span>
        </div>

        {/* 1. Centered Single-Line Headline */}
        <div className="lando-footer-hero">
          <h2 id="footer-heading" tabIndex={-1} className="lando-footer-headline">
            <span className="reveal-mask">
              <span className="reveal-line">
                {isOnAssignmentRoute ? (
                  <>
                    <span className="lando-footer-headline__sans">THUẬT TOÁN</span>{' '}
                    <span className="lando-footer-headline__serif">ĐOM ĐÓM</span>
                  </>
                ) : (
                  <>
                    <span className="lando-footer-headline__sans">PHÂN CÔNG</span>{' '}
                    <span className="lando-footer-headline__serif">NHIỆM VỤ</span>
                  </>
                )}
              </span>
            </span>
          </h2>
        </div>

        {/* 2. Single-Viewport Centered Swiss Hairline Roster (11 Members) + CTA */}
        <div className="lando-footer-lower-grid reveal-fade">
          <div className="lando-footer-center-dock">
            {!isOnAssignmentRoute ? (
              <div className="lando-roster-ledger">
                <div className="lando-roster-grid" role="list" aria-label="Danh sách 11 thành viên">
                  {TEAM_ASSIGNMENTS.map((m) => (
                    <Link
                      key={m.slug}
                      to={`/phan-cong/${m.slug}`}
                      role="listitem"
                      className="lando-roster-item"
                      onClick={(ev) => handleOpenSubpage(`/phan-cong/${m.slug}`, ev)}
                    >
                      <span className="lando-roster-item__lead">
                        <ZeitHoverArrow />
                        <span className="lando-roster-item__who">
                          <span className="lando-roster-item__num">
                            {String(m.memberNumber).padStart(2, '0')}
                          </span>
                          <span className="lando-roster-item__name">{m.memberName}</span>
                        </span>
                      </span>
                      <span className="lando-roster-item__role">{m.shortRole}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {isOnAssignmentRoute ? (
              <Link
                to="/"
                aria-label="QUAY VỀ TRANG CHỦ"
                className="lando-footer-cta-btn"
                onClick={(e) => navigateWithCurtain('/', e)}
              >
                <SplitHoverText text="QUAY VỀ TRANG CHỦ" />
                <span className="lando-footer-cta-btn__icon" aria-hidden="true">
                  <span className="lando-footer-cta-btn__arrow lando-footer-cta-btn__arrow--primary">
                    ↗
                  </span>
                  <span className="lando-footer-cta-btn__arrow lando-footer-cta-btn__arrow--clone">
                    ↗
                  </span>
                </span>
              </Link>
            ) : (
              <Link
                to="/phan-cong"
                aria-label="XEM CHI TIẾT PHÂN CÔNG"
                className="lando-footer-cta-btn"
                onClick={(e) => handleOpenSubpage('/phan-cong', e)}
              >
                <SplitHoverText text="XEM CHI TIẾT PHÂN CÔNG" />
                <span className="lando-footer-cta-btn__icon" aria-hidden="true">
                  <span className="lando-footer-cta-btn__arrow lando-footer-cta-btn__arrow--primary">
                    ↗
                  </span>
                  <span className="lando-footer-cta-btn__arrow lando-footer-cta-btn__arrow--clone">
                    ↗
                  </span>
                </span>
              </Link>
            )}
          </div>
        </div>

        {/* 3. Lando Bottom-Left Raised Neon-Lime Copyright Ear */}
        <div className="lando-footer-ears">
          <div className="lando-footer-ear lando-footer-ear--left">
            <span className="lando-footer-ear__copy">
              <strong>© 2026 Nhóm Seminar FA.</strong> Chương 13 · Xin-She Yang (2008)
            </span>
            <svg
              viewBox="0 0 42 36"
              preserveAspectRatio="none"
              className="lando-footer-ear__ramp lando-footer-ear__ramp--right"
              aria-hidden="true"
            >
              <path d="M0,0 C10,0 15,4 22,14 L34,30 C37,34 40,36 42,36 H0 Z" fill="#d2ff00" />
            </svg>
          </div>
        </div>
      </div>
    </footer>
  );
}
