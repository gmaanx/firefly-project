import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { APP_ROUTES } from '../../lib/navigation';
import { useSectionReveal } from '../../lib/useEditorialMotion';
import { ContourBackdrop } from '../shared/ContourBackdrop';
import { KineticAnchor } from '../shared/KineticButton';
import { MathFormula } from '../shared/MathFormula';
import { useRouteCurtain } from '../shared/RouteCurtain';

export interface FooterSectionProps {
  reducedMotion: boolean;
}

export function FooterSection({ reducedMotion }: FooterSectionProps) {
  const footerRef = useRef<HTMLElement>(null);
  const { navigateWithCurtain } = useRouteCurtain();
  useSectionReveal(footerRef, reducedMotion);

  return (
    <footer
      id="tong-ket"
      ref={footerRef}
      className="section-footer-frame"
      data-surface="olive"
      aria-labelledby="footer-heading"
    >
      <svg
        viewBox="0 0 420 28"
        preserveAspectRatio="none"
        className="sculpted-footer-top-arch"
        aria-hidden="true"
      >
        <path
          d="M0,28 C52,28 66,0 118,0 H302 C354,0 368,28 420,28 Z"
          fill="#24281E"
        />
      </svg>

      <div className="sculpted-footer-shell">
        <ContourBackdrop variant="olive" />

        <div className="footer-center-hero">
          <svg
            viewBox="0 0 180 48"
            className="footer-sig-svg"
            aria-hidden="true"
            fill="none"
          >
            <path
              d="M16 36 C52 14, 98 40, 150 14 L118 34 L164 18"
              stroke="#B6C96E"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="164" cy="18" r="3.2" fill="#C5E84D" />
          </svg>

          <h2 id="footer-heading" tabIndex={-1} className="footer-headline">
            <span className="reveal-mask">
              <span className="reveal-line">
                Dễ cài đặt, không cần đạo hàm,
              </span>
            </span>
            <span className="reveal-mask">
              <span className="reveal-line">
                <span className="editorial-serif editorial-serif--sage-gold">
                  tìm được nhiều cực trị cùng lúc.
                </span>
              </span>
            </span>
          </h2>
        </div>

        <div className="footer-columns">
          <div>
            <div className="footer-col__label">CÁC PHẦN TRÌNH BÀY</div>
            <ul className="footer-nav-list">
              {APP_ROUTES.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className="footer-jump-link"
                    onClick={(e) => navigateWithCurtain(item.path, e)}
                  >
                    {item.numLabel} · {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="footer-col__label">TÓM TẮT NHANH</div>
            <ul className="footer-summary-list">
              <li>
                <strong>Điểm mạnh:</strong> Tự chia nhóm để tìm nhiều cực trị
                toàn cục cùng lúc.
              </li>
              <li>
                <strong>Hạn chế:</strong> Phải so sánh từng cặp đom đóm nên tốn{' '}
                <MathFormula tex="\mathcal{O}(n^2)" ariaLabel="O(n^2)" /> mỗi vòng.
              </li>
              <li>
                <strong>Cải thiện:</strong> Giảm dần bước nhảy (
                <MathFormula tex="\theta = 0.97" ariaLabel="theta = 0.97" />) kết
                hợp tinh chỉnh cục bộ.
              </li>
            </ul>
          </div>

          <div>
            <div className="footer-col__label">ỨNG DỤNG THỰC TẾ</div>
            <div className="footer-tags">
              <span className="footer-tag">Nén ảnh bảng màu RGB</span>
              <span className="footer-tag">Điều độ hệ thống điện</span>
              <span className="footer-tag">Tối ưu lộ trình</span>
              <span className="footer-tag">Chọn siêu tham số học máy</span>
            </div>
          </div>
        </div>

        <div className="footer-center-cta">
          <KineticAnchor
            label="GITHUB REPOSITORY"
            icon="↳"
            variant="lime"
            href="https://github.com/gmaanx/firefly-project"
            target="_blank"
            rel="noopener noreferrer"
          />
        </div>
      </div>

      <div className="footer-bottom-rail">
        <span>Thành viên Nhóm 3 (TV1 → TV11)</span>
        <span>XIN-SHE YANG (2008) · FIREFLY ALGORITHM</span>
      </div>
    </footer>
  );
}
