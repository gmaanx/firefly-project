import { useEffect, useId, useRef, useState, type MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  APP_ROUTES,
  isSubpageDetailPath,
  type AppRoutePath,
  type SurfaceTheme,
} from '../../lib/navigation';
import { ContourBackdrop } from '../shared/ContourBackdrop';
import { KineticRouteLink } from '../shared/KineticButton';
import { useRouteCurtain } from '../shared/RouteCurtain';

export interface NavbarAndMenuProps {
  activeRoute: AppRoutePath;
  activeSurface: SurfaceTheme;
  menuOpen: boolean;
  onMenuToggle: (next: boolean) => void;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
  onPreloadRoute?: (to: AppRoutePath) => void;
}

const LANDO_EASE = 'cubic-bezier(0.65, 0.05, 0, 1)';
const LANDO_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const LANDO_IN = 'cubic-bezier(0.55, 0, 1, 0.45)';

/**
 * Clean Frameless Architectural Stencil-Didone `FA` Monogram Logo
 * (Zero pill capsule, zero wordy text — matches Hero centerpiece & Lando top-left brand balance)
 */
function FaMonogramLogo() {
  return (
    <span className="fa-nav-logo" translate="no">
      <svg
        viewBox="0 0 348 170"
        width="44"
        height="22"
        className="fa-nav-logo__svg"
        aria-hidden="true"
        fill="none"
      >
        <path
          d="M36 12 H96 V126 C96 146, 105 151.5, 121 151.5 V158 H36 V151.5 C53 151.5, 64 146, 64 126 V44 C64 24, 53 18.5, 36 18.5 Z"
          fill="currentColor"
        />
        <path
          d="M108 12 H173 L175 50 H168.5 C166 29, 156 19, 134 19 H108 Z"
          fill="currentColor"
        />
        <path
          d="M108 79 H129 C141 79, 147 73.5, 148 63 H154.5 V103 H148 C147 92.5, 141 87, 129 87 H108 Z"
          fill="currentColor"
        />
        <path
          d="M160 158 V151.5 C176 151, 184 136, 188 88 H195 C197.5 136, 204 151, 217 151.5 V158 Z"
          fill="currentColor"
        />
        <path
          d="M200 12 H238 L290 134 C296.5 148.5, 302.5 151.5, 312 151.5 V158 H245 V151.5 C256 151.5, 260 146, 255 134 L213 33 C209 23.5, 205.5 18.5, 200 18.5 Z"
          fill="currentColor"
        />
        <path
          d="M198 102 H238 L240.5 109.5 H198 Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

export function NavbarAndMenu({
  activeRoute,
  activeSurface,
  menuOpen,
  onMenuToggle,
  reducedMotion,
  onToggleReducedMotion,
  onPreloadRoute,
}: NavbarAndMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const backdropScrimRef = useRef<HTMLDivElement>(null);
  const scrollSentinelRef = useRef<HTMLDivElement>(null);
  const animTokenRef = useRef<number>(0);
  const skipNextCloseAnimRef = useRef<boolean>(false);
  const menuTitleId = useId();
  const dialogId = useId();
  const location = useLocation();
  const { navigateWithCurtain, returnFromSubpage } = useRouteCurtain();
  const isDetailSubpage = isSubpageDetailPath(location.pathname);
  const isExpSubpage =
    location.pathname.startsWith('/thuc-nghiem/') &&
    location.pathname !== '/thuc-nghiem/';
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

  // Native Web-Animations-API Lando Curved-Arch Menu Open & Close (immune to lagSmoothing throttling!)
  useEffect(() => {
    const dialog = dialogRef.current;
    const shell = shellRef.current;
    const scrim = backdropScrimRef.current;
    if (!dialog || !shell) return;

    const token = ++animTokenRef.current;

    const cancelActiveAnims = () => {
      shell.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      scrim?.getAnimations().forEach((a) => a.cancel());
    };

    const tiles = Array.from(
      shell.querySelectorAll<HTMLElement>('.menu-preview-tile')
    );
    const linkInners = Array.from(
      shell.querySelectorAll<HTMLElement>('.split-menu__link-inner')
    );
    const footerEl = shell.querySelector<HTMLElement>('.split-menu__footer');

    if (menuOpen) {
      skipNextCloseAnimRef.current = false;
      cancelActiveAnims();
      if (!dialog.open) {
        dialog.showModal();
        closeBtnRef.current?.focus({ preventScroll: true });
      }

      if (reducedMotion) {
        shell.style.clipPath = 'none';
        if (scrim) scrim.style.opacity = '1';
        tiles.forEach((t) => {
          t.style.clipPath = 'none';
          t.style.transform = '';
        });
        linkInners.forEach((l) => {
          l.style.transform = 'translate3d(0, 0%, 0)';
        });
        if (footerEl) {
          footerEl.style.opacity = '1';
          footerEl.style.transform = 'translate3d(0, 0, 0)';
        }
        return;
      }

      if (scrim) {
        scrim.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 380,
          easing: 'ease-out',
          fill: 'forwards',
        });
      }

      const shellOpenAnim = shell.animate(
        [
          { clipPath: 'ellipse(140% 0% at 50% 0%)' },
          { clipPath: 'ellipse(140% 150% at 50% 0%)' },
        ],
        {
          duration: 600,
          easing: LANDO_EASE,
          fill: 'forwards',
        }
      );

      tiles.forEach((tile, idx) => {
        tile.animate(
          [
            {
              clipPath: 'ellipse(140% 0% at 50% 0%)',
              transform: 'scale(1.05)',
            },
            {
              clipPath: 'ellipse(140% 150% at 50% 0%)',
              transform: 'scale(1)',
            },
          ],
          {
            duration: 520,
            delay: 140 + idx * 46,
            easing: LANDO_OUT,
            fill: 'both',
          }
        );
      });

      linkInners.forEach((linkEl, idx) => {
        linkEl.animate(
          [
            { transform: 'translate3d(0, 112%, 0)' },
            { transform: 'translate3d(0, 0%, 0)' },
          ],
          {
            duration: 500,
            delay: 170 + idx * 50,
            easing: LANDO_OUT,
            fill: 'both',
          }
        );
      });

      footerEl?.animate(
        [
          { opacity: 0, transform: 'translate3d(0, 10px, 0)' },
          { opacity: 1, transform: 'translate3d(0, 0px, 0)' },
        ],
        {
          duration: 340,
          delay: 310,
          easing: LANDO_OUT,
          fill: 'both',
        }
      );

      shellOpenAnim.finished
        .then(() => {
          if (animTokenRef.current !== token) return;
          shell.style.clipPath = 'none';
          shellOpenAnim.cancel();
        })
        .catch(() => {});
      return;
    }

    // Closing menu
    if (!dialog.open) return;

    if (reducedMotion || skipNextCloseAnimRef.current) {
      skipNextCloseAnimRef.current = false;
      cancelActiveAnims();
      shell.style.clipPath = 'none';
      dialog.close();
      return;
    }

    cancelActiveAnims();

    footerEl?.animate(
      [
        { opacity: 1, transform: 'translate3d(0, 0px, 0)' },
        { opacity: 0, transform: 'translate3d(0, -6px, 0)' },
      ],
      {
        duration: 180,
        easing: LANDO_IN,
        fill: 'forwards',
      }
    );

    linkInners.forEach((linkEl, idx) => {
      linkEl.animate(
        [
          { transform: 'translate3d(0, 0%, 0)' },
          { transform: 'translate3d(0, -110%, 0)' },
        ],
        {
          duration: 230,
          delay: idx * 22,
          easing: LANDO_IN,
          fill: 'forwards',
        }
      );
    });

    if (scrim) {
      scrim.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 420,
        delay: 60,
        easing: 'ease-in-out',
        fill: 'forwards',
      });
    }

    const shellCloseAnim = shell.animate(
      [
        { clipPath: 'ellipse(140% 150% at 50% 0%)' },
        { clipPath: 'ellipse(140% 0% at 50% 0%)' },
      ],
      {
        duration: 480,
        delay: 50,
        easing: LANDO_EASE,
        fill: 'forwards',
      }
    );

    Promise.race([
      shellCloseAnim.finished,
      new Promise((r) => window.setTimeout(r, 700)),
    ])
      .then(() => {
        if (animTokenRef.current !== token) return;
        cancelActiveAnims();
        shell.style.clipPath = 'none';
        if (dialog.open) {
          dialog.close();
        }
      })
      .catch(() => {});
  }, [menuOpen, reducedMotion]);

  // Intercept Escape (`cancel`) & native close so dismiss always plays the silky Lando arch animation
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onCancel = (ev: Event) => {
      if (ev.cancelable) {
        ev.preventDefault();
        onMenuToggle(false);
      }
    };

    const onClose = () => {
      dialog.returnValue = '';
      onMenuToggle(false);
    };

    dialog.addEventListener('cancel', onCancel);
    dialog.addEventListener('close', onClose);
    return () => {
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('close', onClose);
    };
  }, [onMenuToggle]);

  const isDarkSurface = activeSurface === 'olive' || activeSurface === 'dark';

  const handleSelectRoute = (to: AppRoutePath, e?: MouseEvent<HTMLElement>) => {
    if (e) e.preventDefault();

    if (to === activeRoute) {
      onMenuToggle(false);
      return;
    }

    navigateWithCurtain(to, undefined, undefined, {
      fromOpenMenu: true,
      onBeforeSwap: () => {
        skipNextCloseAnimRef.current = true;
        onMenuToggle(false);
        if (dialogRef.current?.open) {
          dialogRef.current.close();
        }
      },
    });
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
          isDarkSurface || isDetailSubpage ? 'top-nav--on-dark' : 'top-nav--on-light'
        } ${isScrolled ? 'top-nav--scrolled' : ''}`}
        aria-label="Thanh điều hướng chính"
      >
        {isDetailSubpage ? (
          <button
            type="button"
            className="top-nav__back-btn"
            onClick={() =>
              returnFromSubpage(isExpSubpage ? '/thuc-nghiem' : '/thuat-toan')
            }
            aria-label={
              isExpSubpage
                ? 'Quay lại trang Thực nghiệm'
                : 'Quay lại trang trước'
            }
          >
            <span className="top-nav__back-arrow" aria-hidden="true">
              ←
            </span>
            <span>{isExpSubpage ? 'Quay lại Thực nghiệm' : 'Quay lại'}</span>
          </button>
        ) : (
          <Link
            to="/"
            className="top-nav__brand"
            onClick={(e) => navigateWithCurtain('/', e)}
            aria-label="Về trang chủ Thuật toán Đom đóm"
          >
            <FaMonogramLogo />
          </Link>
        )}

        <div className="top-nav__actions">
          <KineticRouteLink
            to="/demo"
            label="LIVE DEMO"
            variant={isDarkSurface || isDetailSubpage ? 'lime' : 'dark'}
            className="top-nav__cta"
            onNavigate={(dest, e) => navigateWithCurtain(dest, e)}
          />

          <button
            type="button"
            className="hamburger-btn"
            aria-label={menuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
            aria-expanded={menuOpen}
            aria-controls={dialogId}
            onClick={() => onMenuToggle(!menuOpen)}
          >
            <span
              className="hamburger-btn__bar hamburger-btn__bar--top"
              aria-hidden="true"
            />
            <span
              className="hamburger-btn__bar hamburger-btn__bar--bottom"
              aria-hidden="true"
            />
          </button>
        </div>
      </header>

      <dialog
        id={dialogId}
        ref={dialogRef}
        className="split-menu-dialog"
        aria-labelledby={menuTitleId}
        onClick={(ev) => {
          if (ev.target === dialogRef.current || ev.target === backdropScrimRef.current) {
            onMenuToggle(false);
          }
        }}
      >
        <div
          ref={backdropScrimRef}
          className="split-menu__scrim"
          aria-hidden="true"
        />

        <div ref={shellRef} className="split-menu__shell">
          <ContourBackdrop variant="olive" />

          <div className="split-menu__topbar">
            <Link
              to="/"
              className="top-nav__brand"
              style={{ color: 'var(--ink-light)' }}
              onClick={(e) => handleSelectRoute('/', e)}
              aria-label="Về trang chủ Thuật toán Đom đóm"
            >
              <FaMonogramLogo />
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
                ref={closeBtnRef}
                type="button"
                className="hamburger-btn"
                aria-label="Đóng menu (Esc)"
                aria-expanded="true"
                onClick={() => onMenuToggle(false)}
              >
                <span
                  className="hamburger-btn__bar hamburger-btn__bar--top"
                  aria-hidden="true"
                />
                <span
                  className="hamburger-btn__bar hamburger-btn__bar--bottom"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          <div className="split-menu__body">
            <div className="split-menu__visual-grid" aria-hidden="true">
              {/* Tile 01: Trang chủ */}
              <div
                className={`menu-preview-tile ${
                  hoveredRoute === '/' ? 'menu-preview-tile--active' : ''
                }`}
              >
                <div className="menu-preview-tile__head">
                  <span>01</span>
                  <span>Trang chủ</span>
                </div>
                <svg
                  viewBox="0 0 180 120"
                  className="menu-preview-tile__svg"
                  fill="none"
                >
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
                  <span>Thuật toán</span>
                </div>
                <svg
                  viewBox="0 0 180 120"
                  className="menu-preview-tile__svg"
                  fill="none"
                >
                  <ellipse
                    cx="114"
                    cy="54"
                    rx="44"
                    ry="28"
                    stroke="rgba(239,239,232,0.18)"
                  />
                  <ellipse
                    cx="114"
                    cy="54"
                    rx="24"
                    ry="15"
                    stroke="rgba(182,201,110,0.42)"
                  />
                  <path
                    d="M40 84 Q74 62 106 55"
                    stroke="#C5E84D"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M54 32 Q82 42 106 51"
                    stroke="#B6C96E"
                    strokeWidth="1.3"
                  />
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
                <svg
                  viewBox="0 0 180 120"
                  className="menu-preview-tile__svg"
                  fill="none"
                >
                  <line
                    x1="20"
                    y1="98"
                    x2="160"
                    y2="98"
                    stroke="rgba(239,239,232,0.18)"
                  />
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

              {/* Tile 04: Mô phỏng */}
              <div
                className={`menu-preview-tile ${
                  hoveredRoute === '/demo' ? 'menu-preview-tile--active' : ''
                }`}
              >
                <div className="menu-preview-tile__head">
                  <span>04</span>
                  <span>Mô phỏng</span>
                </div>
                <svg
                  viewBox="0 0 180 120"
                  className="menu-preview-tile__svg"
                  fill="none"
                >
                  <rect
                    x="22"
                    y="20"
                    width="136"
                    height="62"
                    rx="5"
                    stroke="rgba(239,239,232,0.22)"
                  />
                  <line
                    x1="90"
                    y1="16"
                    x2="90"
                    y2="86"
                    stroke="#C5E84D"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx="56"
                    cy="51"
                    r="14"
                    stroke="rgba(239,239,232,0.34)"
                  />
                  <circle
                    cx="124"
                    cy="51"
                    r="14"
                    stroke="rgba(141,122,230,0.52)"
                  />
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <line
                      key={idx}
                      x1={26 + idx * 28}
                      y1="96"
                      x2={46 + idx * 28}
                      y2="96"
                      stroke={
                        idx === 4
                          ? '#C5E84D'
                          : idx === 3
                            ? '#B6C96E'
                            : 'rgba(239,239,232,0.36)'
                      }
                      strokeWidth="2.2"
                    />
                  ))}
                </svg>
              </div>
            </div>

            <nav className="split-menu__nav" aria-label="Điều hướng chính">
              <span id={menuTitleId} className="sr-only">
                Điều hướng chính
              </span>
              {APP_ROUTES.map((route) => {
                const isSelected = hoveredRoute === route.path;
                const isCurrent = activeRoute === route.path;

                return (
                  <Link
                    key={route.path}
                    to={route.path}
                    aria-current={isCurrent ? 'page' : undefined}
                    className={`split-menu__link ${
                      isSelected ? 'split-menu__link--active' : ''
                    }`}
                    onMouseEnter={() => {
                      setHoveredRoute(route.path);
                      onPreloadRoute?.(route.path);
                    }}
                    onFocus={() => {
                      setHoveredRoute(route.path);
                      onPreloadRoute?.(route.path);
                    }}
                    onClick={(e) => handleSelectRoute(route.path, e)}
                  >
                    <span className="split-menu__link-mask">
                      <span className="split-menu__link-inner">
                        <span className="split-menu__link-num">{route.numLabel}</span>
                        <span>{route.title}</span>
                      </span>
                    </span>
                    <svg
                      viewBox="0 0 260 16"
                      preserveAspectRatio="none"
                      className="split-menu__wave"
                      aria-hidden="true"
                    >
                      <path
                        d="M2 3 H58 C66 3 72 6 78 11 C83 14 90 14 98 14 H162 C170 14 177 14 182 11 C188 6 194 3 202 3 H258"
                        fill="none"
                        stroke="#d2ff00"
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
                className={`menu-util-btn ${
                  reducedMotion ? 'menu-util-btn--active' : ''
                }`}
                onClick={onToggleReducedMotion}
              >
                Chuyển động: {reducedMotion ? 'GIẢM' : 'BẬT'}
              </button>
            </div>

            <div className="split-menu__shortcuts" aria-label="Phím tắt">
              <span>
                <kbd>1</kbd>–<kbd>4</kbd> Trang
              </span>
              <span>
                <kbd>M</kbd> Menu
              </span>
              <span>
                <kbd>Space</kbd> Chạy/Dừng
              </span>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
