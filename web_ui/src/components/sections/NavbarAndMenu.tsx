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
  const overlayRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const backdropScrimRef = useRef<HTMLDivElement>(null);
  const hamBtnRef = useRef<HTMLButtonElement>(null);
  const barTopRef = useRef<SVGPathElement>(null);
  const barBotRef = useRef<SVGPathElement>(null);
  const ribbonRef = useRef<SVGPathElement>(null);
  const crossARef = useRef<SVGPathElement>(null);
  const crossBRef = useRef<SVGPathElement>(null);
  const scrollSentinelRef = useRef<HTMLDivElement>(null);
  const animTokenRef = useRef<number>(0);
  const skipNextCloseAnimRef = useRef<boolean>(false);
  const hasMountedRef = useRef<boolean>(false);

  const menuTitleId = useId();
  const overlayId = useId();
  const location = useLocation();
  const { navigateWithCurtain, returnFromSubpage } = useRouteCurtain();
  const isDetailSubpage = isSubpageDetailPath(location.pathname);
  const isExpSubpage =
    location.pathname.startsWith('/thuc-nghiem/') &&
    location.pathname !== '/thuc-nghiem/';
  const [hoveredRoute, setHoveredRoute] = useState<AppRoutePath>(activeRoute);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [overlayMounted, setOverlayMounted] = useState<boolean>(menuOpen);

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

  // Authentic Lando Norris Rive-style Calligraphic Ribbon-Loop Hamburger <-> `×` State Machine
  // Runs on the SINGLE persistent `.hamburger-btn` above the menu overlay (never swaps two buttons!)
  useEffect(() => {
    const barTop = barTopRef.current;
    const barBot = barBotRef.current;
    const ribbon = ribbonRef.current;
    const crossA = crossARef.current;
    const crossB = crossBRef.current;
    if (!barTop || !barBot || !ribbon || !crossA || !crossB) return;

    const allSvgPaths = [barTop, barBot, ribbon, crossA, crossB];
    allSvgPaths.forEach((p) => p.getAnimations().forEach((a) => a.cancel()));

    const applyStaticIconState = (open: boolean) => {
      barTop.style.strokeDashoffset = open ? '1' : '0';
      barTop.style.opacity = open ? '0' : '1';
      barBot.style.strokeDashoffset = open ? '1' : '0';
      barBot.style.opacity = open ? '0' : '1';
      ribbon.style.strokeDashoffset = open ? '-1.04' : '0.38';
      ribbon.style.opacity = '0';
      crossA.style.strokeDashoffset = open ? '0' : '1';
      crossA.style.opacity = open ? '1' : '0';
      crossB.style.strokeDashoffset = open ? '0' : '1';
      crossB.style.opacity = open ? '1' : '0';
    };

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      applyStaticIconState(menuOpen);
      return;
    }

    if (reducedMotion) {
      applyStaticIconState(menuOpen);
      return;
    }

    if (menuOpen) {
      // Phase 1: Staggered `=` bars zip into the calligraphic loop ribbon
      barTop.style.opacity = '1';
      barBot.style.opacity = '1';
      barTop.animate(
        [
          { strokeDashoffset: 0, opacity: 1 },
          { strokeDashoffset: -1, opacity: 0.2 },
        ],
        { duration: 170, easing: LANDO_IN, fill: 'forwards' }
      ).onfinish = () => {
        barTop.style.opacity = '0';
        barTop.style.strokeDashoffset = '1';
      };

      barBot.animate(
        [
          { strokeDashoffset: 0, opacity: 1 },
          { strokeDashoffset: 1, opacity: 0.2 },
        ],
        { duration: 195, delay: 20, easing: LANDO_IN, fill: 'forwards' }
      ).onfinish = () => {
        barBot.style.opacity = '0';
        barBot.style.strokeDashoffset = '1';
      };

      // Phase 2: Signature Lando cursive knot ribbon sweeps across the button (`step_17_shot_1`!)
      ribbon.style.opacity = '1';
      ribbon.animate(
        [
          { strokeDashoffset: 0.36, opacity: 1, offset: 0 },
          { strokeDashoffset: -0.32, opacity: 1, offset: 0.52 },
          { strokeDashoffset: -1.04, opacity: 0, offset: 1 },
        ],
        { duration: 430, delay: 55, easing: LANDO_EASE, fill: 'forwards' }
      ).onfinish = () => {
        ribbon.style.opacity = '0';
      };

      // Phase 3: Crisp `×` diagonals draw out of the ribbon tail
      crossA.style.opacity = '0';
      crossB.style.opacity = '0';
      crossA.animate(
        [
          { strokeDashoffset: 1, opacity: 1 },
          { strokeDashoffset: 0, opacity: 1 },
        ],
        { duration: 270, delay: 285, easing: LANDO_OUT, fill: 'forwards' }
      ).onfinish = () => {
        crossA.style.strokeDashoffset = '0';
        crossA.style.opacity = '1';
      };

      crossB.animate(
        [
          { strokeDashoffset: 1, opacity: 1 },
          { strokeDashoffset: 0, opacity: 1 },
        ],
        { duration: 270, delay: 345, easing: LANDO_OUT, fill: 'forwards' }
      ).onfinish = () => {
        crossB.style.strokeDashoffset = '0';
        crossB.style.opacity = '1';
      };
    } else {
      // Reverse Lando choreography: `×` retracts -> cursive knot ribbon whips back -> `=` bars draw in!
      crossB.style.opacity = '1';
      crossA.style.opacity = '1';
      crossB.animate(
        [
          { strokeDashoffset: 0, opacity: 1 },
          { strokeDashoffset: 1, opacity: 0.2 },
        ],
        { duration: 165, easing: LANDO_IN, fill: 'forwards' }
      ).onfinish = () => {
        crossB.style.opacity = '0';
        crossB.style.strokeDashoffset = '1';
      };

      crossA.animate(
        [
          { strokeDashoffset: 0, opacity: 1 },
          { strokeDashoffset: 1, opacity: 0.2 },
        ],
        { duration: 185, delay: 25, easing: LANDO_IN, fill: 'forwards' }
      ).onfinish = () => {
        crossA.style.opacity = '0';
        crossA.style.strokeDashoffset = '1';
      };

      ribbon.style.opacity = '1';
      ribbon.animate(
        [
          { strokeDashoffset: -1.04, opacity: 0.9, offset: 0 },
          { strokeDashoffset: -0.32, opacity: 1, offset: 0.48 },
          { strokeDashoffset: 0.38, opacity: 0, offset: 1 },
        ],
        { duration: 400, delay: 65, easing: LANDO_EASE, fill: 'forwards' }
      ).onfinish = () => {
        ribbon.style.opacity = '0';
      };

      barBot.style.opacity = '0';
      barTop.style.opacity = '0';
      barBot.animate(
        [
          { strokeDashoffset: 1, opacity: 1 },
          { strokeDashoffset: 0, opacity: 1 },
        ],
        { duration: 265, delay: 265, easing: LANDO_OUT, fill: 'forwards' }
      ).onfinish = () => {
        barBot.style.strokeDashoffset = '0';
        barBot.style.opacity = '1';
      };

      barTop.animate(
        [
          { strokeDashoffset: -1, opacity: 1 },
          { strokeDashoffset: 0, opacity: 1 },
        ],
        { duration: 255, delay: 325, easing: LANDO_OUT, fill: 'forwards' }
      ).onfinish = () => {
        barTop.style.strokeDashoffset = '0';
        barTop.style.opacity = '1';
      };
    }
  }, [menuOpen, reducedMotion]);

  // Mount overlay immediately when `menuOpen` turns true
  useEffect(() => {
    if (menuOpen) {
      setOverlayMounted(true);
    }
  }, [menuOpen]);

  // Native Web-Animations-API Lando Curved-Visor Menu Open & Close
  useEffect(() => {
    if (!overlayMounted) return;
    const shell = shellRef.current;
    const scrim = backdropScrimRef.current;
    if (!shell) return;

    const token = ++animTokenRef.current;

    const cancelActiveAnims = () => {
      shell.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      scrim?.getAnimations().forEach((a) => a.cancel());
    };

    const tiles = Array.from(
      shell.querySelectorAll<HTMLElement>('.menu-preview-tile')
    );
    const linkMasks = Array.from(
      shell.querySelectorAll<HTMLElement>('.split-menu__link')
    );
    const linkInners = Array.from(
      shell.querySelectorAll<HTMLElement>('.split-menu__link-inner')
    );
    const wipeBars = Array.from(
      shell.querySelectorAll<HTMLElement>('.split-menu__wipe-bar')
    );
    const footerEl = shell.querySelector<HTMLElement>('.split-menu__footer');

    if (menuOpen) {
      skipNextCloseAnimRef.current = false;
      cancelActiveAnims();

      if (reducedMotion) {
        shell.style.clipPath = 'none';
        if (scrim) scrim.style.opacity = '1';
        tiles.forEach((t) => {
          t.style.clipPath = 'none';
          t.style.transform = '';
        });
        linkMasks.forEach((m) => {
          m.style.clipPath = 'none';
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
          duration: 360,
          easing: 'ease-out',
          fill: 'forwards',
        });
      }

      // Authentic Lando `.nav-menu-w` elliptical visor reveal (`ellipse(120% 0% at 50% 0%) -> ellipse(120% 115% at 50% 20%)`)
      const shellOpenAnim = shell.animate(
        [
          { clipPath: 'ellipse(120% 0% at 50% 0%)' },
          { clipPath: 'ellipse(120% 115% at 50% 20%)' },
        ],
        {
          duration: 680,
          easing: LANDO_EASE,
          fill: 'forwards',
        }
      );

      tiles.forEach((tile, idx) => {
        tile.animate(
          [
            {
              clipPath: 'ellipse(120% 0% at 50% 0%)',
              transform: 'scale(1.04)',
            },
            {
              clipPath: 'ellipse(120% 125% at 50% 20%)',
              transform: 'scale(1)',
            },
          ],
          {
            duration: 560,
            delay: 130 + idx * 48,
            easing: LANDO_EASE,
            fill: 'both',
          }
        );
      });

      linkMasks.forEach((maskEl, idx) => {
        maskEl.animate(
          [
            { clipPath: 'ellipse(120% 0% at 50% 0%)' },
            { clipPath: 'ellipse(120% 130% at 50% 20%)' },
          ],
          {
            duration: 540,
            delay: 150 + idx * 54,
            easing: LANDO_EASE,
            fill: 'both',
          }
        );
      });

      linkInners.forEach((linkEl, idx) => {
        linkEl.animate(
          [
            { transform: 'translate3d(0, 90%, 0)' },
            { transform: 'translate3d(0, 0%, 0)' },
          ],
          {
            duration: 520,
            delay: 150 + idx * 54,
            easing: LANDO_OUT,
            fill: 'both',
          }
        );
      });

      // Signature Lando `#d2ff00` neon-lime highlight bar sweep on bottom utility controls (`step_26_shot_1`!)
      wipeBars.forEach((bar, idx) => {
        bar.animate(
          [
            { transform: 'scaleX(0)', transformOrigin: 'left center', opacity: 1, offset: 0 },
            { transform: 'scaleX(1)', transformOrigin: 'left center', opacity: 1, offset: 0.46 },
            { transform: 'scaleX(1)', transformOrigin: 'right center', opacity: 1, offset: 0.54 },
            { transform: 'scaleX(0)', transformOrigin: 'right center', opacity: 1, offset: 1 },
          ],
          {
            duration: 520,
            delay: 260 + idx * 55,
            easing: LANDO_EASE,
            fill: 'both',
          }
        );
      });

      footerEl?.animate(
        [
          { opacity: 0, transform: 'translate3d(0, 8px, 0)' },
          { opacity: 1, transform: 'translate3d(0, 0px, 0)' },
        ],
        {
          duration: 340,
          delay: 290,
          easing: LANDO_OUT,
          fill: 'both',
        }
      );

      shellOpenAnim.finished
        .then(() => {
          if (animTokenRef.current !== token) return;
          shell.style.clipPath = 'none';
          tiles.forEach((t) => {
            t.style.clipPath = 'none';
          });
          linkMasks.forEach((m) => {
            m.style.clipPath = 'none';
          });
          shellOpenAnim.cancel();
        })
        .catch(() => {});
      return;
    }

    // Closing menu
    if (reducedMotion || skipNextCloseAnimRef.current) {
      skipNextCloseAnimRef.current = false;
      cancelActiveAnims();
      shell.style.clipPath = 'none';
      setOverlayMounted(false);
      return;
    }

    cancelActiveAnims();

    wipeBars.forEach((bar, idx) => {
      bar.animate(
        [
          { transform: 'scaleX(0)', transformOrigin: 'right center', opacity: 1, offset: 0 },
          { transform: 'scaleX(1)', transformOrigin: 'right center', opacity: 1, offset: 0.5 },
          { transform: 'scaleX(0)', transformOrigin: 'left center', opacity: 0, offset: 1 },
        ],
        {
          duration: 320,
          delay: idx * 25,
          easing: LANDO_EASE,
          fill: 'forwards',
        }
      );
    });

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
          { transform: 'translate3d(0, -115%, 0)' },
        ],
        {
          duration: 240,
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
        { clipPath: 'ellipse(120% 115% at 50% 20%)' },
        { clipPath: 'ellipse(120% 0% at 50% 0%)' },
      ],
      {
        duration: 520,
        delay: 45,
        easing: LANDO_EASE,
        fill: 'forwards',
      }
    );

    Promise.race([
      shellCloseAnim.finished,
      new Promise((r) => window.setTimeout(r, 680)),
    ])
      .then(() => {
        if (animTokenRef.current !== token) return;
        cancelActiveAnims();
        shell.style.clipPath = 'none';
        setOverlayMounted(false);
      })
      .catch(() => {});
  }, [menuOpen, overlayMounted, reducedMotion]);

  // Escape key & focus trap while persistent-header menu overlay is open
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        onMenuToggle(false);
        hamBtnRef.current?.focus({ preventScroll: true });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, onMenuToggle]);

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
        setOverlayMounted(false);
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

      {/* Single Persistent Top Navigation Bar (stays ABOVE `.split-menu-overlay` just like `landonorris.com`!) */}
      <header
        className={`top-nav ${
          menuOpen || isDarkSurface || isDetailSubpage
            ? 'top-nav--on-dark'
            : 'top-nav--on-light'
        } ${isScrolled && !menuOpen ? 'top-nav--scrolled' : ''} ${
          menuOpen ? 'top-nav--menu-open' : ''
        }`}
        aria-label="Thanh điều hướng chính"
      >
        {isDetailSubpage && !menuOpen ? (
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
            onClick={(e) =>
              menuOpen ? handleSelectRoute('/', e) : navigateWithCurtain('/', e)
            }
            aria-label="Về trang chủ Thuật toán Đom đóm"
          >
            <FaMonogramLogo />
          </Link>
        )}

        <div className="top-nav__actions">
          <KineticRouteLink
            to="/demo"
            label="LIVE DEMO"
            variant={
              menuOpen || isDarkSurface || isDetailSubpage ? 'lime' : 'dark'
            }
            className="top-nav__cta"
            onNavigate={(dest, e) =>
              menuOpen
                ? handleSelectRoute(dest, e)
                : navigateWithCurtain(dest, e)
            }
          />

          <button
            ref={hamBtnRef}
            type="button"
            className="hamburger-btn"
            data-menu-open={menuOpen ? 'true' : 'false'}
            aria-label={menuOpen ? 'Đóng menu điều hướng (Esc)' : 'Mở menu điều hướng'}
            aria-expanded={menuOpen}
            aria-controls={overlayId}
            onClick={() => onMenuToggle(!menuOpen)}
          >
            <svg
              viewBox="0 0 24 24"
              className="hamburger-btn__svg"
              fill="none"
              aria-hidden="true"
            >
              {/* Lando staggered `=` bars: shorter right-aligned top bar + full-width bottom bar */}
              <path
                ref={barTopRef}
                className="hamburger-btn__stroke hamburger-btn__stroke--top"
                d="M11 9.25 H18.5"
                pathLength={1}
              />
              <path
                ref={barBotRef}
                className="hamburger-btn__stroke hamburger-btn__stroke--bot"
                d="M5.5 14.75 H18.5"
                pathLength={1}
              />

              {/* Lando Rive-inspired looping calligraphic ribbon connecting `=` <-> `×` */}
              <path
                ref={ribbonRef}
                className="hamburger-btn__ribbon"
                d="M5.5 14.75 C 9.2 14.75, 10.4 7.6, 13.8 8.2 C 16.4 8.7, 15.6 13.8, 12.4 13.2 C 9.6 12.6, 11.4 7.5, 16.75 7.25"
                pathLength={1}
              />

              {/* Crisp `×` diagonal strokes */}
              <path
                ref={crossARef}
                className="hamburger-btn__cross"
                d="M16.75 7.25 L7.25 16.75"
                pathLength={1}
              />
              <path
                ref={crossBRef}
                className="hamburger-btn__cross"
                d="M7.25 7.25 L16.75 16.75"
                pathLength={1}
              />
            </svg>
          </button>
        </div>
      </header>

      {overlayMounted ? (
        <div
          id={overlayId}
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={menuTitleId}
          className="split-menu-dialog"
          data-surface="olive"
          onClick={(ev) => {
            if (
              ev.target === overlayRef.current ||
              ev.target === backdropScrimRef.current
            ) {
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

            {/* Spacer matching fixed `.top-nav` height so grid layout stays optically balanced */}
            <div className="split-menu__topbar-spacer" aria-hidden="true" />

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
                          <span className="split-menu__zeit-arrow" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none">
                              <path
                                d="M3.5 12H19.5M13.5 6L19.5 12L13.5 18"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                          <span className="split-menu__link-content">
                            <span className="split-menu__link-num">{route.numLabel}</span>
                            <span>{route.title}</span>
                          </span>
                        </span>
                      </span>
                      <svg
                        viewBox="0 0 412 26"
                        preserveAspectRatio="none"
                        className="split-menu__wave"
                        aria-hidden="true"
                      >
                        <path
                          d="M0 2h73.539c5.858 0 11.47 2.35 15.58 6.525l8.565 8.7a21.863 21.863 0 0 0 15.58 6.525h72.678c6.045 0 11.82-2.503 15.954-6.914l6.485-6.922A21.865 21.865 0 0 1 224.336 3h76.752a21.864 21.864 0 0 1 16.806 7.88l4.362 5.24A21.864 21.864 0 0 0 339.063 24H412"
                          fill="none"
                          stroke="#d2ff00"
                          strokeWidth="4.8"
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
                <span className="split-menu__wipe-wrap">
                  <span className="split-menu__wipe-bar" aria-hidden="true" />
                  <button
                    type="button"
                    className={`menu-util-btn ${
                      reducedMotion ? 'menu-util-btn--active' : ''
                    }`}
                    onClick={onToggleReducedMotion}
                  >
                    Chuyển động: {reducedMotion ? 'GIẢM' : 'BẬT'}
                  </button>
                </span>
              </div>

              <div className="split-menu__shortcuts" aria-label="Phím tắt">
                <span className="split-menu__wipe-wrap">
                  <span className="split-menu__wipe-bar" aria-hidden="true" />
                  <span>
                    <kbd>1</kbd>–<kbd>4</kbd> Trang
                  </span>
                </span>
                <span className="split-menu__wipe-wrap">
                  <span className="split-menu__wipe-bar" aria-hidden="true" />
                  <span>
                    <kbd>M</kbd> Menu
                  </span>
                </span>
                <span className="split-menu__wipe-wrap">
                  <span className="split-menu__wipe-bar" aria-hidden="true" />
                  <span>
                    <kbd>Space</kbd> Chạy/Dừng
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
