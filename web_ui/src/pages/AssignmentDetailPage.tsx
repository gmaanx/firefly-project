import { useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { FooterSection } from '../components/sections/FooterSection';
import { BlockReveal } from '../components/shared/BlockReveal';
import { ContourBackdrop } from '../components/shared/ContourBackdrop';
import { MathFormula } from '../components/shared/MathFormula';
import { useRouteCurtain } from '../components/shared/RouteCurtain';
import {
  ASSIGNMENT_STAGES,
  TEAM_ASSIGNMENTS,
  type TeamMemberAssignment,
} from '../data/teamAssignmentData';
import { isInteractiveElement } from '../lib/navigation';

export interface AssignmentDetailPageProps {
  reducedMotion: boolean;
}

function findMemberByParam(raw?: string): TeamMemberAssignment | null {
  if (!raw) return null;
  const norm = raw.trim().toLowerCase();
  return (
    TEAM_ASSIGNMENTS.find(
      (m) => m.slug === norm || m.legacyCode === norm
    ) ?? null
  );
}

export function AssignmentDetailPage({ reducedMotion }: AssignmentDetailPageProps) {
  const { memberId } = useParams<{ memberId?: string }>();
  const navigate = useNavigate();
  const { returnFromSubpage } = useRouteCurtain();
  const pageRef = useRef<HTMLElement>(null);

  const selectedMember = findMemberByParam(memberId);
  const selectedIdx = selectedMember
    ? TEAM_ASSIGNMENTS.findIndex((m) => m.slug === selectedMember.slug)
    : -1;

  const stepMember = useCallback(
    (delta: -1 | 1) => {
      if (!selectedMember) return;
      const nextIdx =
        (selectedIdx + delta + TEAM_ASSIGNMENTS.length) % TEAM_ASSIGNMENTS.length;
      const next = TEAM_ASSIGNMENTS[nextIdx];
      navigate(`/phan-cong/${next.slug}`, { replace: true });
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      window.dispatchEvent(
        new CustomEvent('app:lenis-scroll', { detail: { top: 0, immediate: true } })
      );
    },
    [navigate, selectedIdx, selectedMember]
  );

  useEffect(() => {
    document.title = selectedMember
      ? `${selectedMember.memberName} · ${selectedMember.roleTitle} — Phân công Nhóm`
      : 'Chi tiết Phân công 6 Giai đoạn — Thuật toán Đom đóm';
    return () => {
      document.title = 'Thuật toán Đom đóm';
    };
  }, [selectedMember]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('dialog[open]')) return;
      if (isInteractiveElement(e.target)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        returnFromSubpage('/');
      } else if (selectedMember && e.key === 'ArrowLeft') {
        e.preventDefault();
        stepMember(-1);
      } else if (selectedMember && e.key === 'ArrowRight') {
        e.preventDefault();
        stepMember(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [returnFromSubpage, selectedMember, stepMember]);

  useGSAP(
    () => {
      const root = pageRef.current;
      if (!root || reducedMotion) return;
      const blocks = root.querySelectorAll<HTMLElement>('.js-assign-enter');
      if (blocks.length > 0) {
        gsap.fromTo(
          blocks,
          { y: 20, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.58,
            stagger: 0.06,
            ease: 'power3.out',
          }
        );
      }
    },
    { scope: pageRef, dependencies: [selectedMember?.slug ?? 'all', reducedMotion] }
  );

  const renderMemberDetailCard = (member: TeamMemberAssignment) => {
    const stageMeta = ASSIGNMENT_STAGES.find((s) => s.id === member.stageId);
    return (
      <article key={member.slug} className="qa-card assign-member-card js-assign-enter">
        <div className="assign-member-card__top">
          <div className="assign-member-card__badges">
            <span className="assign-tv-pill assign-tv-pill--active">
              {member.memberName}
            </span>
            {stageMeta ? (
              <span className="assign-stage-tag">
                {stageMeta.code} · {stageMeta.modulesLabel}
              </span>
            ) : null}
          </div>
          <code className="assign-file-chip">{member.files}</code>
        </div>

        <h3 className="assign-member-card__title">
          {member.memberName} — {member.roleTitle}
        </h3>

        {member.bookRefsDetail ? (
          <div className="assign-meta-strip">
            <span className="assign-meta-strip__label">PHẦN SÁCH BÁM SÁT</span>
            <span>{member.bookRefsDetail}</span>
          </div>
        ) : null}

        <div className="assign-detail-columns">
          <div className="assign-detail-block">
            <h4 className="assign-detail-block__heading">
              {member.slug === 'gia-man'
                ? 'Nội dung trực quan hóa & mở rộng thực tế'
                : 'Phần lý thuyết phụ trách'}
            </h4>
            <ul className="qa-list">
              {member.theoryTasks.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="assign-detail-block">
            <h4 className="assign-detail-block__heading">
              Phần lập trình ({member.codeTargetFile ?? member.files})
            </h4>
            <ul className="qa-list">
              {member.codeTasks.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {member.formulas && member.formulas.length > 0 ? (
          <div className="assign-formula-stack">
            {member.formulas.map((fm, idx) => (
              <div key={idx} className="worked-formula-box worked-formula-box--single">
                <span className="assign-formula-label">{fm.label}</span>
                <MathFormula tex={fm.tex} ariaLabel={fm.ariaLabel} />
              </div>
            ))}
          </div>
        ) : null}
      </article>
    );
  };

  return (
    <>
      <section
        ref={pageRef}
        className="detail-subpage surface-dark"
        data-surface="dark"
        aria-labelledby="assignment-detail-heading"
      >
        <ContourBackdrop variant="dark" />

        <div className="section-container detail-subpage__container">
          <header className="detail-subpage__header">
            <div className="detail-subpage__titles">
              <span className="algo-chapter-eyebrow">
                PHÂN CÔNG NHIỆM VỤ · NHÓM SEMINAR THUẬT TOÁN ĐOM ĐÓM
              </span>
              <h1
                id="assignment-detail-heading"
                tabIndex={-1}
                className="detail-subpage__title"
              >
                <span className="block-reveal-lines">
                  <BlockReveal
                    color="olive-lime"
                    delay={0}
                    reducedMotion={reducedMotion}
                  >
                    {selectedMember
                      ? selectedMember.memberName
                      : 'Bảng phân công chi tiết'}
                  </BlockReveal>
                  <BlockReveal
                    color="olive-lime"
                    delay={0.18}
                    reducedMotion={reducedMotion}
                  >
                    <span className="editorial-serif editorial-serif--sage-gold">
                      {selectedMember
                        ? selectedMember.roleTitle
                        : 'theo từng giai đoạn thực hiện'}
                    </span>
                  </BlockReveal>
                </span>
              </h1>
            </div>

            {selectedMember ? (
              <div
                className="detail-subpage__pager"
                role="group"
                aria-label="Chuyển giữa 11 thành viên"
              >
                <button
                  type="button"
                  className="detail-pager-btn"
                  onClick={() => stepMember(-1)}
                >
                  ←{' '}
                  {
                    TEAM_ASSIGNMENTS[
                      (selectedIdx - 1 + TEAM_ASSIGNMENTS.length) %
                        TEAM_ASSIGNMENTS.length
                    ].memberName
                  }
                </button>
                <span className="detail-pager-count">
                  {String(selectedMember.memberNumber).padStart(2, '0')} / 11
                </span>
                <button
                  type="button"
                  className="detail-pager-btn"
                  onClick={() => stepMember(1)}
                >
                  {
                    TEAM_ASSIGNMENTS[(selectedIdx + 1) % TEAM_ASSIGNMENTS.length]
                      .memberName
                  }{' '}
                  →
                </button>
              </div>
            ) : null}
          </header>

          <div className="detail-subpage__card">
            <div
              className="assign-subpage-Controls"
              role="navigation"
              aria-label="Chọn xem toàn bộ 6 giai đoạn hoặc từng thành viên"
            >
              <Link
                to="/phan-cong"
                replace
                className={`chip-btn ${!selectedMember ? 'chip-btn--active' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                Tất cả 6 Giai đoạn
              </Link>
              {TEAM_ASSIGNMENTS.map((m) => {
                const isAct = selectedMember?.slug === m.slug;
                return (
                  <Link
                    key={m.slug}
                    to={`/phan-cong/${m.slug}`}
                    replace
                    className={`chip-btn ${isAct ? 'chip-btn--active' : ''}`}
                    style={{ textDecoration: 'none' }}
                  >
                    {m.memberName}
                  </Link>
                );
              })}
            </div>

            {selectedMember ? (
              renderMemberDetailCard(selectedMember)
            ) : (
              <div className="assign-stages-accordion" aria-label="6 giai đoạn phân công nhiệm vụ">
                {ASSIGNMENT_STAGES.map((stage) => {
                  const stageMembers = TEAM_ASSIGNMENTS.filter(
                    (m) => m.stageId === stage.id
                  );
                  return (
                    <details
                      key={stage.id}
                      open
                      className="assign-stage-details js-assign-enter"
                    >
                      <summary className="assign-stage-summary">
                        <span className="assign-stage-summary__title">
                          {stage.title}
                        </span>
                        <code className="assign-stage-summary__mod">
                          {stage.modulesLabel}
                        </code>
                      </summary>
                      <div className="assign-stage-body">
                        {stageMembers.map((m) => renderMemberDetailCard(m))}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <FooterSection reducedMotion={reducedMotion} />
    </>
  );
}
