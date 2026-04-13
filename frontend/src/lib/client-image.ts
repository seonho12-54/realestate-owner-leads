const COMPRESSIBLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSION_TO_CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

const MAX_IMAGE_EDGE = 1280;
const MIN_IMAGE_EDGE = 960;
const TARGET_IMAGE_BYTES = 650_000;
const INITIAL_WEBP_QUALITY = 0.76;
const MIN_WEBP_QUALITY = 0.5;
const WEBP_QUALITY_STEP = 0.08;
const RESIZE_STEP_RATIO = 0.85;

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

function getNextScaledDimensions(width: number, height: number) {
  if (Math.max(width, height) <= MIN_IMAGE_EDGE) {
    return { width, height };
  }

  const nextWidth = Math.max(1, Math.round(width * RESIZE_STEP_RATIO));
  const nextHeight = Math.max(1, Math.round(height * RESIZE_STEP_RATIO));
  const longestEdge = Math.max(nextWidth, nextHeight);

  if (longestEdge < MIN_IMAGE_EDGE) {
    const scale = MIN_IMAGE_EDGE / longestEdge;
    return {
      width: Math.max(1, Math.round(nextWidth * scale)),
      height: Math.max(1, Math.round(nextHeight * scale)),
    };
  }

  return {
    width: nextWidth,
    height: nextHeight,
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
      reject(new Error("이미지 파일을 열지 못했습니다."));
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

function drawImageToCanvas(canvas: HTMLCanvasElement, image: HTMLImageElement, width: number, height: number) {
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("이미지 압축용 캔버스를 만들지 못했습니다.");
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
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
    let currentWidth = width;
    let currentHeight = height;
    let quality = INITIAL_WEBP_QUALITY;

    drawImageToCanvas(canvas, image, currentWidth, currentHeight);

    let compressedBlob = await canvasToBlob(canvas, "image/webp", quality);

    while (compressedBlob && compressedBlob.size > TARGET_IMAGE_BYTES) {
      if (quality > MIN_WEBP_QUALITY) {
        quality = Math.max(MIN_WEBP_QUALITY, quality - WEBP_QUALITY_STEP);
        compressedBlob = await canvasToBlob(canvas, "image/webp", quality);
        continue;
      }

      const nextDimensions = getNextScaledDimensions(currentWidth, currentHeight);
      if (nextDimensions.width === currentWidth && nextDimensions.height === currentHeight) {
        break;
      }

      currentWidth = nextDimensions.width;
      currentHeight = nextDimensions.height;
      quality = INITIAL_WEBP_QUALITY;
      drawImageToCanvas(canvas, image, currentWidth, currentHeight);
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

    if (!shouldResize && compressedBlob.size >= originalFileSize * 0.98) {
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

export function resolveUploadFailureMessage(error: unknown, fallbackMessage = "사진 업로드에 실패했습니다.") {
  if (error instanceof TypeError && /failed to fetch/i.test(error.message)) {
    return "사진 업로드에 실패했습니다. 현재 도메인에서 S3 업로드가 차단되고 있습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}
