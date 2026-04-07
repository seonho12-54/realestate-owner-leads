import { apiRequest } from "@/lib/api";
import type { LeadStatus } from "@/lib/validation";

export type LeadPhotoAsset = {
  id: number;
  leadId: number;
  fileName: string;
  s3Key: string;
  viewUrl: string | null;
};

export type PublicListing = {
  id: number;
  listingTitle: string;
  propertyType: string;
  transactionType: string;
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
  region2DepthName: string | null;
  region3DepthName: string | null;
  latitude: number | null;
  longitude: number | null;
  areaM2: number | null;
  priceKrw: number | null;
  depositKrw: number | null;
  monthlyRentKrw: number | null;
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
  browserLatitude: number;
  browserLongitude: number;
  photos: Array<{
    s3Key: string;
    fileName: string;
    contentType: string;
    fileSize: number;
    displayOrder: number;
  }>;
};

export async function listPublishedListings() {
  return apiRequest<PublicListing[]>("/api/public/listings");
}

export async function getPublishedListingDetail(listingId: number) {
  return apiRequest<LeadDetail>(`/api/public/listings/${listingId}`);
}

export async function createLead(payload: CreateLeadPayload) {
  return apiRequest<{ id: number }>("/api/leads", {
    method: "POST",
    json: payload,
  });
}

export async function listAdminLeads(status?: string | null) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest<AdminLeadSummary[]>(`/api/admin/leads${query}`);
}

export async function updateLeadAdminFields(leadId: number, payload: { status: LeadStatus; isPublished: boolean; adminMemo: string }) {
  return apiRequest<{ success: boolean }>(`/api/admin/leads/${leadId}`, {
    method: "PATCH",
    json: payload,
  });
}
