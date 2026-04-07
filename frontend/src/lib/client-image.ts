const COMPRESSIBLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSION_TO_CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

const MAX_IMAGE_EDGE = 1600;
const TARGET_IMAGE_BYTES = 1_200_000;
const INITIAL_WEBP_QUALITY = 0.82;
const MIN_WEBP_QUALITY = 0.58;
const WEBP_QUALITY_STEP = 0.08;

export type PreparedUploadImage = {
  file: File;
  originalFileSize: number;
  optimizedFileSize: number;
  wasCompressed: boolean;
};

function replaceExtension(fileName: string, nextExtension: string) {
  return fileName.replace(/\.[a-z0-9]+$/i, `.${nextExtension}`);
}

function getScaledDimensions(width: number, height: number) {
  const longestEdge = Math.max(width, height);

  if (!Number.isFinite(longestEdge) || longestEdge <= MAX_IMAGE_EDGE) {
    return { width, height };
  }

  const scale = MAX_IMAGE_EDGE / longestEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function createObjectUrlImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지 파일을 읽지 못했습니다."));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function buildCompressedFileName(fileName: string) {
  if (/\.[a-z0-9]+$/i.test(fileName)) {
    return replaceExtension(fileName, "webp");
  }

  return `${fileName}.webp`;
}

export function resolveUploadContentType(file: File) {
  if (file.type) {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TO_CONTENT_TYPE[extension] ?? null;
}

export async function prepareImageForUpload(file: File): Promise<PreparedUploadImage> {
  const originalFileSize = file.size;
  const resolvedType = resolveUploadContentType(file);

  if (!resolvedType || !COMPRESSIBLE_IMAGE_TYPES.has(resolvedType) || typeof window === "undefined") {
    return {
      file,
      originalFileSize,
      optimizedFileSize: originalFileSize,
      wasCompressed: false,
    };
  }

  try {
    const image = await createObjectUrlImage(file);
    const { width, height } = getScaledDimensions(image.naturalWidth, image.naturalHeight);
    const shouldResize = width !== image.naturalWidth || height !== image.naturalHeight;

    if (!shouldResize && originalFileSize <= TARGET_IMAGE_BYTES) {
      return {
        file,
        originalFileSize,
        optimizedFileSize: originalFileSize,
        wasCompressed: false,
      };
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("이미지 압축용 캔버스를 만들지 못했습니다.");
    }

    context.drawImage(image, 0, 0, width, height);

    let quality = INITIAL_WEBP_QUALITY;
    let compressedBlob = await canvasToBlob(canvas, "image/webp", quality);

    while (compressedBlob && compressedBlob.size > TARGET_IMAGE_BYTES && quality > MIN_WEBP_QUALITY) {
      quality = Math.max(MIN_WEBP_QUALITY, quality - WEBP_QUALITY_STEP);
      compressedBlob = await canvasToBlob(canvas, "image/webp", quality);
    }

    if (!compressedBlob) {
      return {
        file,
        originalFileSize,
        optimizedFileSize: originalFileSize,
        wasCompressed: false,
      };
    }

    if (!shouldResize && compressedBlob.size >= originalFileSize * 0.92) {
      return {
        file,
        originalFileSize,
        optimizedFileSize: originalFileSize,
        wasCompressed: false,
      };
    }

    const compressedFile = new File([compressedBlob], buildCompressedFileName(file.name), {
      type: "image/webp",
      lastModified: Date.now(),
    });

    return {
      file: compressedFile,
      originalFileSize,
      optimizedFileSize: compressedFile.size,
      wasCompressed: true,
    };
  } catch {
    return {
      file,
      originalFileSize,
      optimizedFileSize: originalFileSize,
      wasCompressed: false,
    };
  }
}

export function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)}KB`;
  }

  return `${bytes}B`;
}
