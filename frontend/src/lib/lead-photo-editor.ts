import { apiRequest, createApiHeaders } from "@/lib/api";
import { prepareImageForUpload, resolveUploadContentType, resolveUploadFailureMessage } from "@/lib/client-image";
import type { LeadPhotoAsset } from "@/lib/leads";

export type EditableLeadPhoto = {
  localId: string;
  s3Key: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  displayOrder: number;
  previewUrl: string | null;
  isObjectUrl: boolean;
  originalFileSize: number;
  optimizedFileSize: number;
  wasCompressed: boolean;
};

export function reindexEditablePhotos(photos: EditableLeadPhoto[]) {
  return photos.map((photo, index) => ({
    ...photo,
    displayOrder: index,
  }));
}

export function createEditablePhotos(photos: LeadPhotoAsset[]) {
  return reindexEditablePhotos(
    [...photos]
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map((photo) => ({
        localId: `existing-${photo.id}`,
        s3Key: photo.s3Key,
        fileName: photo.fileName,
        contentType: photo.contentType ?? "image/jpeg",
        fileSize: Math.max(photo.fileSize ?? 1, 1),
        displayOrder: photo.displayOrder,
        previewUrl: photo.viewUrl,
        isObjectUrl: false,
        originalFileSize: Math.max(photo.fileSize ?? 0, 0),
        optimizedFileSize: Math.max(photo.fileSize ?? 0, 0),
        wasCompressed: false,
      })),
  );
}

export function releaseEditablePhoto(photo: EditableLeadPhoto) {
  if (photo.isObjectUrl && photo.previewUrl) {
    URL.revokeObjectURL(photo.previewUrl);
  }
}

export function releaseEditablePhotos(photos: EditableLeadPhoto[]) {
  photos.forEach(releaseEditablePhoto);
}

export function toLeadPhotoInputs(photos: EditableLeadPhoto[]) {
  return reindexEditablePhotos(photos).map((photo, index) => ({
    s3Key: photo.s3Key,
    fileName: photo.fileName,
    contentType: photo.contentType,
    fileSize: photo.fileSize,
    displayOrder: index,
  }));
}

export async function uploadEditablePhoto(file: File, indexOffset: number): Promise<EditableLeadPhoto> {
  const prepared = await prepareImageForUpload(file);
  const contentType = resolveUploadContentType(prepared.file);

  if (!contentType) {
    throw new Error("이미지 형식을 확인해 주세요. JPG, PNG, WEBP 파일만 업로드할 수 있습니다.");
  }

  const presign = await apiRequest<{ key: string; uploadUrl: string }>("/api/uploads/presign", {
    method: "POST",
    json: {
      fileName: prepared.file.name,
      contentType,
      fileSize: prepared.file.size,
    },
  });

  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(presign.uploadUrl, {
      method: "PUT",
      credentials: "include",
      headers: createApiHeaders({
        "Content-Type": contentType,
      }),
      body: prepared.file,
    });
  } catch (error) {
    throw new Error(resolveUploadFailureMessage(error));
  }

  if (!uploadResponse.ok) {
    throw new Error(`사진 업로드에 실패했습니다. S3 업로드 응답(${uploadResponse.status})을 확인해 주세요.`);
  }

  return {
    localId: `${Date.now()}-${indexOffset}-${prepared.file.name}`,
    s3Key: presign.key,
    fileName: prepared.file.name,
    contentType,
    fileSize: prepared.file.size,
    displayOrder: indexOffset,
    previewUrl: URL.createObjectURL(prepared.file),
    isObjectUrl: true,
    originalFileSize: prepared.originalFileSize,
    optimizedFileSize: prepared.optimizedFileSize,
    wasCompressed: prepared.wasCompressed,
  };
}

export function getPhotoUploadErrorMessage(error: unknown) {
  return resolveUploadFailureMessage(error);
}
