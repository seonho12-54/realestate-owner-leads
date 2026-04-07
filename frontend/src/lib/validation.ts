import { z } from "zod";

export const propertyTypeValues = ["apartment", "officetel", "villa", "house", "commercial", "land", "other"] as const;
export const transactionTypeValues = ["sale", "jeonse", "monthly", "consult"] as const;
export const leadStatusValues = ["new", "contacted", "reviewing", "completed", "closed"] as const;

export const propertyTypeOptions = [
  { value: "apartment", label: "아파트" },
  { value: "officetel", label: "오피스텔" },
  { value: "villa", label: "빌라/연립" },
  { value: "house", label: "단독/다가구" },
  { value: "commercial", label: "상가/사무실" },
  { value: "land", label: "토지" },
  { value: "other", label: "기타" },
] as const;

export const transactionTypeOptions = [
  { value: "sale", label: "매매" },
  { value: "jeonse", label: "전세" },
  { value: "monthly", label: "월세" },
  { value: "consult", label: "상담" },
] as const;

export const leadStatusOptions = [
  { value: "new", label: "신규 접수" },
  { value: "contacted", label: "연락 완료" },
  { value: "reviewing", label: "검토 중" },
  { value: "completed", label: "처리 완료" },
  { value: "closed", label: "보류" },
] as const;

const numberLike = z.union([z.number(), z.string()]);

function optionalPositiveNumber() {
  return numberLike
    .transform((value) => {
      if (typeof value === "number") {
        return value;
      }

      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }

      const parsed = Number(trimmed.replaceAll(",", ""));
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    })
    .nullable()
    .refine((value) => value === null || (Number.isFinite(value) && value >= 0), "숫자 형식이 올바르지 않습니다.")
    .transform((value) => value ?? null);
}

export const uploadPresignSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z
    .string()
    .min(1)
    .refine(
      (value) => ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(value),
      "지원하지 않는 이미지 형식입니다.",
    ),
  fileSize: z.number().int().positive(),
});

export const leadPhotoSchema = z.object({
  s3Key: z.string().min(1).max(500),
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  fileSize: z.number().int().positive(),
  displayOrder: z.number().int().nonnegative().default(0),
});

export const locationVerifySchema = z.object({
  latitude: z.number().min(33).max(39),
  longitude: z.number().min(124).max(132),
});

export const addressSearchSchema = z.object({
  query: z.string().trim().min(2, "주소 검색어를 입력해 주세요.").max(120),
});

export const leadCreateSchema = z.object({
  officeId: z.number().int().positive(),
  listingTitle: z.string().trim().min(4, "매물 제목을 입력해 주세요.").max(160),
  ownerName: z.string().trim().min(2, "이름을 입력해 주세요.").max(100),
  phone: z
    .string()
    .trim()
    .min(9, "연락처를 입력해 주세요.")
    .max(30)
    .regex(/^[0-9+\-() ]+$/, "연락처 형식이 올바르지 않습니다."),
  email: z.string().trim().max(191).email("이메일 형식이 올바르지 않습니다.").or(z.literal("")).transform((value) => value || null),
  propertyType: z.enum(propertyTypeValues),
  transactionType: z.enum(transactionTypeValues),
  addressLine1: z.string().trim().min(5, "주소를 입력해 주세요.").max(255),
  addressLine2: z.string().trim().max(255).optional().default(""),
  postalCode: z.string().trim().max(20).optional().default(""),
  areaM2: optionalPositiveNumber(),
  priceKrw: optionalPositiveNumber(),
  depositKrw: optionalPositiveNumber(),
  monthlyRentKrw: optionalPositiveNumber(),
  moveInDate: z.string().trim().max(50).optional().default(""),
  contactTime: z.string().trim().max(100).optional().default(""),
  description: z.string().trim().max(3000).optional().default(""),
  privacyConsent: z.literal(true, {
    errorMap: () => ({ message: "개인정보 수집 및 이용 동의가 필요합니다." }),
  }),
  marketingConsent: z.boolean().default(false),
  utmSource: z.string().trim().max(100).optional().default(""),
  utmMedium: z.string().trim().max(100).optional().default(""),
  utmCampaign: z.string().trim().max(100).optional().default(""),
  utmTerm: z.string().trim().max(100).optional().default(""),
  utmContent: z.string().trim().max(100).optional().default(""),
  referrerUrl: z.string().trim().max(500).optional().default(""),
  landingUrl: z.string().trim().max(500).optional().default(""),
  browserLatitude: z.number().min(33).max(39),
  browserLongitude: z.number().min(124).max(132),
  photos: z.array(leadPhotoSchema).max(20).default([]),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().email("이메일을 확인해 주세요."),
  password: z.string().min(8, "비밀번호를 확인해 주세요.").max(128),
});

export const userSignupSchema = z.object({
  name: z.string().trim().min(2, "이름을 입력해 주세요.").max(100),
  email: z.string().trim().email("이메일을 확인해 주세요.").max(191),
  phone: z.string().trim().max(30).optional().default(""),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다.")
    .max(128)
    .regex(/[A-Za-z]/, "비밀번호에 영문을 포함해 주세요.")
    .regex(/[0-9]/, "비밀번호에 숫자를 포함해 주세요."),
});

export const userLoginSchema = z.object({
  email: z.string().trim().email("이메일을 확인해 주세요."),
  password: z.string().min(8, "비밀번호를 확인해 주세요.").max(128),
});

export const adminLeadUpdateSchema = z.object({
  status: z.enum(leadStatusValues),
  isPublished: z.boolean(),
  adminMemo: z.string().max(2000).optional().default(""),
});

export type PropertyType = (typeof propertyTypeValues)[number];
export type TransactionType = (typeof transactionTypeValues)[number];
export type LeadStatus = (typeof leadStatusValues)[number];
export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadPhotoInput = z.infer<typeof leadPhotoSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type UserSignupInput = z.infer<typeof userSignupSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
export type AdminLeadUpdateInput = z.infer<typeof adminLeadUpdateSchema>;

export function getValidationMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "입력값을 확인해 주세요.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "요청을 처리하지 못했습니다.";
}
