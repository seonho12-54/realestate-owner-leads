import { apiRequest } from "@/lib/api";
import type { LeadStatus } from "@/lib/validation";

export type LeadPhotoAsset = {
  id: number;
  leadId: number;
  fileName: string;
  s3Key: string;
  contentType: string | null;
  fileSize: number | null;
  displayOrder: number;
  viewUrl: string | null;
};

export type PublicListing = {
  id: number;
  listingTitle: string;
  propertyType: string;
  transactionType: string;
  isPreview: boolean;
  regionSlug: string;
  addressLine1: string;
  addressLine2: string | null;
  region3DepthName: string | null;
  areaM2: number | null;
  priceKrw: number | null;
  depositKrw: number | null;
  monthlyRentKrw: number | null;
  description: string | null;
  latitude: number;
  longitude: number;
  createdAt: string;
  officeName: string;
  officePhone: string | null;
  photoCount: number;
  previewPhotoUrl: string | null;
};

export type LeadDetail = PublicListing & {
  officeAddress: string | null;
  contactTime: string | null;
  moveInDate: string | null;
  photos: LeadPhotoAsset[];
};

export type AdminLeadSummary = {
  id: number;
  officeId: number;
  officeName: string;
  officePhone: string | null;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  listingTitle: string;
  ownerName: string;
  phone: string;
  email: string | null;
  propertyType: string;
  transactionType: string;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string | null;
  regionSlug: string | null;
  region2DepthName: string | null;
  region3DepthName: string | null;
  latitude: number | null;
  longitude: number | null;
  areaM2: number | null;
  priceKrw: number | null;
  depositKrw: number | null;
  monthlyRentKrw: number | null;
  moveInDate: string | null;
  contactTime: string | null;
  description: string | null;
  adminMemo: string | null;
  locationVerified: boolean;
  privacyConsent: boolean;
  marketingConsent: boolean;
  status: LeadStatus;
  isPublished: boolean;
  publishedAt: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrerUrl: string | null;
  landingUrl: string | null;
  createdAt: string;
  photoCount: number;
  photos: LeadPhotoAsset[];
};

export type MyLeadSummary = {
  id: number;
  officeId: number;
  officeName: string;
  listingTitle: string;
  ownerName: string;
  phone: string;
  email: string | null;
  propertyType: string;
  transactionType: string;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string | null;
  regionSlug: string | null;
  region2DepthName: string | null;
  region3DepthName: string | null;
  areaM2: number | null;
  priceKrw: number | null;
  depositKrw: number | null;
  monthlyRentKrw: number | null;
  moveInDate: string | null;
  contactTime: string | null;
  description: string | null;
  status: LeadStatus;
  isPublished: boolean;
  createdAt: string;
  photoCount: number;
  photos: LeadPhotoAsset[];
};

export type CreateLeadPayload = {
  officeId: number;
  listingTitle: string;
  ownerName: string;
  phone: string;
  email: string | null;
  propertyType: string;
  transactionType: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  areaM2: number | null;
  priceKrw: number | null;
  depositKrw: number | null;
  monthlyRentKrw: number | null;
  moveInDate: string;
  contactTime: string;
  description: string;
  privacyConsent: boolean;
  marketingConsent: boolean;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  referrerUrl: string;
  landingUrl: string;
  browserLatitude?: number | null;
  browserLongitude?: number | null;
  photos: Array<{
    s3Key: string;
    fileName: string;
    contentType: string;
    fileSize: number;
    displayOrder: number;
  }>;
};

export type UpdateMyLeadPayload = {
  officeId: number;
  listingTitle: string;
  ownerName: string;
  phone: string;
  email: string | null;
  propertyType: string;
  transactionType: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  areaM2: number | null;
  priceKrw: number | null;
  depositKrw: number | null;
  monthlyRentKrw: number | null;
  moveInDate: string;
  contactTime: string;
  description: string;
  browserLatitude?: number | null;
  browserLongitude?: number | null;
};

function normalizePhotoAsset(photo: Partial<LeadPhotoAsset> | null | undefined): LeadPhotoAsset | null {
  if (!photo || typeof photo.id !== "number" || typeof photo.leadId !== "number") {
    return null;
  }

  return {
    id: photo.id,
    leadId: photo.leadId,
    fileName: typeof photo.fileName === "string" ? photo.fileName : "",
    s3Key: typeof photo.s3Key === "string" ? photo.s3Key : "",
    contentType: typeof photo.contentType === "string" ? photo.contentType : null,
    fileSize: typeof photo.fileSize === "number" ? photo.fileSize : null,
    displayOrder: typeof photo.displayOrder === "number" ? photo.displayOrder : 0,
    viewUrl: typeof photo.viewUrl === "string" ? photo.viewUrl : null,
  };
}

function normalizePhotoArray(value: unknown): LeadPhotoAsset[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((photo) => normalizePhotoAsset(photo as Partial<LeadPhotoAsset>)).filter((photo): photo is LeadPhotoAsset => Boolean(photo));
}

function normalizePublicListing(listing: Partial<PublicListing> | null | undefined): PublicListing | null {
  if (
    !listing ||
    typeof listing.id !== "number" ||
    typeof listing.listingTitle !== "string" ||
    typeof listing.propertyType !== "string" ||
    typeof listing.transactionType !== "string" ||
    typeof listing.addressLine1 !== "string" ||
    typeof listing.latitude !== "number" ||
    typeof listing.longitude !== "number" ||
    typeof listing.createdAt !== "string" ||
    typeof listing.officeName !== "string"
  ) {
    return null;
  }

  return {
    id: listing.id,
    listingTitle: listing.listingTitle,
    propertyType: listing.propertyType,
    transactionType: listing.transactionType,
    isPreview: typeof listing.isPreview === "boolean" ? listing.isPreview : false,
    regionSlug: typeof listing.regionSlug === "string" ? listing.regionSlug : "",
    addressLine1: listing.addressLine1,
    addressLine2: typeof listing.addressLine2 === "string" ? listing.addressLine2 : null,
    region3DepthName: typeof listing.region3DepthName === "string" ? listing.region3DepthName : null,
    areaM2: typeof listing.areaM2 === "number" ? listing.areaM2 : null,
    priceKrw: typeof listing.priceKrw === "number" ? listing.priceKrw : null,
    depositKrw: typeof listing.depositKrw === "number" ? listing.depositKrw : null,
    monthlyRentKrw: typeof listing.monthlyRentKrw === "number" ? listing.monthlyRentKrw : null,
    description: typeof listing.description === "string" ? listing.description : null,
    latitude: listing.latitude,
    longitude: listing.longitude,
    createdAt: listing.createdAt,
    officeName: listing.officeName,
    officePhone: typeof listing.officePhone === "string" ? listing.officePhone : null,
    photoCount: typeof listing.photoCount === "number" ? listing.photoCount : 0,
    previewPhotoUrl: typeof listing.previewPhotoUrl === "string" ? listing.previewPhotoUrl : null,
  };
}

function normalizePublicListingArray(value: unknown): PublicListing[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((listing) => normalizePublicListing(listing as Partial<PublicListing>))
    .filter((listing): listing is PublicListing => Boolean(listing));
}

function normalizeLeadDetail(value: unknown): LeadDetail {
  const listing = normalizePublicListing(value as Partial<PublicListing>);

  if (!listing) {
    throw new Error("매물 상세 응답 형식이 올바르지 않습니다.");
  }

  const detail = (value ?? {}) as Partial<LeadDetail>;

  return {
    ...listing,
    officeAddress: typeof detail.officeAddress === "string" ? detail.officeAddress : null,
    contactTime: typeof detail.contactTime === "string" ? detail.contactTime : null,
    moveInDate: typeof detail.moveInDate === "string" ? detail.moveInDate : null,
    photos: normalizePhotoArray(detail.photos),
  };
}

function normalizeAdminLead(value: unknown): AdminLeadSummary | null {
  const lead = (value ?? {}) as Partial<AdminLeadSummary>;

  if (
    typeof lead.id !== "number" ||
    typeof lead.officeId !== "number" ||
    typeof lead.officeName !== "string" ||
    typeof lead.listingTitle !== "string" ||
    typeof lead.ownerName !== "string" ||
    typeof lead.phone !== "string" ||
    typeof lead.propertyType !== "string" ||
    typeof lead.transactionType !== "string" ||
    typeof lead.addressLine1 !== "string" ||
    typeof lead.status !== "string" ||
    typeof lead.isPublished !== "boolean" ||
    typeof lead.locationVerified !== "boolean" ||
    typeof lead.privacyConsent !== "boolean" ||
    typeof lead.marketingConsent !== "boolean" ||
    typeof lead.createdAt !== "string"
  ) {
    return null;
  }

  return {
    id: lead.id,
    officeId: lead.officeId,
    officeName: lead.officeName,
    officePhone: typeof lead.officePhone === "string" ? lead.officePhone : null,
    userId: typeof lead.userId === "number" ? lead.userId : null,
    userName: typeof lead.userName === "string" ? lead.userName : null,
    userEmail: typeof lead.userEmail === "string" ? lead.userEmail : null,
    listingTitle: lead.listingTitle,
    ownerName: lead.ownerName,
    phone: lead.phone,
    email: typeof lead.email === "string" ? lead.email : null,
    propertyType: lead.propertyType,
    transactionType: lead.transactionType,
    addressLine1: lead.addressLine1,
    addressLine2: typeof lead.addressLine2 === "string" ? lead.addressLine2 : null,
    postalCode: typeof lead.postalCode === "string" ? lead.postalCode : null,
    regionSlug: typeof lead.regionSlug === "string" ? lead.regionSlug : null,
    region2DepthName: typeof lead.region2DepthName === "string" ? lead.region2DepthName : null,
    region3DepthName: typeof lead.region3DepthName === "string" ? lead.region3DepthName : null,
    latitude: typeof lead.latitude === "number" ? lead.latitude : null,
    longitude: typeof lead.longitude === "number" ? lead.longitude : null,
    areaM2: typeof lead.areaM2 === "number" ? lead.areaM2 : null,
    priceKrw: typeof lead.priceKrw === "number" ? lead.priceKrw : null,
    depositKrw: typeof lead.depositKrw === "number" ? lead.depositKrw : null,
    monthlyRentKrw: typeof lead.monthlyRentKrw === "number" ? lead.monthlyRentKrw : null,
    moveInDate: typeof lead.moveInDate === "string" ? lead.moveInDate : null,
    contactTime: typeof lead.contactTime === "string" ? lead.contactTime : null,
    description: typeof lead.description === "string" ? lead.description : null,
    adminMemo: typeof lead.adminMemo === "string" ? lead.adminMemo : null,
    locationVerified: lead.locationVerified,
    privacyConsent: lead.privacyConsent,
    marketingConsent: lead.marketingConsent,
    status: lead.status as LeadStatus,
    isPublished: lead.isPublished,
    publishedAt: typeof lead.publishedAt === "string" ? lead.publishedAt : null,
    utmSource: typeof lead.utmSource === "string" ? lead.utmSource : null,
    utmMedium: typeof lead.utmMedium === "string" ? lead.utmMedium : null,
    utmCampaign: typeof lead.utmCampaign === "string" ? lead.utmCampaign : null,
    referrerUrl: typeof lead.referrerUrl === "string" ? lead.referrerUrl : null,
    landingUrl: typeof lead.landingUrl === "string" ? lead.landingUrl : null,
    createdAt: lead.createdAt,
    photoCount: typeof lead.photoCount === "number" ? lead.photoCount : 0,
    photos: normalizePhotoArray(lead.photos),
  };
}

function normalizeAdminLeadArray(value: unknown): AdminLeadSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((lead) => normalizeAdminLead(lead)).filter((lead): lead is AdminLeadSummary => Boolean(lead));
}

function normalizeMyLead(value: unknown): MyLeadSummary | null {
  const lead = (value ?? {}) as Partial<MyLeadSummary>;

  if (
    typeof lead.id !== "number" ||
    typeof lead.officeId !== "number" ||
    typeof lead.officeName !== "string" ||
    typeof lead.listingTitle !== "string" ||
    typeof lead.ownerName !== "string" ||
    typeof lead.phone !== "string" ||
    typeof lead.propertyType !== "string" ||
    typeof lead.transactionType !== "string" ||
    typeof lead.addressLine1 !== "string" ||
    typeof lead.status !== "string" ||
    typeof lead.isPublished !== "boolean" ||
    typeof lead.createdAt !== "string"
  ) {
    return null;
  }

  return {
    id: lead.id,
    officeId: lead.officeId,
    officeName: lead.officeName,
    listingTitle: lead.listingTitle,
    ownerName: lead.ownerName,
    phone: lead.phone,
    email: typeof lead.email === "string" ? lead.email : null,
    propertyType: lead.propertyType,
    transactionType: lead.transactionType,
    addressLine1: lead.addressLine1,
    addressLine2: typeof lead.addressLine2 === "string" ? lead.addressLine2 : null,
    postalCode: typeof lead.postalCode === "string" ? lead.postalCode : null,
    regionSlug: typeof lead.regionSlug === "string" ? lead.regionSlug : null,
    region2DepthName: typeof lead.region2DepthName === "string" ? lead.region2DepthName : null,
    region3DepthName: typeof lead.region3DepthName === "string" ? lead.region3DepthName : null,
    areaM2: typeof lead.areaM2 === "number" ? lead.areaM2 : null,
    priceKrw: typeof lead.priceKrw === "number" ? lead.priceKrw : null,
    depositKrw: typeof lead.depositKrw === "number" ? lead.depositKrw : null,
    monthlyRentKrw: typeof lead.monthlyRentKrw === "number" ? lead.monthlyRentKrw : null,
    moveInDate: typeof lead.moveInDate === "string" ? lead.moveInDate : null,
    contactTime: typeof lead.contactTime === "string" ? lead.contactTime : null,
    description: typeof lead.description === "string" ? lead.description : null,
    status: lead.status as LeadStatus,
    isPublished: lead.isPublished,
    createdAt: lead.createdAt,
    photoCount: typeof lead.photoCount === "number" ? lead.photoCount : 0,
    photos: normalizePhotoArray(lead.photos),
  };
}

function normalizeMyLeadArray(value: unknown): MyLeadSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((lead) => normalizeMyLead(lead)).filter((lead): lead is MyLeadSummary => Boolean(lead));
}

export async function listPreviewListings(limit = 6) {
  const response = await apiRequest<unknown>(`/api/listings/preview?limit=${encodeURIComponent(String(limit))}`);
  return normalizePublicListingArray(response);
}

export async function listPublishedListings() {
  const response = await apiRequest<unknown>("/api/listings");
  return normalizePublicListingArray(response);
}

export async function getPublishedListingDetail(listingId: number) {
  const response = await apiRequest<unknown>(`/api/listings/${listingId}`);
  return normalizeLeadDetail(response);
}

export async function createLead(payload: CreateLeadPayload) {
  return apiRequest<{ id: number }>("/api/leads", {
    method: "POST",
    json: payload,
  });
}

export async function listMyLeads() {
  const response = await apiRequest<unknown>("/api/me/leads");
  return normalizeMyLeadArray(response);
}

export async function updateMyLead(leadId: number, payload: UpdateMyLeadPayload) {
  return apiRequest<{ ok: boolean }>(`/api/me/leads/${leadId}`, {
    method: "PATCH",
    json: payload,
  });
}

export async function listAdminLeads(status?: string | null) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await apiRequest<unknown>(`/api/admin/leads${query}`);
  return normalizeAdminLeadArray(response);
}

export type UpdateAdminLeadPayload = {
  officeId: number;
  listingTitle: string;
  ownerName: string;
  phone: string;
  email: string | null;
  propertyType: string;
  transactionType: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  areaM2: number | null;
  priceKrw: number | null;
  depositKrw: number | null;
  monthlyRentKrw: number | null;
  moveInDate: string;
  contactTime: string;
  description: string;
  privacyConsent: boolean;
  marketingConsent: boolean;
  status: LeadStatus;
  adminMemo: string;
  isPublished: boolean;
  photos: Array<{
    s3Key: string;
    fileName: string;
    contentType: string;
    fileSize: number;
    displayOrder: number;
  }>;
};

export async function updateLeadAdminFields(leadId: number, payload: UpdateAdminLeadPayload) {
  return apiRequest<{ success: boolean }>(`/api/admin/leads/${leadId}`, {
    method: "PATCH",
    json: payload,
  });
}
