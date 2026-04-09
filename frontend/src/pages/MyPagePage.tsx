import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";

import { useSession } from "@/context/SessionContext";
import { apiFetch } from "@/lib/api";
import { formatArea, formatDateTime, formatTradeLabel, getPropertyTypeLabel } from "@/lib/format";
import { readLocationAccessCache, writeLocationAccessCache, type StoredLocationAccess } from "@/lib/location-access";
import { listMyLeads, type MyLeadSummary, type UpdateMyLeadPayload, updateMyLead } from "@/lib/leads";
import { listActiveOffices, type OfficeOption } from "@/lib/offices";
import { getValidationMessage, leadUpdateSchema, propertyTypeOptions, transactionTypeOptions } from "@/lib/validation";

type EditState = {
  officeId: string;
  listingTitle: string;
  ownerName: string;
  phone: string;
  email: string;
  propertyType: string;
  transactionType: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  areaM2: string;
  priceKrw: string;
  depositKrw: string;
  monthlyRentKrw: string;
  moveInDate: string;
  contactTime: string;
  description: string;
};

function toInputValue(value?: number | string | null) {
  return value == null ? "" : String(value);
}

function createEditState(lead: MyLeadSummary): EditState {
  return {
    officeId: String(lead.officeId),
    listingTitle: lead.listingTitle,
    ownerName: lead.ownerName,
    phone: lead.phone,
    email: lead.email ?? "",
    propertyType: lead.propertyType,
    transactionType: lead.transactionType,
    addressLine1: lead.addressLine1,
    addressLine2: lead.addressLine2 ?? "",
    postalCode: lead.postalCode ?? "",
    areaM2: toInputValue(lead.areaM2),
    priceKrw: toInputValue(lead.priceKrw),
    depositKrw: toInputValue(lead.depositKrw),
    monthlyRentKrw: toInputValue(lead.monthlyRentKrw),
    moveInDate: lead.moveInDate ?? "",
    contactTime: lead.contactTime ?? "",
    description: lead.description ?? "",
  };
}

function getVerificationMessage(locationAccess: StoredLocationAccess | null) {
  if (!locationAccess) {
    return "위치 인증은 마이페이지에서 한 번만 완료하면 됩니다. 인증이 저장되면 이후 접속에서도 그대로 유지됩니다.";
  }

  if (locationAccess.addressName) {
    return `${locationAccess.addressName} 기준으로 위치 인증이 저장되어 있습니다.`;
  }

  return "위치 인증이 저장되어 있습니다.";
}

export function MyPagePage() {
  const { session } = useSession();
  const [locationAccess, setLocationAccess] = useState<StoredLocationAccess | null>(readLocationAccessCache());
  const [locationMessage, setLocationMessage] = useState(getVerificationMessage(readLocationAccessCache()));
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [leads, setLeads] = useState<MyLeadSummary[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditState | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (session.kind !== "user") {
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    Promise.all([listMyLeads(), listActiveOffices()])
      .then(([leadResponse, officeResponse]) => {
        if (!isMounted) {
          return;
        }

        setLeads(leadResponse);
        setOffices(officeResponse);
        setPageError(null);

        if (leadResponse[0]) {
          setSelectedLeadId(leadResponse[0].id);
          setEditForm(createEditState(leadResponse[0]));
        } else {
          setSelectedLeadId(null);
          setEditForm(null);
        }
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setPageError(error instanceof Error ? error.message : "마이페이지 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session.kind]);

  useEffect(() => {
    const selectedLead = leads.find((lead) => lead.id === selectedLeadId);
    if (selectedLead) {
      setEditForm(createEditState(selectedLead));
    }
  }, [leads, selectedLeadId]);

  const selectedLead = useMemo(() => leads.find((lead) => lead.id === selectedLeadId) ?? null, [leads, selectedLeadId]);

  if (!session.isLoading && session.kind === "admin") {
    return <Navigate to="/admin/leads" replace />;
  }

  if (!session.isLoading && session.kind !== "user") {
    return <Navigate to="/login?next=/me" replace />;
  }

  async function handleLocationVerification() {
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setLocationMessage("현재 주소가 HTTP라서 브라우저 위치 권한이 제한되고 있습니다. HTTPS 주소에서 다시 시도해 주세요.");
      return;
    }

    if (!navigator.geolocation) {
      setLocationMessage("현재 브라우저에서 위치 서비스를 지원하지 않습니다.");
      return;
    }

    setIsCheckingLocation(true);
    setSaveMessage(null);
    setPageError(null);
    setLocationMessage("현재 위치를 확인하고 있습니다.");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await apiFetch("/api/location/verify", {
            method: "POST",
            json: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error ?? "위치 인증에 실패했습니다.");
          }

          if (!result.allowed) {
            if (locationAccess) {
              setLocationMessage("현재 위치는 허용 지역이 아니지만 기존에 저장된 인증 상태는 그대로 유지됩니다.");
              return;
            }

            setLocationMessage(`${result.addressName ?? "현재 위치"}에서는 회원 인증을 진행할 수 없습니다.`);
            return;
          }

          const nextLocation = {
            approvedAt: Date.now(),
            addressName: result.addressName ?? null,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          writeLocationAccessCache(nextLocation);
          setLocationAccess(nextLocation);
          setLocationMessage(`${result.addressName ?? "현재 위치"} 기준으로 위치 인증이 완료되었습니다. 이후 접속에서도 이 인증 상태를 그대로 사용합니다.`);
        } catch (error) {
          setLocationMessage(error instanceof Error ? error.message : "위치 인증에 실패했습니다.");
        } finally {
          setIsCheckingLocation(false);
        }
      },
      (error) => {
        setIsCheckingLocation(false);

        if (error.code === error.PERMISSION_DENIED) {
          setLocationMessage("브라우저에서 위치 권한을 허용한 뒤 다시 시도해 주세요.");
          return;
        }

        if (error.code === error.TIMEOUT) {
          setLocationMessage("위치 확인 시간이 초과되었습니다. 잠시 뒤 다시 시도해 주세요.");
          return;
        }

        setLocationMessage("현재 위치를 가져오지 못했습니다.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000 * 60 * 5,
      },
    );
  }

  async function handleUpdateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedLead || !editForm) {
      return;
    }

    if (!locationAccess) {
      setPageError("매물 수정 전에 위치 인증을 먼저 완료해 주세요.");
      return;
    }

    if (!window.confirm("수정 요청을 보내면 관리자가 다시 확인한 뒤 반영합니다. 계속하시겠습니까?")) {
      return;
    }

    const payload: UpdateMyLeadPayload = {
      officeId: Number(editForm.officeId),
      listingTitle: editForm.listingTitle,
      ownerName: editForm.ownerName,
      phone: editForm.phone,
      email: editForm.email || null,
      propertyType: editForm.propertyType,
      transactionType: editForm.transactionType,
      addressLine1: editForm.addressLine1,
      addressLine2: editForm.addressLine2,
      postalCode: editForm.postalCode,
      areaM2: editForm.areaM2 ? Number(editForm.areaM2) : null,
      priceKrw: editForm.priceKrw ? Number(editForm.priceKrw) : null,
      depositKrw: editForm.depositKrw ? Number(editForm.depositKrw) : null,
      monthlyRentKrw: editForm.monthlyRentKrw ? Number(editForm.monthlyRentKrw) : null,
      moveInDate: editForm.moveInDate,
      contactTime: editForm.contactTime,
      description: editForm.description,
      browserLatitude: locationAccess.latitude,
      browserLongitude: locationAccess.longitude,
    };

    const validation = leadUpdateSchema.safeParse(payload);
    if (!validation.success) {
      setPageError(getValidationMessage(validation.error));
      return;
    }

    try {
      setIsSaving(true);
      setPageError(null);
      await updateMyLead(selectedLead.id, payload);

      const refreshedLeads = await listMyLeads();
      setLeads(refreshedLeads);
      setSaveMessage("수정 요청이 접수되었습니다. 관리자가 재확인 후 반영합니다.");

      const refreshedSelected = refreshedLeads.find((lead) => lead.id === selectedLead.id);
      if (refreshedSelected) {
        setEditForm(createEditState(refreshedSelected));
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "매물 수정 요청에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  if (session.isLoading || isLoading) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">MY PAGE</span>
          <h1 className="page-title page-title-medium">마이페이지를 준비하고 있습니다.</h1>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="page-panel compact-page-header">
        <span className="eyebrow">MY PAGE</span>
        <h1 className="page-title page-title-medium">{session.user?.name}님의 마이페이지</h1>
      </section>

      <section className="page-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">위치 인증</span>
            <h2 className="section-title">한 번만 인증하면 이후 접속에서도 그대로 사용합니다.</h2>
          </div>
          <button type="button" className="button button-secondary" onClick={handleLocationVerification} disabled={isCheckingLocation}>
            {isCheckingLocation ? "인증 중..." : locationAccess ? "현재 위치 다시 확인" : "현재 위치 인증"}
          </button>
        </div>

        <p className="page-copy compact-copy">{locationMessage}</p>

        <div className="inline-note-list">
          <span className={`inline-note${locationAccess ? " success" : ""}`}>{locationAccess ? "위치 인증 완료" : "미인증"}</span>
          {locationAccess ? <span className="inline-note success">저장된 위치 인증 상태는 매물 접수와 수정 화면에서 계속 사용됩니다.</span> : null}
        </div>
      </section>

      {pageError ? <div className="error-banner">{pageError}</div> : null}
      {saveMessage ? <div className="success-banner">{saveMessage}</div> : null}

      <div className="my-page-grid">
        <section className="page-panel my-page-list-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">내 매물</span>
              <h2 className="section-title">내가 등록한 매물</h2>
            </div>

            <Link to="/sell" className="button button-secondary button-small">
              새 매물 접수
            </Link>
          </div>

          {leads.length === 0 ? (
            <div className="empty-panel">
              <strong>아직 등록한 매물이 없습니다.</strong>
              <p>위치 인증을 마친 뒤 새 매물을 접수해 보세요.</p>
            </div>
          ) : (
            <div className="my-lead-list">
              {leads.map((lead) => (
                <button key={lead.id} type="button" className={`my-lead-card${selectedLeadId === lead.id ? " active" : ""}`} onClick={() => setSelectedLeadId(lead.id)}>
                  <div className="my-lead-card-top">
                    <strong>{lead.listingTitle}</strong>
                    <span className={`status-badge transaction-${lead.transactionType}`}>{lead.isPublished ? "공개 중" : "재확인 중"}</span>
                  </div>
                  <div className="my-lead-card-meta">
                    <span>{formatTradeLabel(lead)}</span>
                    <span>{getPropertyTypeLabel(lead.propertyType)}</span>
                    <span>{formatDateTime(lead.createdAt)}</span>
                  </div>
                  <div className="my-lead-card-meta">
                    <span>{lead.addressLine1}</span>
                    <span>사진 {lead.photoCount}장</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="page-panel my-page-editor-panel">
          {selectedLead && editForm ? (
            <form onSubmit={handleUpdateSubmit}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">수정 요청</span>
                  <h2 className="section-title">매물 정보 수정</h2>
                </div>
              </div>

              <div className="detail-info-grid">
                <div>
                  <span>현재 상태</span>
                  <strong>{selectedLead.isPublished ? "공개 중" : "재확인 중"}</strong>
                </div>
                <div>
                  <span>사진</span>
                  <strong>{selectedLead.photoCount}장</strong>
                </div>
                <div>
                  <span>면적</span>
                  <strong>{formatArea(selectedLead.areaM2)}</strong>
                </div>
                <div>
                  <span>거래</span>
                  <strong>{formatTradeLabel(selectedLead)}</strong>
                </div>
              </div>

              <div className="form-grid two-column">
                <label className="field">
                  <span>중개사무소</span>
                  <select className="input" value={editForm.officeId} onChange={(event) => setEditForm((current) => (current ? { ...current, officeId: event.target.value } : current))}>
                    {offices.map((office) => (
                      <option key={office.id} value={office.id}>
                        {office.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>매물 제목</span>
                  <input className="input" value={editForm.listingTitle} onChange={(event) => setEditForm((current) => (current ? { ...current, listingTitle: event.target.value } : current))} />
                </label>

                <label className="field">
                  <span>이름</span>
                  <input className="input" value={editForm.ownerName} onChange={(event) => setEditForm((current) => (current ? { ...current, ownerName: event.target.value } : current))} />
                </label>

                <label className="field">
                  <span>연락처</span>
                  <input className="input" value={editForm.phone} onChange={(event) => setEditForm((current) => (current ? { ...current, phone: event.target.value } : current))} />
                </label>

                <label className="field">
                  <span>이메일</span>
                  <input className="input" value={editForm.email} onChange={(event) => setEditForm((current) => (current ? { ...current, email: event.target.value } : current))} />
                </label>

                <label className="field">
                  <span>연락 가능 시간</span>
                  <input className="input" value={editForm.contactTime} onChange={(event) => setEditForm((current) => (current ? { ...current, contactTime: event.target.value } : current))} />
                </label>

                <label className="field">
                  <span>매물 유형</span>
                  <select className="input" value={editForm.propertyType} onChange={(event) => setEditForm((current) => (current ? { ...current, propertyType: event.target.value } : current))}>
                    {propertyTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>거래 유형</span>
                  <select className="input" value={editForm.transactionType} onChange={(event) => setEditForm((current) => (current ? { ...current, transactionType: event.target.value } : current))}>
                    {transactionTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>주소</span>
                  <input className="input" value={editForm.addressLine1} onChange={(event) => setEditForm((current) => (current ? { ...current, addressLine1: event.target.value } : current))} />
                </label>

                <label className="field">
                  <span>상세 주소</span>
                  <input className="input" value={editForm.addressLine2} onChange={(event) => setEditForm((current) => (current ? { ...current, addressLine2: event.target.value } : current))} />
                </label>

                <label className="field">
                  <span>우편번호</span>
                  <input className="input" value={editForm.postalCode} onChange={(event) => setEditForm((current) => (current ? { ...current, postalCode: event.target.value } : current))} />
                </label>

                <label className="field">
                  <span>전용 면적(㎡)</span>
                  <input className="input" value={editForm.areaM2} onChange={(event) => setEditForm((current) => (current ? { ...current, areaM2: event.target.value } : current))} />
                </label>

                <label className="field">
                  <span>매매가</span>
                  <input className="input" value={editForm.priceKrw} onChange={(event) => setEditForm((current) => (current ? { ...current, priceKrw: event.target.value } : current))} />
                </label>

                <label className="field">
                  <span>보증금 / 전세가</span>
                  <input className="input" value={editForm.depositKrw} onChange={(event) => setEditForm((current) => (current ? { ...current, depositKrw: event.target.value } : current))} />
                </label>

                <label className="field">
                  <span>월세</span>
                  <input className="input" value={editForm.monthlyRentKrw} onChange={(event) => setEditForm((current) => (current ? { ...current, monthlyRentKrw: event.target.value } : current))} />
                </label>

                <label className="field">
                  <span>입주 가능 시기</span>
                  <input className="input" value={editForm.moveInDate} onChange={(event) => setEditForm((current) => (current ? { ...current, moveInDate: event.target.value } : current))} />
                </label>
              </div>

              <label className="field">
                <span>상세 설명</span>
                <textarea className="textarea" value={editForm.description} onChange={(event) => setEditForm((current) => (current ? { ...current, description: event.target.value } : current))} />
              </label>

              <div className="button-row">
                <button type="submit" className="button button-primary" disabled={isSaving}>
                  {isSaving ? "수정 요청 중..." : "수정 요청 보내기"}
                </button>
              </div>
            </form>
          ) : (
            <div className="empty-panel">
              <strong>선택한 매물이 없습니다.</strong>
              <p>왼쪽 목록에서 수정할 매물을 먼저 선택해 주세요.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
