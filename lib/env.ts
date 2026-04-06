import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_BASE_URL: z.string().url(),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().min(1),
  S3_UPLOAD_PREFIX: z.string().default("leads"),
  ADMIN_SESSION_SECRET: z.string().min(32),
  MAX_PHOTO_SIZE_MB: z.coerce.number().int().positive().default(20),
  MAX_PHOTO_COUNT: z.coerce.number().int().positive().default(10),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => {
      const path = issue.path.join(".") || "env";
      return `${path}: ${issue.message}`;
    });

    throw new Error(`Invalid environment variables:\n${errors.join("\n")}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

