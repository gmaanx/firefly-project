import { useRef } from 'react';
import { useSectionReveal } from '../../lib/useEditorialMotion';
import { BlockReveal } from '../shared/BlockReveal';
import { MathFormula } from '../shared/MathFormula';

export interface ManifestoSectionProps {
  reducedMotion: boolean;
}

export function ManifestoSection({ reducedMotion }: ManifestoSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useSectionReveal(sectionRef, reducedMotion);

  return (
    <section
      id="boi-canh"
      ref={sectionRef}
      className="section-manifesto"
      data-surface="olive"
      aria-labelledby="manifesto-heading"
    >
      <div className="manifesto-solid-backdrop">
        <div className="section-container manifesto-statement-stage">
        <div className="manifesto-center">
          <h2 id="manifesto-heading" tabIndex={-1} className="manifesto-headline">
            <span className="manifesto-headline__lines">
              <BlockReveal
                color="olive-lime"
                delay={0}
                reducedMotion={reducedMotion}
              >
                Thuật toán Đom đóm
              </BlockReveal>
              <BlockReveal
                color="olive-lime"
                delay={0.18}
                reducedMotion={reducedMotion}
              >
                cho bài toán{' '}
                <span className="editorial-serif editorial-serif--sage-gold">
                  tối ưu nhiều cực trị
                </span>
              </BlockReveal>
            </span>
          </h2>

          <p className="manifesto-lead reveal-fade">
            Xin-She Yang đề xuất năm 2008 dựa trên cách đom đóm phát sáng để thu
            hút nhau — giúp tìm cực trị trên các mặt hàm phức tạp mà không cần
            tính đạo hàm.
          </p>
        </div>

        <div className="manifesto-rules-strip">
          <div className="manifesto-rule-item reveal-fade">
            <div className="manifesto-rule-item__num" aria-hidden="true">
              01
            </div>
            <h3 className="manifesto-rule-item__heading">
              Không cần tính đạo hàm
            </h3>
            <p className="manifesto-rule-item__text">
              Các thuật toán dùng đạo hàm dễ bị kẹt ở hố cục bộ và không áp dụng
              được khi hàm mục tiêu bị gấp khúc hoặc gián đoạn.
            </p>
          </div>

          <div className="manifesto-rule-item reveal-fade">
            <div className="manifesto-rule-item__num" aria-hidden="true">
              02
            </div>
            <h3 className="manifesto-rule-item__heading">
              Tránh dồn cả đàn vào một chỗ
            </h3>
            <p className="manifesto-rule-item__text">
              Khác với nhiều thuật toán bầy đàn thường kéo mọi cá thể về một điểm
              tốt nhất duy nhất, đom đóm chỉ bị hút mạnh bởi những con ở gần.
            </p>
          </div>

          <div className="manifesto-rule-item reveal-fade">
            <div className="manifesto-rule-item__num" aria-hidden="true">
              03
            </div>
            <h3 className="manifesto-rule-item__heading">
              Tự chia nhóm tìm nhiều đỉnh cùng lúc
            </h3>
            <p className="manifesto-rule-item__text">
              Vì ánh sáng yếu dần theo khoảng cách{' '}
              <MathFormula
                tex="e^{-\gamma r^2}"
                ariaLabel="exp(-gamma r^2)"
              />
              , đàn đom đóm tự tách thành nhiều nhóm nhỏ để hội tụ vào nhiều cực
              trị khác nhau.
            </p>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
