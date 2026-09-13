/**
 * ย่อรูปในเบราว์เซอร์ก่อนอัปขึ้น S3
 *
 * เหตุผล: ไฟล์ต้นฉบับของงานสต็อกมักหนัก 15-25 MB ต่อรูป
 * ถ้าอัปขึ้น S3 ทั้งก้อน 1,000 รูปจะกินพื้นที่ราว 20 GB และช้ามาก
 * ส่วนโมเดล vision อ่านที่ความละเอียดประมาณนี้ก็พอแล้ว
 * ไฟล์ต้นฉบับยังอยู่ในเครื่องคุณ ใช้อัปเข้า Adobe Stock ตามปกติ
 */
import i18n from "@/config/i18n";

export const PREVIEW_MAX_EDGE = 1600;
export const PREVIEW_QUALITY = 0.85;
export const PREVIEW_CONTENT_TYPE = "image/webp";

export type ProcessedImage = {
  /** รูปที่ย่อแล้ว ใช้ทั้งอัปขึ้น S3 และแสดงตัวอย่าง */
  blob: Blob;
  contentType: string;
  /** ขนาดของไฟล์ต้นฉบับ ไม่ใช่ของรูปที่ย่อ */
  width: number;
  height: number;
};

/** ย่อให้ด้านยาวสุดไม่เกิน PREVIEW_MAX_EDGE โดยคงอัตราส่วนเดิม */
function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function processImage(file: File): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);

  try {
    const target = fitWithin(bitmap.width, bitmap.height, PREVIEW_MAX_EDGE);

    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error(i18n.t("errors.canvasUnsupported"));
    }
    context.drawImage(bitmap, 0, 0, target.width, target.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, PREVIEW_CONTENT_TYPE, PREVIEW_QUALITY),
    );
    if (!blob) {
      throw new Error(i18n.t("errors.imageConvertFailed"));
    }

    return {
      blob,
      contentType: PREVIEW_CONTENT_TYPE,
      width: bitmap.width,
      height: bitmap.height,
    };
  } finally {
    bitmap.close();
  }
}
