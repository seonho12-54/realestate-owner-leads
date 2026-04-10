import { useEffect, useState, type FormEvent } from "react";

import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { formatDateTime } from "@/lib/format";
import {
  createInquiry,
  getInquiryDetail,
  listInquiries,
  replyInquiry,
  type InquiryDetail,
  type InquirySummary,
} from "@/lib/inquiries";

function getStatusLabel(answered: boolean) {
  return answered ? "답변 완료" : "답변 대기";
}

function getListCountText(count: number) {
  if (count === 0) {
    return "등록된 문의가 아직 없어요.";
  }

  return `현재 ${count}개의 문의글이 등록되어 있어요.`;
}

export function SellPage() {
  const { session } = useSession();
  const [inquiries, setInquiries] = useState<InquirySummary[]>([]);
  const [selectedInquiryId, setSelectedInquiryId] = useState<number | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryDetail | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [secret, setSecret] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isListLoading, setIsListLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  const isUser = session.kind === "user";
  const isAdmin = session.kind === "admin";
  const answeredCount = inquiries.filter((inquiry) => inquiry.answered).length;
  const openCount = inquiries.length - answeredCount;

  async function loadInquiries(preferredInquiryId?: number | null) {
    setIsListLoading(true);

    try {
      const response = await listInquiries();
      setInquiries(response);
      setListError(null);

      const targetId =
        preferredInquiryId && response.some((inquiry) => inquiry.id === preferredInquiryId)
          ? preferredInquiryId
          : selectedInquiryId && response.some((inquiry) => inquiry.id === selectedInquiryId)
            ? selectedInquiryId
            : response[0]?.id ?? null;

      setSelectedInquiryId(targetId);
    } catch (error) {
      setInquiries([]);
      setSelectedInquiryId(null);
      setSelectedInquiry(null);
      setListError(error instanceof Error ? error.message : "문의 목록을 불러오지 못했어요.");
    } finally {
      setIsListLoading(false);
    }
  }

  useEffect(() => {
    void loadInquiries();
  }, [session.authenticated, session.kind]);

  useEffect(() => {
    if (selectedInquiryId === null) {
      setSelectedInquiry(null);
      setDetailError(null);
      setReplyDraft("");
      return;
    }

    let isMounted = true;
    setIsDetailLoading(true);

    getInquiryDetail(selectedInquiryId)
      .then((detail) => {
        if (!isMounted) {
          return;
        }

        setSelectedInquiry(detail);
        setReplyDraft(detail.adminReply ?? "");
        setDetailError(null);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setSelectedInquiry(null);
        setReplyDraft("");
        setDetailError(error instanceof Error ? error.message : "문의 상세를 불러오지 못했어요.");
      })
      .finally(() => {
        if (isMounted) {
          setIsDetailLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedInquiryId, session.authenticated, session.kind]);

  async function handleSubmitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitError(null);
    setSuccessMessage(null);

    if (!isUser) {
      setSubmitError("일반 회원으로 로그인한 뒤 문의를 남겨 주세요.");
      return;
    }

    if (title.trim().length < 2) {
      setSubmitError("제목은 2자 이상 입력해 주세요.");
      return;
    }

    if (content.trim().length < 5) {
      setSubmitError("본문은 5자 이상 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await createInquiry({
        title,
        content,
        secret,
      });

      setTitle("");
      setContent("");
      setSecret(false);
      setShowCompose(false);
      setSuccessMessage("문의가 등록됐어요. 관리자 답변이 달리면 여기에서 바로 확인할 수 있어요.");
      await loadInquiries(response.id);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "문의 등록에 실패했어요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReplySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin || !selectedInquiry) {
      return;
    }

    setReplyError(null);
    setSuccessMessage(null);

    if (replyDraft.trim().length < 2) {
      setReplyError("답변은 2자 이상 입력해 주세요.");
      return;
    }

    setIsReplying(true);

    try {
      await replyInquiry(selectedInquiry.id, replyDraft);
      setSuccessMessage("관리자 답변을 저장했어요.");
      await loadInquiries(selectedInquiry.id);
      const refreshed = await getInquiryDetail(selectedInquiry.id);
      setSelectedInquiry(refreshed);
      setReplyDraft(refreshed.adminReply ?? "");
      setDetailError(null);
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : "답변 저장에 실패했어요.");
    } finally {
      setIsReplying(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <span className="eyebrow">문의하기</span>
          <h1 className="page-title page-title-medium">
            제목과 본문만 남기면 게시글처럼 관리자가 답변해 드려요
          </h1>
          <p className="page-copy">
            회원은 글쓰기 버튼으로 문의글을 남기고, 관리자는 같은 화면에서 답변만 작성합니다.
            비밀글을 체크하면 작성자와 관리자만 내용을 볼 수 있어요.
          </p>
        </div>

        <div className="hero-region-card">
          <span>문의 안내</span>
          <strong>{isAdmin ? "관리자 답변 모드" : "게시판형 Q&A 접수"}</strong>
          <p>
            {isAdmin
              ? "선택한 문의글에서 바로 답변을 남기면 회원 화면에도 즉시 반영됩니다."
              : "문의글은 목록으로 남고, 답변이 달리면 같은 글 안에서 확인할 수 있어요."}
          </p>
        </div>
      </section>

      <section className="page-panel inquiry-toolbar">
        <div className="stat-row">
          <span className="stat-pill">전체 {inquiries.length}</span>
          <span className="stat-pill">답변 대기 {openCount}</span>
          <span className="stat-pill">답변 완료 {answeredCount}</span>
        </div>

        <div className="button-row">
          {isUser ? (
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                setShowCompose((value) => !value);
                setSubmitError(null);
                setSuccessMessage(null);
              }}
            >
              {showCompose ? "글쓰기 닫기" : "문의하기"}
            </button>
          ) : !session.authenticated ? (
            <Link href="/login?next=/sell" className="button button-primary">
              로그인 후 문의하기
            </Link>
          ) : null}

          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setSuccessMessage(null);
              void loadInquiries(selectedInquiryId);
            }}
          >
            목록 새로고침
          </button>
        </div>
      </section>

      {successMessage ? <section className="success-banner">{successMessage}</section> : null}

      {showCompose ? (
        <section className="page-panel inquiry-compose-panel">
          <div className="section-heading section-heading-compact">
            <div>
              <span className="eyebrow">글쓰기</span>
              <h2 className="section-title">제목과 본문만 작성하면 바로 문의글이 등록돼요</h2>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleSubmitInquiry}>
            <label className="field">
              <span>제목</span>
              <input
                className="input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="예: 매물 상세 위치와 가격이 궁금합니다"
                maxLength={160}
              />
            </label>

            <label className="field">
              <span>본문</span>
              <textarea
                className="textarea"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="문의하고 싶은 내용을 편하게 적어 주세요."
                maxLength={5000}
              />
            </label>

            <label className="check-item">
              <input type="checkbox" checked={secret} onChange={(event) => setSecret(event.target.checked)} />
              <div>
                <strong>비밀글로 등록</strong>
                <p className="page-copy compact-copy">비밀글은 작성자 본인과 관리자만 내용을 볼 수 있어요.</p>
              </div>
            </label>

            {submitError ? <div className="error-banner">{submitError}</div> : null}

            <div className="button-row">
              <button type="submit" className="button button-primary" disabled={isSubmitting}>
                {isSubmitting ? "등록 중..." : "게시글 등록"}
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setShowCompose(false);
                  setSubmitError(null);
                }}
                disabled={isSubmitting}
              >
                닫기
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="inquiry-layout">
        <article className="inquiry-list-panel">
          <div className="section-heading section-heading-compact">
            <div>
              <span className="eyebrow">문의 목록</span>
              <h2 className="section-title">게시글 형식으로 문의를 확인해 보세요</h2>
            </div>
            <span className="inline-note">{getListCountText(inquiries.length)}</span>
          </div>

          {listError ? <div className="error-banner">{listError}</div> : null}

          {isListLoading ? (
            <div className="empty-panel">
              <strong>문의 목록을 불러오는 중이에요.</strong>
            </div>
          ) : inquiries.length === 0 ? (
            <div className="empty-panel">
              <strong>아직 등록된 문의가 없어요.</strong>
              <p>첫 번째 문의글을 남기면 관리자 답변도 여기에서 이어서 볼 수 있어요.</p>
            </div>
          ) : (
            <div className="inquiry-list">
              {inquiries.map((inquiry) => (
                <button
                  key={inquiry.id}
                  type="button"
                  className={`inquiry-card${selectedInquiryId === inquiry.id ? " active" : ""}`}
                  onClick={() => {
                    setSelectedInquiryId(inquiry.id);
                    setSuccessMessage(null);
                    setDetailError(null);
                    setReplyError(null);
                  }}
                >
                  <div className="inquiry-card-top">
                    <strong>{inquiry.title}</strong>
                    <span className={`status-badge ${inquiry.answered ? "status-answered" : "status-open"}`}>
                      {getStatusLabel(inquiry.answered)}
                    </span>
                  </div>

                  <div className="inquiry-card-meta">
                    <span>{inquiry.authorName}</span>
                    {inquiry.secret ? <span className="inline-note">비밀글</span> : null}
                    {inquiry.mine ? <span className="inline-note success">내 글</span> : null}
                    <span>{formatDateTime(inquiry.createdAt)}</span>
                  </div>

                  <p className="inquiry-preview">{inquiry.previewText}</p>
                </button>
              ))}
            </div>
          )}
        </article>

        <div className="inquiry-detail-stack">
          <article className="inquiry-detail-panel">
            {isDetailLoading ? (
              <div className="empty-panel">
                <strong>문의 내용을 불러오는 중이에요.</strong>
              </div>
            ) : detailError ? (
              <div className="error-banner">{detailError}</div>
            ) : !selectedInquiry ? (
              <div className="empty-panel">
                <strong>왼쪽 목록에서 문의글을 선택해 주세요.</strong>
                <p>제목을 누르면 본문과 관리자 답변을 자세히 볼 수 있어요.</p>
              </div>
            ) : (
              <>
                <div className="selected-header">
                  <div>
                    <span className="eyebrow">문의 상세</span>
                    <h2 className="section-title">{selectedInquiry.title}</h2>
                  </div>
                  <span className={`status-badge ${selectedInquiry.answered ? "status-answered" : "status-open"}`}>
                    {getStatusLabel(selectedInquiry.answered)}
                  </span>
                </div>

                <div className="inquiry-detail-body">
                  <div className="inquiry-card-meta">
                    <span>작성자 {selectedInquiry.authorName}</span>
                    {selectedInquiry.secret ? <span className="inline-note">비밀글</span> : null}
                    <span>{formatDateTime(selectedInquiry.createdAt)}</span>
                  </div>

                  <div className="inquiry-content-box">
                    <strong>본문</strong>
                    <p>{selectedInquiry.content}</p>
                  </div>

                  {selectedInquiry.adminReply ? (
                    <div className="reply-box">
                      <div className="reply-box-header">
                        <strong>관리자 답변</strong>
                        <span>
                          {selectedInquiry.adminReplyAdminName
                            ? `${selectedInquiry.adminReplyAdminName} · `
                            : ""}
                          {formatDateTime(selectedInquiry.adminReplyAt)}
                        </span>
                      </div>
                      <p>{selectedInquiry.adminReply}</p>
                    </div>
                  ) : (
                    <div className="empty-panel">
                      <strong>아직 등록된 답변이 없어요.</strong>
                      <p>관리자가 확인 후 이 게시글 안에 답변을 남길 예정이에요.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </article>

          {isAdmin && selectedInquiry ? (
            <article className="page-panel admin-reply-editor">
              <div className="section-heading section-heading-compact">
                <div>
                  <span className="eyebrow">관리자 답변</span>
                  <h2 className="section-title">선택한 문의글에 답변 작성</h2>
                </div>
              </div>

              <form className="form-grid" onSubmit={handleReplySubmit}>
                <label className="field">
                  <span>답변 내용</span>
                  <textarea
                    className="textarea"
                    value={replyDraft}
                    onChange={(event) => setReplyDraft(event.target.value)}
                    placeholder="회원에게 전달할 답변을 입력해 주세요."
                    maxLength={5000}
                  />
                </label>

                {replyError ? <div className="error-banner">{replyError}</div> : null}

                <div className="button-row">
                  <button type="submit" className="button button-primary" disabled={isReplying}>
                    {isReplying ? "저장 중..." : selectedInquiry.adminReply ? "답변 수정" : "답변 등록"}
                  </button>
                </div>
              </form>
            </article>
          ) : null}

          {!session.authenticated ? (
            <article className="page-panel">
              <span className="eyebrow">로그인 안내</span>
              <h2 className="section-title">글쓰기는 로그인 후 이용할 수 있어요</h2>
              <p className="page-copy">
                문의 목록은 미리 볼 수 있지만, 새 글을 작성하려면 회원 로그인 후 진행해 주세요.
              </p>
              <div className="button-row">
                <Link href="/login?next=/sell" className="button button-primary">
                  로그인
                </Link>
                <Link href="/signup?next=/sell" className="button button-secondary">
                  회원가입
                </Link>
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
