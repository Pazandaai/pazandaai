interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

interface CompressResult {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Rasm yuklanmadi"));
    img.src = src;
  });
}

function calculateDimensions(
  srcW: number,
  srcH: number,
  maxW: number,
  maxH: number,
): { width: number; height: number } {
  if (srcW <= maxW && srcH <= maxH) {
    return { width: srcW, height: srcH };
  }

  const ratio = Math.min(maxW / srcW, maxH / srcH);

  return {
    width: Math.round(srcW * ratio),
    height: Math.round(srcH * ratio),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas blob yaratilmadi"));
      },
      mimeType,
      quality,
    );
  });
}

export async function compressImage(
  file: Blob,
  options: CompressOptions = {},
): Promise<CompressResult> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.85,
    mimeType = "image/jpeg",
  } = options;

  const originalSize = file.size;
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);

    const { width, height } = calculateDimensions(
      image.width,
      image.height,
      maxWidth,
      maxHeight,
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context mavjud emas");

    // JPEG uchun oq fon (shaffof joylar qora bo'lib ketmasligi uchun)
    if (mimeType === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, width, height);

    const compressedBlob = await canvasToBlob(canvas, mimeType, quality);

    // Agar siqilgan versiya aslidan katta bo'lsa, aslini qaytar
    if (compressedBlob.size >= originalSize) {
      return {
        blob: file,
        width: image.width,
        height: image.height,
        originalSize,
        compressedSize: originalSize,
      };
    }

    return {
      blob: compressedBlob,
      width,
      height,
      originalSize,
      compressedSize: compressedBlob.size,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
