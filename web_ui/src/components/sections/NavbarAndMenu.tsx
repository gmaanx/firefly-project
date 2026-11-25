import { useEffect, useId, useRef, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  APP_ROUTES,
  type AppRoutePath,
  type SurfaceTheme,
} from '../../lib/navigation';
import { ContourBackdrop } from '../shared/ContourBackdrop';
import { KineticRouteLink } from '../shared/KineticButton';
import type { QaTabId } from '../shared/QaDrawer';
import { useRouteCurtain } from '../shared/RouteCurtain';

export interface NavbarAndMenuProps {
  activeRoute: AppRoutePath;
  activeSurface: SurfaceTheme;
  menuOpen: boolean;
  onMenuToggle: (next: boolean) => void;
  onOpenQa: (tab?: QaTabId) => void;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
}

/**
 * Bespoke Architectural Stencil-Didone `FA` Monogram + Stacked `FIREFLY / ALGORITHM` Seal
 * Unified 1:1 with the luxury Stencil-Didone Hero centerpiece (`F` concave Didone column +
 * decoupled stencil beak & crossbar, `A` hyperbolic spire pedestal + high-contrast diagonal stem).
 */
function EditorialFaBrandLockup() {
  return (
    <span className="brand-lockup" translate="no">
      <svg
        viewBox="0 0 348 170"
        width="40"
        height="20"
        className="brand-lockup__emblem"
        aria-hidden="true"
        fill="none"
      >
        {/* F — Didone Stem + Bracketed Serifs */}
        <path
          d="M36 12 H96 V126 C96 146, 105 151.5, 121 151.5 V158 H36 V151.5 C53 151.5, 64 146, 64 126 V44 C64 24, 53 18.5, 36 18.5 Z"
          fill="currentColor"
        />
        {/* F — Stenciled Top Arm + Flared Beak */}
        <path
          d="M108 12 H173 L175 50 H168.5 C166 29, 156 19, 134 19 H108 Z"
          fill="currentColor"
        />
        {/* F — Stenciled Middle Crossbar */}
        <path
          d="M108 79 H129 C141 79, 147 73.5, 148 63 H154.5 V103 H148 C147 92.5, 141 87, 129 87 H108 Z"
          fill="currentColor"
        />
        {/* A — Decoupled Hyperbolic Stencil Spire Pedestal */}
        <path
          d="M160 158 V151.5 C176 151, 184 136, 188 88 H195 C197.5 136, 204 151, 217 151.5 V158 Z"
          fill="currentColor"
        />
        {/* A — Diagonal Stem + Top Beak + Right Foot */}
        <path
          d="M200 12 H238 L290 134 C296.5 148.5, 302.5 151.5, 312 151.5 V158 H245 V151.5 C256 151.5, 260 146, 255 134 L213 33 C209 23.5, 205.5 18.5, 200 18.5 Z"
          fill="currentColor"
        />
        {/* A — Floating Stencil Crossbar */}
        <path
          d="M198 102 H238 L240.5 109.5 H198 Z"
          fill="currentColor"
        />
      </svg>
      <span className="brand-lockup__divider" aria-hidden="true" />
      <span className="brand-lockup__stack">
        <span className="brand-lockup__word">FIREFLY</span>
        <span className="brand-lockup__sub">ALGORITHM</span>
      </span>
    </span>
  );
}

export function NavbarAndMenu({
  activeRoute,
  activeSurface,
  menuOpen,
  onMenuToggle,
  onOpenQa,
  reducedMotion,
  onToggleReducedMotion,
}: NavbarAndMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollSentinelRef = useRef<HTMLDivElement>(null);
  const menuTitleId = useId();
  const { navigateWithCurtain } = useRouteCurtain();
  const [hoveredRoute, setHoveredRoute] = useState<AppRoutePath>(activeRoute);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  useEffect(() => {
    setHoveredRoute(activeRoute);
    setIsScrolled(typeof window !== 'undefined' && window.scrollY > 28);
  }, [activeRoute]);

  useEffect(() => {
    const sentinel = scrollSentinelRef.current;
    if (!sentinel) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setIsScrolled(!entry.isIntersecting);
      },
      { threshold: 0 }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (menuOpen && !dialog.open) {
      dialog.showModal();
    } else if (!menuOpen && dialog.open) {
      dialog.close();
    }
  }, [menuOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      dialog.returnValue = '';
      onMenuToggle(false);
    };
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, [onMenuToggle]);

  const isDarkSurface = activeSurface === 'olive' || activeSurface === 'dark';

  const handleSelectRoute = (to: AppRoutePath, e?: MouseEvent<HTMLElement>) => {
    if (e) e.preventDefault();
    onMenuToggle(false);
    window.setTimeout(() => {
      navigateWithCurtain(to);
    }, 15);
  };

  return (
    <>
      <div
        ref={scrollSentinelRef}
        className="nav-scroll-sentinel"
        aria-hidden="true"
      />
      <header
        className={`top-nav ${
          isDarkSurface ? 'top-nav--on-dark' : 'top-nav--on-light'
        } ${isScrolled ? 'top-nav--scrolled' : ''}`}
        aria-label="Thanh điều hướng chính"
      >
        <div className="top-nav__spacer" aria-hidden="true" />

        <div className="top-nav__actions">
          <KineticRouteLink
            to="/demo"
            label="LIVE DEMO"
            variant={isDarkSurface ? 'lime' : 'dark'}
            className="top-nav__cta"
            onNavigate={(dest, e) => navigateWithCurtain(dest, e)}
          />

          <button
            type="button"
            className="hamburger-btn"
            aria-label={menuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
            aria-expanded={menuOpen}
            onClick={() => onMenuToggle(!menuOpen)}
          >
            <span className="hamburger-btn__bar hamburger-btn__bar--top" aria-hidden="true" />
            <span className="hamburger-btn__bar hamburger-btn__bar--bottom" aria-hidden="true" />
          </button>
        </div>
      </header>

      <dialog
        ref={dialogRef}
        className="split-menu-dialog"
        aria-labelledby={menuTitleId}
        {...({ closedby: 'any' } as Record<string, string>)}
      >
        <div className="split-menu__shell">
          <ContourBackdrop variant="olive" />

          <div className="split-menu__topbar">
            <Link
              to="/"
              className="top-nav__brand"
              style={{ color: 'var(--ink-light)' }}
              onClick={(e) => handleSelectRoute('/', e)}
              aria-label="Về trang chủ Thuật toán Đom đóm"
            >
              <EditorialFaBrandLockup />
            </Link>

            <div className="top-nav__actions">
              <KineticRouteLink
                to="/demo"
                label="LIVE DEMO"
                variant="lime"
                className="top-nav__cta"
                onNavigate={(dest, e) => handleSelectRoute(dest, e)}
              />
              <button
                type="button"
                className="hamburger-btn"
                aria-label="Đóng menu (Esc)"
                aria-expanded="true"
                onClick={() => onMenuToggle(false)}
              >
                <span className="hamburger-btn__bar hamburger-btn__bar--top" aria-hidden="true" />
                <span className="hamburger-btn__bar hamburger-btn__bar--bottom" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="split-menu__body">
            <div className="split-menu__visual-grid" aria-hidden="true">
              {/* Tile 01: Orchestrated 3D Valley & Firefly Swarm */}
              <div
                className={`menu-preview-tile ${
                  hoveredRoute === '/' ? 'menu-preview-tile--active' : ''
                }`}
              >
                <div className="menu-preview-tile__head">
                  <span>01</span>
                  <span>Tổng quan</span>
                </div>
                <svg viewBox="0 0 180 120" className="menu-preview-tile__svg" fill="none">
                  <circle cx="48" cy="28" r="7" fill="rgba(180,210,245,0.45)" />
                  <path
                    d="M10 92 L42 64 L72 82 L110 78 L142 56 L170 92"
                    stroke="rgba(239,239,232,0.34)"
                    strokeWidth="1.2"
                  />
                  <text
                    x="90"
                    y="66"
                    textAnchor="middle"
                    fill="#FFF5E4"
                    fontSize="24"
                    fontWeight="600"
                    letterSpacing="0.08em"
                    fontFamily="var(--font-serif)"
                  >
                    FA
                  </text>
                  <circle cx="64" cy="58" r="2.8" fill="#FFDA8A" />
                  <circle cx="116" cy="52" r="3.2" fill="#DCF484" />
                  <circle cx="102" cy="74" r="2.4" fill="#C294FF" />
                  <circle cx="76" cy="76" r="2.5" fill="#FFDA8A" />
                </svg>
              </div>

              {/* Tile 02: Thuật toán */}
              <div
                className={`menu-preview-tile ${
                  hoveredRoute === '/thuat-toan' ? 'menu-preview-tile--active' : ''
                }`}
              >
                <div className="menu-preview-tile__head">
                  <span>02</span>
                  <span>Nguyên lý</span>
                </div>
                <svg viewBox="0 0 180 120" className="menu-preview-tile__svg" fill="none">
                  <ellipse cx="114" cy="54" rx="44" ry="28" stroke="rgba(239,239,232,0.18)" />
                  <ellipse cx="114" cy="54" rx="24" ry="15" stroke="rgba(182,201,110,0.42)" />
                  <path d="M40 84 Q74 62 106 55" stroke="#C5E84D" strokeWidth="1.7" />
                  <path d="M54 32 Q82 42 106 51" stroke="#B6C96E" strokeWidth="1.3" />
                  <circle cx="114" cy="54" r="4.8" fill="#C5E84D" />
                  <circle cx="40" cy="84" r="3.2" fill="#EFEFE8" />
                  <circle cx="54" cy="32" r="3" fill="#EFEFE8" />
                </svg>
              </div>

              {/* Tile 03: Thực nghiệm */}
              <div
                className={`menu-preview-tile ${
                  hoveredRoute === '/thuc-nghiem' ? 'menu-preview-tile--active' : ''
                }`}
              >
                <div className="menu-preview-tile__head">
                  <span>03</span>
                  <span>Thực nghiệm</span>
                </div>
                <svg viewBox="0 0 180 120" className="menu-preview-tile__svg" fill="none">
                  <line x1="20" y1="98" x2="160" y2="98" stroke="rgba(239,239,232,0.18)" />
                  <path
                    d="M22 26 L54 48 L88 70 L122 86 L158 94"
                    stroke="#C5E84D"
                    strokeWidth="2"
                  />
                  <path
                    d="M22 34 L60 40 L102 44 L158 46"
                    stroke="#8D7AE6"
                    strokeWidth="1.3"
                    strokeDasharray="4 3"
                  />
                  <circle cx="158" cy="94" r="4.2" fill="#C5E84D" />
                </svg>
              </div>

              {/* Tile 04: Demo & Nén ảnh */}
              <div
                className={`menu-preview-tile ${
                  hoveredRoute === '/demo' ? 'menu-preview-tile--active' : ''
                }`}
              >
                <div className="menu-preview-tile__head">
                  <span>04</span>
                  <span>Mô phỏng</span>
                </div>
                <svg viewBox="0 0 180 120" className="menu-preview-tile__svg" fill="none">
                  <rect
                    x="22"
                    y="20"
                    width="136"
                    height="62"
                    rx="5"
                    stroke="rgba(239,239,232,0.22)"
                  />
                  <line x1="90" y1="16" x2="90" y2="86" stroke="#C5E84D" strokeWidth="1.5" />
                  <circle cx="56" cy="51" r="14" stroke="rgba(239,239,232,0.34)" />
                  <circle cx="124" cy="51" r="14" stroke="rgba(141,122,230,0.52)" />
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <line
                      key={idx}
                      x1={26 + idx * 28}
                      y1="96"
                      x2={46 + idx * 28}
                      y2="96"
                      stroke={idx === 4 ? '#C5E84D' : idx === 3 ? '#B6C96E' : 'rgba(239,239,232,0.36)'}
                      strokeWidth="2.2"
                    />
                  ))}
                </svg>
              </div>
            </div>

            <nav className="split-menu__nav" aria-label="Điều hướng trình chiếu">
              <span id={menuTitleId} className="sr-only">
                Điều hướng trình chiếu
              </span>
              {APP_ROUTES.map((route) => {
                const isSelected = hoveredRoute === route.path;
                const isCurrent = activeRoute === route.path;

                return (
                  <Link
                    key={route.path}
                    to={route.path}
                    aria-current={isCurrent ? 'page' : undefined}
                    className={`split-menu__link ${isSelected ? 'split-menu__link--active' : ''}`}
                    onMouseEnter={() => setHoveredRoute(route.path)}
                    onFocus={() => setHoveredRoute(route.path)}
                    onClick={(e) => handleSelectRoute(route.path, e)}
                  >
                    <span className="split-menu__link-num">{route.numLabel}</span>
                    <span>{route.title}</span>
                    <svg
                      viewBox="0 0 240 14"
                      preserveAspectRatio="none"
                      className="split-menu__wave"
                      aria-hidden="true"
                    >
                      <path
                        d="M2 7 C52 3, 96 11, 144 7 C184 4, 212 9, 238 6"
                        fill="none"
                        stroke="#B6C96E"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="split-menu__footer">
            <div className="split-menu__utilities">
              <button
                type="button"
                className="menu-util-btn"
                onClick={() => {
                  onMenuToggle(false);
                  onOpenQa('guardrails');
                }}
              >
                Hồ sơ Q&amp;A &amp; Chứng minh ↗
              </button>
              <button
                type="button"
                className={`menu-util-btn ${reducedMotion ? 'menu-util-btn--active' : ''}`}
                onClick={onToggleReducedMotion}
              >
                {reducedMotion ? '● ' : ''}Giảm chuyển động: {reducedMotion ? 'BẬT' : 'TẮT'}
              </button>
            </div>

            <div className="split-menu__shortcuts" aria-label="Phím tắt trình chiếu">
              <span>
                <kbd>1</kbd>–<kbd>4</kbd> Chuyển trang
              </span>
              <span>
                <kbd>M</kbd> Menu
              </span>
              <span>
                <kbd>Q</kbd> Hỏi đáp Q&amp;A
              </span>
              <span>
                <kbd>Space</kbd> Chạy / Dừng mô phỏng
              </span>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
