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
  const navStripRef = useRef<HTMLElement>(null);

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
      ? `${selectedMember.memberName} · ${selectedMember.shortRole} — Phân công Nhóm`
      : 'Phân công nhiệm vụ 6 giai đoạn — Thuật toán Đom đóm';
    return () => {
      document.title = 'Thuật toán Đom đóm';
    };
  }, [selectedMember]);

  // Keep active member link visible inside single-row horizontal scroller without scrolling page
  useEffect(() => {
    const strip = navStripRef.current;
    if (!strip) return;
    const activeLink = strip.querySelector<HTMLElement>('[aria-current="page"]');
    activeLink?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      container: 'nearest',
    } as ScrollIntoViewOptions);
  }, [selectedMember?.slug]);

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
          { y: 14, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.46,
            stagger: 0.045,
            ease: 'power3.out',
          }
        );
      }
    },
    { scope: pageRef, dependencies: [selectedMember?.slug ?? 'all', reducedMotion] }
  );

  const selectedStage = selectedMember
    ? ASSIGNMENT_STAGES.find((s) => s.id === selectedMember.stageId)
    : null;

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
              {selectedMember ? (
                <span className="algo-chapter-eyebrow">
                  {`${String(selectedMember.memberNumber).padStart(2, '0')} / 11 · ${selectedStage?.code ?? ''}`}
                </span>
              ) : null}
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
                      : 'Phân công nhiệm vụ'}
                  </BlockReveal>
                  <BlockReveal
                    color="olive-lime"
                    delay={0.16}
                    reducedMotion={reducedMotion}
                  >
                    <span className="editorial-serif editorial-serif--sage-gold">
                      {selectedMember
                        ? selectedMember.roleTitle
                        : 'theo 6 giai đoạn thực hiện'}
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

          {/* Single-Row Scrollable Editorial Index Bar (No Multi-Row Pill Soup!) */}
          <nav
            ref={navStripRef}
            className="assign-index-bar"
            aria-label="Chọn xem tổng quan hoặc từng thành viên"
          >
            <Link
              to="/phan-cong"
              replace
              aria-current={!selectedMember ? 'page' : undefined}
              className="assign-index-link"
            >
              <span>Tổng quan (11)</span>
            </Link>
            {TEAM_ASSIGNMENTS.map((m) => {
              const isAct = selectedMember?.slug === m.slug;
              return (
                <Link
                  key={m.slug}
                  to={`/phan-cong/${m.slug}`}
                  replace
                  aria-current={isAct ? 'page' : undefined}
                  className="assign-index-link"
                >
                  <span className="assign-index-link__num">
                    {String(m.memberNumber).padStart(2, '0')}
                  </span>
                  <span>{m.memberName}</span>
                </Link>
              );
            })}
          </nav>

          {selectedMember ? (
            <article className="assign-monograph js-assign-enter">
              <div className="assign-monograph__meta">
                <div>
                  <span className="assign-monograph__meta-key">FILE CODE</span>
                  <code>{selectedMember.codeTargetFile ?? selectedMember.files}</code>
                </div>
                <div>
                  <span className="assign-monograph__meta-key">PHẦN SÁCH ĐỐI CHIẾU</span>
                  <span>{selectedMember.bookRefsDetail ?? selectedMember.bookRefsShort}</span>
                </div>
              </div>

              <div className="assign-monograph__cols">
                <div className="assign-monograph__col">
                  <h2 className="assign-monograph__heading">
                    {selectedMember.slug === 'gia-man'
                      ? 'Nội dung trực quan hóa & mở rộng thực tế'
                      : 'Nội dung lý thuyết phụ trách'}
                  </h2>
                  <ul className="assign-monograph__list">
                    {selectedMember.theoryTasks.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="assign-monograph__col">
                  <h2 className="assign-monograph__heading">
                    Phần lập trình ({selectedMember.codeTargetFile ?? selectedMember.files})
                  </h2>
                  <ul className="assign-monograph__list">
                    {selectedMember.codeTasks.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {selectedMember.formulas && selectedMember.formulas.length > 0 ? (
                <div className="assign-monograph__formulas">
                  {selectedMember.formulas.map((fm, idx) => (
                    <div key={idx} className="assign-monograph__formula-row">
                      <span className="assign-monograph__formula-label">{fm.label}</span>
                      <MathFormula tex={fm.tex} ariaLabel={fm.ariaLabel} />
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ) : (
            <div className="assign-overview-ledger" aria-label="Tổng hợp 6 giai đoạn thực hiện">
              {ASSIGNMENT_STAGES.map((stage) => {
                const stageMembers = TEAM_ASSIGNMENTS.filter(
                  (m) => m.stageId === stage.id
                );
                return (
                  <section key={stage.id} className="assign-stage-row js-assign-enter">
                    <div className="assign-stage-row__head">
                      <span className="assign-stage-row__code">{stage.code}</span>
                      <h2 className="assign-stage-row__title">
                        {stage.title.replace(/^Giai đoạn \d+\s*·\s*/, '')}
                      </h2>
                      <code className="assign-stage-row__mod">{stage.modulesLabel}</code>
                    </div>

                    <div className="assign-stage-row__members">
                      {stageMembers.map((m) => (
                        <Link
                          key={m.slug}
                          to={`/phan-cong/${m.slug}`}
                          replace
                          className="assign-ledger-entry"
                        >
                          <div className="assign-ledger-entry__lead">
                            <span className="zeit-hover-arrow" aria-hidden="true">
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                className="zeit-hover-arrow__svg"
                              >
                                <path
                                  d="M3.5 12H19.5M13.5 6L19.5 12L13.5 18"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                            <div className="assign-ledger-entry__who">
                              <span className="assign-ledger-entry__num">
                                {String(m.memberNumber).padStart(2, '0')}
                              </span>
                              <strong className="assign-ledger-entry__name">
                                {m.memberName}
                              </strong>
                            </div>
                          </div>

                          <div className="assign-ledger-entry__body">
                            <p className="assign-ledger-entry__summary">{m.summaryTasks}</p>
                            <span className="assign-ledger-entry__meta">
                              <code>{m.files}</code> · {m.bookRefsShort}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <FooterSection reducedMotion={reducedMotion} />
    </>
  );
}
