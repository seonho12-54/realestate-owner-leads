import type { PoolConnection } from "mysql2/promise";

import { writeAuditLog } from "@/lib/audit";
import { createPresignedPhotoViewUrl } from "@/lib/s3";
import type { DbMutation, DbRow } from "@/lib/db";
import { getPool, withTransaction } from "@/lib/db";
import { geocodeAddressWithinServiceArea, verifyCoordsWithinServiceArea } from "@/lib/kakao";
import type { RequestMeta } from "@/lib/request";
import { ensureRuntimeSchema } from "@/lib/schema";
import type { AdminLeadUpdateInput, LeadCreateInput, LeadStatus } from "@/lib/validation";

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

type OfficeExistsRow = DbRow & { id: number };

type PublicListingRow = DbRow & {
  id: number;
  listing_title: string;
  property_type: string;
  transaction_type: string;
  address_line1: string;
  address_line2: string | null;
  region_3depth_name: string | null;
  area_m2: string | null;
  price_krw: string | null;
  deposit_krw: string | null;
  monthly_rent_krw: string | null;
  description: string | null;
  latitude: string;
  longitude: string;
  created_at: Date | string;
  office_name: string;
  office_phone: string | null;
  photo_count: number;
};

type AdminLeadRow = DbRow & {
  id: number;
  office_id: number;
  office_name: string;
  office_phone: string | null;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  listing_title: string;
  owner_name: string;
  phone: string;
  email: string | null;
  property_type: string;
  transaction_type: string;
  address_line1: string;
  address_line2: string | null;
  region_2depth_name: string | null;
  region_3depth_name: string | null;
  latitude: string | null;
  longitude: string | null;
  area_m2: string | null;
  price_krw: string | null;
  deposit_krw: string | null;
  monthly_rent_krw: string | null;
  contact_time: string | null;
  description: string | null;
  admin_memo: string | null;
  location_verified: number;
  privacy_consent: number;
  marketing_consent: number;
  status: LeadStatus;
  is_published: number;
  published_at: Date | string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer_url: string | null;
  landing_url: string | null;
  created_at: Date | string;
  photo_count: number;
};

type LeadPhotoRow = DbRow & {
  id: number;
  lead_id: number;
  s3_key: string;
  file_name: string;
};

type PublishedDetailRow = DbRow & {
  id: number;
  listing_title: string;
  property_type: string;
  transaction_type: string;
  address_line1: string;
  address_line2: string | null;
  region_2depth_name: string | null;
  region_3depth_name: string | null;
  area_m2: string | null;
  price_krw: string | null;
  deposit_krw: string | null;
  monthly_rent_krw: string | null;
  description: string | null;
  contact_time: string | null;
  move_in_date: string | null;
  latitude: string;
  longitude: string;
  office_name: string;
  office_phone: string | null;
  office_address: string | null;
  created_at: Date | string;
};

export async function createLead(
  input: LeadCreateInput,
  requestMeta: RequestMeta,
  options?: { userId?: number | null; adminId?: number | null; bypassLocationCheck?: boolean },
): Promise<number> {
  await ensureRuntimeSchema();

  const browserRegion = options?.bypassLocationCheck
    ? {
        allowed: true,
        addressName: "관리자 우회 등록",
        region1DepthName: null,
        region2DepthName: null,
        region3DepthName: null,
      }
    : await verifyCoordsWithinServiceArea(input.browserLatitude, input.browserLongitude);

  if (!browserRegion.allowed) {
    throw new Error("울산광역시 중구 안에서만 서비스를 이용할 수 있습니다.");
  }

  const geocodedAddress = await geocodeAddressWithinServiceArea(input.addressLine1);

  return withTransaction(async (connection) => {
    await ensureOfficeExists(input.officeId, connection);

    const [result] = await connection.execute<DbMutation>(
      `
        INSERT INTO leads (
          office_id,
          user_id,
          listing_title,
          owner_name,
          phone,
          email,
          property_type,
          transaction_type,
          address_line1,
          address_line2,
          postal_code,
          region_1depth_name,
          region_2depth_name,
          region_3depth_name,
          latitude,
          longitude,
          location_verified,
          area_m2,
          price_krw,
          deposit_krw,
          monthly_rent_krw,
          move_in_date,
          contact_time,
          description,
          privacy_consent,
          marketing_consent,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_term,
          utm_content,
          referrer_url,
          landing_url,
          user_agent,
          submitted_ip
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.officeId,
        options?.userId ?? null,
        input.listingTitle,
        input.ownerName,
        input.phone,
        input.email,
        input.propertyType,
        input.transactionType,
        geocodedAddress.roadAddress ?? geocodedAddress.addressName,
        input.addressLine2 || null,
        input.postalCode || geocodedAddress.postalCode || null,
        geocodedAddress.region1DepthName,
        geocodedAddress.region2DepthName,
        geocodedAddress.region3DepthName,
        geocodedAddress.latitude,
        geocodedAddress.longitude,
        1,
        input.areaM2,
        input.priceKrw,
        input.depositKrw,
        input.monthlyRentKrw,
        input.moveInDate || null,
        input.contactTime || null,
        input.description || null,
        input.privacyConsent ? 1 : 0,
        input.marketingConsent ? 1 : 0,
        input.utmSource || null,
        input.utmMedium || null,
        input.utmCampaign || null,
        input.utmTerm || null,
        input.utmContent || null,
        input.referrerUrl || null,
        input.landingUrl || null,
        requestMeta.userAgent,
        requestMeta.ip,
      ],
    );

    const leadId = Number(result.insertId);

    if (input.photos.length > 0) {
      const values = input.photos.map((photo) => [
        leadId,
        photo.s3Key,
        photo.fileName,
        photo.contentType,
        photo.fileSize,
        photo.displayOrder,
      ]);

      await connection.query(
        `
          INSERT INTO lead_photos (
            lead_id,
            s3_key,
            file_name,
            content_type,
            file_size,
            display_order
          ) VALUES ?
        `,
        [values],
      );
    }

    await writeAuditLog(
      {
        adminId: options?.adminId ?? null,
        actionType: "lead.created",
        entityType: "lead",
        entityId: leadId,
        requestIp: requestMeta.ip,
        userAgent: requestMeta.userAgent,
        payload: {
          officeId: input.officeId,
          userId: options?.userId ?? null,
          listingTitle: input.listingTitle,
          transactionType: input.transactionType,
          region2DepthName: geocodedAddress.region2DepthName,
          region3DepthName: geocodedAddress.region3DepthName,
          locationAllowed: browserRegion.allowed,
          bypassLocationCheck: Boolean(options?.bypassLocationCheck),
        },
      },
      connection,
    );

    return leadId;
  });
}

export async function listPublishedListings(): Promise<PublicListing[]> {
  await ensureRuntimeSchema();

  const [rows] = await getPool().query<PublicListingRow[]>(
    `
      SELECT
        l.id,
        l.listing_title,
        l.property_type,
        l.transaction_type,
        l.address_line1,
        l.address_line2,
        l.region_3depth_name,
        l.area_m2,
        l.price_krw,
        l.deposit_krw,
        l.monthly_rent_krw,
        l.description,
        l.latitude,
        l.longitude,
        l.created_at,
        o.name AS office_name,
        o.phone AS office_phone,
        COUNT(lp.id) AS photo_count
      FROM leads l
      INNER JOIN offices o ON o.id = l.office_id
      LEFT JOIN lead_photos lp ON lp.lead_id = l.id
      WHERE l.is_published = 1
        AND l.location_verified = 1
        AND l.latitude IS NOT NULL
        AND l.longitude IS NOT NULL
      GROUP BY l.id
      ORDER BY l.is_published DESC, l.created_at DESC
    `,
  );

  const photoMap = await listLeadPhotoAssets(rows.map((row) => Number(row.id)), 1);

  return rows.map((row) => ({
    id: Number(row.id),
    listingTitle: row.listing_title,
    propertyType: row.property_type,
    transactionType: row.transaction_type,
    addressLine1: row.region_3depth_name ? `${row.region_3depth_name} 인근` : "허용 지역 인근",
    addressLine2: null,
    region3DepthName: row.region_3depth_name,
    areaM2: parseNullableNumber(row.area_m2),
    priceKrw: parseNullableNumber(row.price_krw),
    depositKrw: parseNullableNumber(row.deposit_krw),
    monthlyRentKrw: parseNullableNumber(row.monthly_rent_krw),
    description: row.description,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    createdAt: new Date(row.created_at).toISOString(),
    officeName: row.office_name,
    officePhone: row.office_phone,
    photoCount: Number(row.photo_count),
    previewPhotoUrl: photoMap.get(Number(row.id))?.[0]?.viewUrl ?? null,
  }));
}

export async function getPublishedListingDetail(leadId: number): Promise<(PublicListing & {
  officeAddress: string | null;
  contactTime: string | null;
  moveInDate: string | null;
  photos: LeadPhotoAsset[];
}) | null> {
  await ensureRuntimeSchema();

  const [rows] = await getPool().execute<PublishedDetailRow[]>(
    `
      SELECT
        l.id,
        l.listing_title,
        l.property_type,
        l.transaction_type,
        l.address_line1,
        l.address_line2,
        l.region_2depth_name,
        l.region_3depth_name,
        l.area_m2,
        l.price_krw,
        l.deposit_krw,
        l.monthly_rent_krw,
        l.description,
        l.contact_time,
        l.move_in_date,
        l.latitude,
        l.longitude,
        l.created_at,
        o.name AS office_name,
        o.phone AS office_phone,
        o.address AS office_address
      FROM leads l
      INNER JOIN offices o ON o.id = l.office_id
      WHERE l.id = ?
        AND l.is_published = 1
      LIMIT 1
    `,
    [leadId],
  );

  const row = rows[0];

  if (!row) {
    return null;
  }

  const photos = (await listLeadPhotoAssets([leadId])).get(leadId) ?? [];

  return {
    id: Number(row.id),
    listingTitle: row.listing_title,
    propertyType: row.property_type,
    transactionType: row.transaction_type,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    region3DepthName: row.region_3depth_name,
    areaM2: parseNullableNumber(row.area_m2),
    priceKrw: parseNullableNumber(row.price_krw),
    depositKrw: parseNullableNumber(row.deposit_krw),
    monthlyRentKrw: parseNullableNumber(row.monthly_rent_krw),
    description: row.description,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    createdAt: new Date(row.created_at).toISOString(),
    officeName: row.office_name,
    officePhone: row.office_phone,
    photoCount: photos.length,
    previewPhotoUrl: photos[0]?.viewUrl ?? null,
    officeAddress: row.office_address,
    contactTime: row.contact_time,
    moveInDate: row.move_in_date,
    photos,
  };
}

export async function listAdminLeads(status?: LeadStatus | null): Promise<AdminLeadSummary[]> {
  await ensureRuntimeSchema();

  const params: string[] = [];
  const whereClause = status ? "WHERE l.status = ?" : "";

  if (status) {
    params.push(status);
  }

  const [rows] = await getPool().query<AdminLeadRow[]>(
    `
      SELECT
        l.id,
        l.office_id,
        o.name AS office_name,
        o.phone AS office_phone,
        l.user_id,
        u.name AS user_name,
        u.email AS user_email,
        l.listing_title,
        l.owner_name,
        l.phone,
        l.email,
        l.property_type,
        l.transaction_type,
        l.address_line1,
        l.address_line2,
        l.region_2depth_name,
        l.region_3depth_name,
        l.latitude,
        l.longitude,
        l.area_m2,
        l.price_krw,
        l.deposit_krw,
        l.monthly_rent_krw,
        l.contact_time,
        l.description,
        l.admin_memo,
        l.location_verified,
        l.privacy_consent,
        l.marketing_consent,
        l.status,
        l.is_published,
        l.published_at,
        l.utm_source,
        l.utm_medium,
        l.utm_campaign,
        l.referrer_url,
        l.landing_url,
        l.created_at,
        COUNT(lp.id) AS photo_count
      FROM leads l
      INNER JOIN offices o ON o.id = l.office_id
      LEFT JOIN users u ON u.id = l.user_id
      LEFT JOIN lead_photos lp ON lp.lead_id = l.id
      ${whereClause}
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `,
    params,
  );

  const photoMap = await listLeadPhotoAssets(rows.map((row) => Number(row.id)), 6);

  return rows.map((row) => ({
    id: Number(row.id),
    officeId: Number(row.office_id),
    officeName: row.office_name,
    officePhone: row.office_phone,
    userId: row.user_id === null ? null : Number(row.user_id),
    userName: row.user_name,
    userEmail: row.user_email,
    listingTitle: row.listing_title,
    ownerName: row.owner_name,
    phone: row.phone,
    email: row.email,
    propertyType: row.property_type,
    transactionType: row.transaction_type,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    region2DepthName: row.region_2depth_name,
    region3DepthName: row.region_3depth_name,
    latitude: parseNullableNumber(row.latitude),
    longitude: parseNullableNumber(row.longitude),
    areaM2: parseNullableNumber(row.area_m2),
    priceKrw: parseNullableNumber(row.price_krw),
    depositKrw: parseNullableNumber(row.deposit_krw),
    monthlyRentKrw: parseNullableNumber(row.monthly_rent_krw),
    contactTime: row.contact_time,
    description: row.description,
    adminMemo: row.admin_memo,
    locationVerified: Boolean(row.location_verified),
    privacyConsent: Boolean(row.privacy_consent),
    marketingConsent: Boolean(row.marketing_consent),
    status: row.status,
    isPublished: Boolean(row.is_published),
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    referrerUrl: row.referrer_url,
    landingUrl: row.landing_url,
    createdAt: new Date(row.created_at).toISOString(),
    photoCount: Number(row.photo_count),
    photos: photoMap.get(Number(row.id)) ?? [],
  }));
}

export async function updateLeadAdminFields(params: {
  leadId: number;
  input: AdminLeadUpdateInput;
  adminId: number;
  requestMeta: RequestMeta;
}): Promise<void> {
  await ensureRuntimeSchema();

  await withTransaction(async (connection) => {
    const [result] = await connection.execute<DbMutation>(
      `
        UPDATE leads
        SET
          status = ?,
          is_published = ?,
          admin_memo = ?,
          published_at = CASE
            WHEN ? = 1 AND published_at IS NULL THEN NOW()
            WHEN ? = 0 THEN NULL
            ELSE published_at
          END,
          published_by_admin_id = CASE
            WHEN ? = 1 THEN ?
            ELSE published_by_admin_id
          END
        WHERE id = ?
      `,
      [
        params.input.status,
        params.input.isPublished ? 1 : 0,
        params.input.adminMemo || null,
        params.input.isPublished ? 1 : 0,
        params.input.isPublished ? 1 : 0,
        params.input.isPublished ? 1 : 0,
        params.adminId,
        params.leadId,
      ],
    );

    if (result.affectedRows === 0) {
      throw new Error("매물을 찾을 수 없습니다.");
    }

    await writeAuditLog(
      {
        adminId: params.adminId,
        actionType: "lead.admin_updated",
        entityType: "lead",
        entityId: params.leadId,
        requestIp: params.requestMeta.ip,
        userAgent: params.requestMeta.userAgent,
        payload: {
          status: params.input.status,
          isPublished: params.input.isPublished,
        },
      },
      connection,
    );
  });
}

export async function incrementLeadViewCount(leadId: number): Promise<void> {
  await ensureRuntimeSchema();

  await getPool().execute(
    `
      UPDATE leads
      SET view_count = view_count + 1
      WHERE id = ? AND is_published = 1
    `,
    [leadId],
  );
}

async function ensureOfficeExists(officeId: number, connection: PoolConnection): Promise<void> {
  const [rows] = await connection.execute<OfficeExistsRow[]>(
    `
      SELECT id
      FROM offices
      WHERE id = ? AND is_active = 1
      LIMIT 1
    `,
    [officeId],
  );

  if (rows.length === 0) {
    throw new Error("선택한 중개사무소를 찾을 수 없습니다.");
  }
}

async function listLeadPhotoAssets(leadIds: number[], perLeadLimit = 999): Promise<Map<number, LeadPhotoAsset[]>> {
  if (leadIds.length === 0) {
    return new Map<number, LeadPhotoAsset[]>();
  }

  const [rows] = await getPool().query<LeadPhotoRow[]>(
    `
      SELECT id, lead_id, s3_key, file_name
      FROM lead_photos
      WHERE lead_id IN (?)
      ORDER BY display_order ASC, id ASC
    `,
    [leadIds],
  );

  const groupedRows = rows.reduce((map, row) => {
    const leadId = Number(row.lead_id);
    const current = map.get(leadId) ?? [];
    if (current.length < perLeadLimit) {
      current.push(row);
      map.set(leadId, current);
    }
    return map;
  }, new Map<number, LeadPhotoRow[]>());

  const photoMaps = await Promise.all(
    Array.from(groupedRows.entries()).map(async ([leadId, photoRows]) => {
      const assets = await Promise.all(
        photoRows.map(async (photoRow) => {
          let viewUrl: string | null = null;

          try {
            viewUrl = await createPresignedPhotoViewUrl(photoRow.s3_key);
          } catch (error) {
            console.error("Failed to create photo view URL", {
              leadId,
              photoId: Number(photoRow.id),
              s3Key: photoRow.s3_key,
              error,
            });
          }

          return {
            id: Number(photoRow.id),
            leadId,
            fileName: photoRow.file_name,
            s3Key: photoRow.s3_key,
            viewUrl,
          };
        }),
      );

      return [leadId, assets] as const;
    }),
  );

  return new Map<number, LeadPhotoAsset[]>(photoMaps);
}

function parseNullableNumber(value: string | number | null): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
