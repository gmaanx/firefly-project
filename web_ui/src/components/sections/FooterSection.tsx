import { useState, useRef, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ASSIGNMENT_STAGES, TEAM_ASSIGNMENTS } from '../../data/teamAssignmentData';
import { APP_ROUTES } from '../../lib/navigation';
import { useSectionReveal } from '../../lib/useEditorialMotion';
import { ContourBackdrop } from '../shared/ContourBackdrop';
import { SplitHoverText } from '../shared/KineticButton';
import { useRouteCurtain } from '../shared/RouteCurtain';

gsap.registerPlugin(ScrollTrigger);

export interface FooterSectionProps {
  reducedMotion: boolean;
}

const DEFAULT_PREVIEW_SLUG = 'gia-man';

function WingSlotText({
  text,
  arrow,
}: {
  text: string;
  arrow: '→' | '↗';
}) {
  return (
    <>
      <span className="lando-wing-link__slot" aria-hidden="true">
        <span className="lando-wing-link__track">
          <span className="lando-wing-link__line">{text}</span>
          <span className="lando-wing-link__line lando-wing-link__line--accent">
            {text}
          </span>
        </span>
      </span>
      <span className="lando-wing-link__arrow" aria-hidden="true">
        <span className="lando-wing-link__arrow-glyph lando-wing-link__arrow-glyph--primary">
          {arrow}
        </span>
        <span className="lando-wing-link__arrow-glyph lando-wing-link__arrow-glyph--clone">
          {arrow}
        </span>
      </span>
    </>
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

  const [activeSlug, setActiveSlug] = useState<string>(DEFAULT_PREVIEW_SLUG);
  const activeMember =
    TEAM_ASSIGNMENTS.find((m) => m.slug === activeSlug) ??
    TEAM_ASSIGNMENTS[TEAM_ASSIGNMENTS.length - 1];
  const activeStage = ASSIGNMENT_STAGES.find((s) => s.id === activeMember.stageId);

  useSectionReveal(footerRef, reducedMotion);

  useGSAP(
    () => {
      const el = footerRef.current;
      if (!el || reducedMotion) return;

      const strokes = el.querySelectorAll<SVGPathElement>('.lando-footer-sig path');
      strokes.forEach((stroke, idx) => {
        const total = stroke.getTotalLength();
        gsap.set(stroke, {
          strokeDasharray: total,
          strokeDashoffset: total,
        });
        gsap.to(stroke, {
          strokeDashoffset: 0,
          duration: idx === 0 ? 0.85 : 0.65,
          delay: idx === 0 ? 0.08 : 0.34,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            once: true,
          },
        });
      });
    },
    { scope: footerRef, dependencies: [reducedMotion] }
  );

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

  const handleJumpCompression = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    if (location.pathname === '/demo') {
      e.preventDefault();
      const el = document.getElementById('nen-anh-fa');
      if (el) {
        const top = Math.max(0, window.scrollY + el.getBoundingClientRect().top - 68);
        if (reducedMotion) {
          window.scrollTo({ top, left: 0, behavior: 'auto' });
        } else {
          window.dispatchEvent(
            new CustomEvent('app:lenis-scroll', { detail: { top, duration: 0.9 } })
          );
        }
      }
      return;
    }
    navigateWithCurtain('/demo', e, 'nen-anh-fa');
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
        {/* Authentic Lando Raised Center Tab protruding upward into the smooth lime blend sky */}
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

        {/* 1. Top-Center UP Signature + Single-Line Headline */}
        <div className="lando-footer-hero">
          <svg
            viewBox="0 0 800 570"
            fill="none"
            aria-hidden="true"
            className="lando-footer-sig"
          >
            <path
              d="M 204.3 253.1 C 203.6 244.7, 194.3 209.1, 199.7 200.0 C 205.1 191.0, 232.4 188.8, 238.4 196.1 C 244.4 203.5, 243.0 231.6, 237.7 246.6 C 232.4 261.5, 217.6 281.0, 205.2 290.7 C 192.8 300.3, 172.7 307.8, 159.5 307.4 C 146.2 307.1, 128.0 299.1, 121.6 288.5 C 115.3 277.9, 113.4 253.9, 119.4 240.5 C 125.3 227.0, 145.9 214.1, 159.1 203.6 C 172.4 193.2, 189.2 183.6, 203.1 174.4 C 217.1 165.2, 234.9 157.1, 247.3 145.6 C 259.7 134.2, 273.7 117.5, 281.7 102.1 C 289.7 86.8, 299.0 57.8, 297.9 48.6 C 296.8 39.4, 282.2 36.6, 274.9 44.2 C 267.6 51.7, 258.1 79.7, 251.7 96.4 C 245.3 113.0, 239.0 132.6, 234.3 149.5 C 229.6 166.4, 225.6 186.2, 221.8 203.2 C 218.0 220.2, 213.1 239.9, 210.0 257.0 C 207.0 274.1, 204.9 293.9, 202.4 310.9 C 199.9 328.0, 197.8 347.6, 194.2 364.6 C 190.7 381.6, 185.6 401.3, 180.1 418.1 C 174.6 434.9, 167.6 455.1, 159.5 470.9 C 151.4 486.6, 141.0 506.7, 128.9 517.6 C 116.9 528.5, 94.6 540.8, 83.4 539.6 C 72.3 538.4, 59.3 522.8, 58.4 509.8 C 57.6 496.8, 69.0 472.2, 78.1 457.6 C 87.3 443.1, 103.5 429.0, 116.5 417.8 C 129.4 406.6, 145.9 396.0, 159.7 386.8 C 173.6 377.6, 175.2 374.1, 204.1 359.8 C 233.0 345.5, 298.3 312.6, 342.3 296.4 C 386.3 280.3, 437.6 268.1, 481.9 257.8 C 526.1 247.4, 579.9 236.6, 622.0 231.1 C 664.2 225.6, 728.1 224.2, 748.0 223.0"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 284.3 284.7 C 293.2 275.7, 332.4 241.5, 349.3 218.5 C 366.2 195.5, 400.5 118.4, 408.0 116.1 C 415.5 113.8, 401.3 194.6, 404.1 201.8 C 406.8 209.0, 421.9 180.4, 428.1 168.7 C 434.3 156.9, 447.1 114.7, 449.7 115.8 C 452.3 117.0, 446.8 163.2, 447.1 177.3 C 447.4 191.4, 447.4 216.3, 452.1 219.2 C 456.8 222.1, 473.8 205.1, 481.4 198.5 C 489.0 191.8, 507.1 168.9, 507.9 170.6 C 508.7 172.4, 486.9 206.5, 487.2 211.3 C 487.6 216.0, 505.0 210.0, 510.6 205.1 C 516.1 200.3, 523.3 175.6, 527.8 175.7 C 532.3 175.7, 537.9 204.4, 543.5 205.3 C 549.1 206.1, 563.9 182.4, 568.9 181.9 C 573.9 181.4, 571.7 200.4, 580.2 201.5 C 588.7 202.5, 615.6 192.0, 631.4 189.8 C 647.1 187.7, 686.7 186.5, 695.5 185.9"
              stroke="currentColor"
              strokeWidth="11"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

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

        {/* 2. Single-Viewport 3-Column Lando Chamber:
               Left Architectural Wing (`MỤC LỤC`) | Center Swiss Hairline Roster | Right Architectural Wing (`MỞ NHANH`) */}
        <div className="lando-footer-lower-grid reveal-fade">
          <nav className="lando-wing lando-wing--left" aria-label="Mục lục các chương">
            <div className="lando-wing__header">
              <span className="lando-wing__eyebrow">MỤC LỤC</span>
              <span className="lando-wing__count" aria-hidden="true">
                01—04
              </span>
            </div>
            <ul className="lando-wing__list">
              {APP_ROUTES.map((item) => {
                const isCurrent = !isOnSubpageDetail && location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      aria-label={item.title}
                      aria-current={isCurrent ? 'page' : undefined}
                      className="lando-wing-link"
                      onClick={(e) => navigateWithCurtain(item.path, e)}
                    >
                      <span className="lando-wing-link__index" aria-hidden="true">
                        {item.numLabel}
                      </span>
                      <WingSlotText text={item.title.toUpperCase()} arrow="→" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="lando-footer-center-dock">
            {!isOnAssignmentRoute ? (
              <div className="lando-roster-ledger">
                {/* 6x2 Symmetric Swiss Hairline Index (11 Members + Full 6-Stage Index Link) */}
                <div className="lando-roster-grid" role="list" aria-label="Danh sách 11 thành viên">
                  {TEAM_ASSIGNMENTS.map((m) => {
                    const isFocused = m.slug === activeMember.slug;
                    return (
                      <Link
                        key={m.slug}
                        to={`/phan-cong/${m.slug}`}
                        role="listitem"
                        className={`lando-roster-item ${isFocused ? 'lando-roster-item--active' : ''}`}
                        onMouseEnter={() => setActiveSlug(m.slug)}
                        onFocus={() => setActiveSlug(m.slug)}
                        onClick={(ev) => handleOpenSubpage(`/phan-cong/${m.slug}`, ev)}
                      >
                        <span className="lando-roster-item__num">
                          {String(m.memberNumber).padStart(2, '0')}
                        </span>
                        <span className="lando-roster-item__name">{m.memberName}</span>
                        <span className="lando-roster-item__role">{m.shortRole}</span>
                        <span className="lando-roster-item__arrow" aria-hidden="true">
                          ↗
                        </span>
                      </Link>
                    );
                  })}

                  <Link
                    to="/phan-cong"
                    role="listitem"
                    className="lando-roster-item lando-roster-item--all"
                    onClick={(ev) => handleOpenSubpage('/phan-cong', ev)}
                  >
                    <span className="lando-roster-item__num" aria-hidden="true">∑</span>
                    <span className="lando-roster-item__name">Đủ 6 giai đoạn</span>
                    <span className="lando-roster-item__role">Xem toàn bộ lộ trình</span>
                    <span className="lando-roster-item__arrow" aria-hidden="true">
                      ↗
                    </span>
                  </Link>
                </div>

                {/* Quiet 2-Line Live Editorial Readout (Updates on hover/focus without layout jump) */}
                <div className="lando-roster-spotlight" aria-live="polite">
                  <div className="lando-roster-spotlight__meta">
                    <span className="lando-roster-spotlight__who">
                      {String(activeMember.memberNumber).padStart(2, '0')} · {activeMember.memberName}
                    </span>
                    <span className="lando-roster-spotlight__sep" aria-hidden="true">/</span>
                    <span>{activeStage?.code}</span>
                    <span className="lando-roster-spotlight__sep" aria-hidden="true">/</span>
                    <code>{activeMember.files}</code>
                    <span className="lando-roster-spotlight__sep" aria-hidden="true">/</span>
                    <span>{activeMember.bookRefsShort}</span>
                  </div>
                  <p className="lando-roster-spotlight__summary">
                    {activeMember.summaryTasks}
                  </p>
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

          <nav
            className="lando-wing lando-wing--right"
            aria-label="Lối tắt chuyên đề và mã nguồn"
          >
            <div className="lando-wing__header">
              <span className="lando-wing__eyebrow">MỞ NHANH</span>
              <span className="lando-wing__count" aria-hidden="true">
                ↗
              </span>
            </div>
            <ul className="lando-wing__list">
              <li>
                <Link
                  to="/thuc-nghiem/hoi-tu"
                  aria-label="Hội tụ 500 vòng"
                  aria-current={
                    location.pathname === '/thuc-nghiem/hoi-tu' ? 'page' : undefined
                  }
                  className="lando-wing-link lando-wing-link--right"
                  onClick={(e) => handleOpenSubpage('/thuc-nghiem/hoi-tu', e)}
                >
                  <WingSlotText text="HỘI TỤ 500 VÒNG" arrow="↗" />
                </Link>
              </li>
              <li>
                <Link
                  to="/thuc-nghiem/da-cuc-tri"
                  aria-label="Đa cực trị 2D"
                  aria-current={
                    location.pathname === '/thuc-nghiem/da-cuc-tri' ? 'page' : undefined
                  }
                  className="lando-wing-link lando-wing-link--right"
                  onClick={(e) => handleOpenSubpage('/thuc-nghiem/da-cuc-tri', e)}
                >
                  <WingSlotText text="ĐA CỰC TRỊ 2D" arrow="↗" />
                </Link>
              </li>
              <li>
                <Link
                  to="/demo#nen-anh-fa"
                  aria-label="Nén ảnh 24-bit"
                  className="lando-wing-link lando-wing-link--right"
                  onClick={handleJumpCompression}
                >
                  <WingSlotText text="NÉN ẢNH 24-BIT" arrow="↗" />
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/gmaanx/firefly-project"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Mã nguồn GitHub (mở tab mới)"
                  className="lando-wing-link lando-wing-link--right lando-wing-link--external"
                >
                  <WingSlotText text="MÃ NGUỒN GITHUB" arrow="↗" />
                </a>
              </li>
            </ul>
          </nav>
        </div>

        {/* 3. Lando Bottom-Left Raised Neon-Lime Copyright Ear (Clean Bottom-Right Edge) */}
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
