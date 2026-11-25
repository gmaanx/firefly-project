import type { AppRoutePath } from '../../lib/navigation';
import { BlockReveal } from './BlockReveal';
import { KineticRouteLink } from './KineticButton';
import { useRouteCurtain } from './RouteCurtain';

export interface NextPageBannerProps {
  eyebrow?: string;
  titlePlain: string;
  titleSerif: string;
  to: AppRoutePath;
  ctaLabel: string;
  accent?: 'lime' | 'violet';
  reducedMotion: boolean;
}

export function NextPageBanner({
  titlePlain,
  titleSerif,
  to,
  ctaLabel,
  reducedMotion,
}: NextPageBannerProps) {
  const { navigateWithCurtain } = useRouteCurtain();

  return (
    <aside
      className="next-page-banner"
      data-surface="dark"
      aria-label="Chuyển sang trang tiếp theo"
    >
      <div className="section-container next-page-banner__inner">
        <div>
          <h2 className="next-page-banner__title">
            <span className="block-reveal-lines">
              <BlockReveal color="olive-lime" delay={0} reducedMotion={reducedMotion}>
                {titlePlain}
              </BlockReveal>
              <BlockReveal color="olive-lime" delay={0.18} reducedMotion={reducedMotion}>
                <span className="editorial-serif editorial-serif--sage-gold">
                  {titleSerif}
                </span>
              </BlockReveal>
            </span>
          </h2>
        </div>

        <KineticRouteLink
          to={to}
          label={ctaLabel}
          icon="→"
          variant="lime"
          onNavigate={(dest, e) => navigateWithCurtain(dest, e)}
        />
      </div>
    </aside>
  );
}
