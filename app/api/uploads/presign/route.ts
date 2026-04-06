import { NextResponse } from "next/server";

import { getEnv } from "@/lib/env";
import { createPresignedPhotoUpload } from "@/lib/s3";
import { uploadPresignSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const payload = uploadPresignSchema.parse(await request.json());
    const env = getEnv();

    if (payload.fileSize > env.MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        {
          error: `사진 1장당 최대 ${env.MAX_PHOTO_SIZE_MB}MB까지 업로드할 수 있습니다.`,
        },
        { status: 400 },
      );
    }

    const signedUpload = await createPresignedPhotoUpload({
      fileName: payload.fileName,
      contentType: payload.contentType,
    });

    return NextResponse.json(signedUpload);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "업로드 URL 발급에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}

