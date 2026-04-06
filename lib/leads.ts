import type { PoolConnection } from "mysql2/promise";

import { writeAuditLog } from "@/lib/audit";
import type { DbMutation, DbRow } from "@/lib/db";
import { getPool, withTransaction } from "@/lib/db";
import type { RequestMeta } from "@/lib/request";
import type { LeadCreateInput, LeadStatus } from "@/lib/validation";

export type LeadSummary = {
  id: number;
  officeId: number;
  officeName: string;
  ownerName: string;
  phone: string;
  email: string | null;
  propertyType: string;
  transactionType: string;
  addressLine1: string;
  addressLine2: string | null;
  areaM2: number | null;
  priceKrw: number | null;
  depositKrw: number | null;
  monthlyRentKrw: number | null;
  contactTime: string | null;
  description: string | null;
  privacyConsent: boolean;
  marketingConsent: boolean;
  status: LeadStatus;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrerUrl: string | null;
  landingUrl: string | null;
  createdAt: string;
  photoCount: number;
  photoNames: string[];
};

type OfficeExistsRow = DbRow & { id: number };

type LeadSummaryRow = DbRow & {
  id: number;
  office_id: number;
  office_name: string;
  owner_name: string;
  phone: string;
  email: string | null;
  property_type: string;
  transaction_type: string;
  address_line1: string;
  address_line2: string | null;
  area_m2: string | null;
  price_krw: string | null;
  deposit_krw: string | null;
  monthly_rent_krw: string | null;
  contact_time: string | null;
  description: string | null;
  privacy_consent: number;
  marketing_consent: number;
  status: LeadStatus;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer_url: string | null;
  landing_url: string | null;
  created_at: Date | string;
  photo_count: number;
};

type LeadPhotoNameRow = DbRow & {
  lead_id: number;
  file_name: string;
};

export async function createLead(input: LeadCreateInput, requestMeta: RequestMeta): Promise<number> {
  return withTransaction(async (connection) => {
    await ensureOfficeExists(input.officeId, connection);

    const [result] = await connection.execute<DbMutation>(
      `
        INSERT INTO leads (
          office_id,
          owner_name,
          phone,
          email,
          property_type,
          transaction_type,
          address_line1,
          address_line2,
          postal_code,
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.officeId,
        input.ownerName,
        input.phone,
        input.email,
        input.propertyType,
        input.transactionType,
        input.addressLine1,
        input.addressLine2 || null,
        input.postalCode || null,
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
        actionType: "lead.created",
        entityType: "lead",
        entityId: leadId,
        requestIp: requestMeta.ip,
        userAgent: requestMeta.userAgent,
        payload: {
          officeId: input.officeId,
          photoCount: input.photos.length,
          propertyType: input.propertyType,
          transactionType: input.transactionType,
        },
      },
      connection,
    );

    return leadId;
  });
}

export async function listLeads(status?: LeadStatus | null): Promise<LeadSummary[]> {
  const params: Array<string> = [];
  const whereClause = status ? "WHERE l.status = ?" : "";

  if (status) {
    params.push(status);
  }

  const [rows] = await getPool().query<LeadSummaryRow[]>(
    `
      SELECT
        l.id,
        l.office_id,
        o.name AS office_name,
        l.owner_name,
        l.phone,
        l.email,
        l.property_type,
        l.transaction_type,
        l.address_line1,
        l.address_line2,
        l.area_m2,
        l.price_krw,
        l.deposit_krw,
        l.monthly_rent_krw,
        l.contact_time,
        l.description,
        l.privacy_consent,
        l.marketing_consent,
        l.status,
        l.utm_source,
        l.utm_medium,
        l.utm_campaign,
        l.referrer_url,
        l.landing_url,
        l.created_at,
        COUNT(lp.id) AS photo_count
      FROM leads l
      INNER JOIN offices o ON o.id = l.office_id
      LEFT JOIN lead_photos lp ON lp.lead_id = l.id
      ${whereClause}
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `,
    params,
  );

  const leadIds = rows.map((row) => Number(row.id));
  const photoNames = leadIds.length > 0 ? await listLeadPhotoNames(leadIds) : new Map<number, string[]>();

  return rows.map((row) => ({
    id: Number(row.id),
    officeId: Number(row.office_id),
    officeName: row.office_name,
    ownerName: row.owner_name,
    phone: row.phone,
    email: row.email,
    propertyType: row.property_type,
    transactionType: row.transaction_type,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    areaM2: parseNullableNumber(row.area_m2),
    priceKrw: parseNullableNumber(row.price_krw),
    depositKrw: parseNullableNumber(row.deposit_krw),
    monthlyRentKrw: parseNullableNumber(row.monthly_rent_krw),
    contactTime: row.contact_time,
    description: row.description,
    privacyConsent: Boolean(row.privacy_consent),
    marketingConsent: Boolean(row.marketing_consent),
    status: row.status,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    referrerUrl: row.referrer_url,
    landingUrl: row.landing_url,
    createdAt: new Date(row.created_at).toISOString(),
    photoCount: Number(row.photo_count),
    photoNames: photoNames.get(Number(row.id)) ?? [],
  }));
}

export async function updateLeadStatus(params: {
  leadId: number;
  status: LeadStatus;
  adminId: number;
  requestMeta: RequestMeta;
}): Promise<void> {
  await withTransaction(async (connection) => {
    const [result] = await connection.execute<DbMutation>(
      `
        UPDATE leads
        SET status = ?
        WHERE id = ?
      `,
      [params.status, params.leadId],
    );

    if (result.affectedRows === 0) {
      throw new Error("매물 접수 건을 찾을 수 없습니다.");
    }

    await writeAuditLog(
      {
        adminId: params.adminId,
        actionType: "lead.status_changed",
        entityType: "lead",
        entityId: params.leadId,
        requestIp: params.requestMeta.ip,
        userAgent: params.requestMeta.userAgent,
        payload: {
          status: params.status,
        },
      },
      connection,
    );
  });
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

async function listLeadPhotoNames(leadIds: number[]): Promise<Map<number, string[]>> {
  const [rows] = await getPool().query<LeadPhotoNameRow[]>(
    `
      SELECT lead_id, file_name
      FROM lead_photos
      WHERE lead_id IN (?)
      ORDER BY display_order ASC, id ASC
    `,
    [leadIds],
  );

  return rows.reduce((map, row) => {
    const leadId = Number(row.lead_id);
    const current = map.get(leadId) ?? [];
    current.push(row.file_name);
    map.set(leadId, current);
    return map;
  }, new Map<number, string[]>());
}

function parseNullableNumber(value: string | number | null): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

