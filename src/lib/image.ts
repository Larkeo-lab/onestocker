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

/**
 * ใช้แทนเมื่อเบราว์เซอร์ย่อเป็น webp ไม่ได้ (Safari รุ่นเก่า)
 *
 * canvas จะถอยไปใช้ PNG ให้เองโดยไม่บอก ซึ่งไฟล์ใหญ่กว่าหลายเท่าและอัปช้ามากบนมือถือ
 * จึงสั่งเป็น JPEG เองดีกว่า และต้องส่งชนิดจริงไปขอลิงก์อัป ไม่งั้น R2 ปฏิเสธด้วย 403
 */
export const FALLBACK_CONTENT_TYPE = "image/jpeg";

/**
 * สีที่เทลงไปใต้รูปก่อนวาด แทนส่วนที่โปร่งใส
 *
 * PNG ที่ตัดพื้นหลังออกแล้วมีช่อง alpha ซึ่งโมเดลมองเห็นเป็นสีดำ (ช่อง alpha ถูกทิ้ง
 * ตอนแปลงเป็น RGB) คีย์เวิร์ดที่ได้จึงเป็น "black background" ทุกรูป ทั้งที่ควรเป็นขาว
 * และถ้าเบราว์เซอร์ถอยไปใช้ JPEG ซึ่งเก็บความโปร่งใสไม่ได้ ก็ได้พื้นดำเหมือนกัน
 *
 * ใช้สีขาวเพราะเป็นสิ่งที่เว็บสต็อกคาดหวังจากภาพตัดพื้นหลัง — prompt ฝั่งเซิร์ฟเวอร์
 * สั่งให้เขียนว่า "isolated on white background" อยู่แล้ว (ดู server/internal/feature/generate/prompt.go)
 *
 * มีผลเฉพาะรูปย่อที่ส่งให้โมเดลดูและที่แสดงในหน้าประวัติ
 * ไฟล์ต้นฉบับที่ลูกค้าเอาไปส่งเข้าเว็บสต็อกจริงยังโปร่งใสเหมือนเดิม ไม่ถูกแตะเลย
 */
const PREVIEW_BACKGROUND = "#ffffff";

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

/**
 * ย่อภาพจากแหล่งใดก็ได้ที่วาดลง canvas ได้ แล้วแปลงเป็น webp
 *
 * ใช้ร่วมกันทั้งรูปและเฟรมจากวิดีโอ ขนาดต้นทางต้องส่งมาเอง
 * เพราะ <video> บอกขนาดผ่าน videoWidth ไม่ใช่ width เหมือนรูป
 */
export async function drawToBlob(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxEdge: number,
): Promise<Blob> {
  const target = fitWithin(sourceWidth, sourceHeight, maxEdge);

  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error(i18n.t("errors.canvasUnsupported"));
  }
  context.fillStyle = PREVIEW_BACKGROUND;
  context.fillRect(0, 0, target.width, target.height);
  context.drawImage(source, 0, 0, target.width, target.height);

  const blob = await encode(canvas, PREVIEW_CONTENT_TYPE);
  // toBlob คืน PNG เงียบ ๆ เมื่อไม่รองรับชนิดที่ขอ ดูจาก type ของผลลัพธ์เท่านั้นถึงจะรู้
  if (blob.type === PREVIEW_CONTENT_TYPE) return blob;
  return encode(canvas, FALLBACK_CONTENT_TYPE);
}

async function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, PREVIEW_QUALITY),
  );
  if (!blob) {
    throw new Error(i18n.t("errors.imageConvertFailed"));
  }
  return blob;
}

export async function processImage(file: File): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);

  try {
    const blob = await drawToBlob(
      bitmap,
      bitmap.width,
      bitmap.height,
      PREVIEW_MAX_EDGE,
    );

    return {
      // ชนิดจริงที่ได้ ไม่ใช่ชนิดที่ขอไป เบราว์เซอร์บางรุ่นให้ JPEG แทน
      blob,
      contentType: blob.type,
      width: bitmap.width,
      height: bitmap.height,
    };
  } finally {
    bitmap.close();
  }
}
