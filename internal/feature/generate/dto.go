// Package generate เรียกโมเดลเพื่อสร้าง title/description/keywords ให้รูปหนึ่งรูป
package generate

// Request รับแค่ตำแหน่งรูปบน R2 ไม่รับตัวรูป
//
// เวอร์ชัน Next.js เดิมอัปรูปสองรอบ (ขึ้น R2 หนึ่งครั้ง แล้วแนบมากับ
// request อีกครั้ง) แบบนี้ให้เซิร์ฟเวอร์ไปดึงจาก R2 เอง ผู้ใช้รอครึ่งเดียว
// ปริมาณที่วิ่งผ่าน EC2 ลดครึ่ง และ R2 ไม่คิดค่า egress ขาออก
type Request struct {
	PreviewKey  string   `json:"previewKey"`
	Filename    string   `json:"filename"`
	PlatformIds []string `json:"platformIds"`
}

// Translation คือผลลัพธ์ฉบับแปลหนึ่งภาษา
// ไม่มี category เพราะ Adobe รับเป็นอังกฤษเท่านั้น
type Translation struct {
	Language    string   `json:"language"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Keywords    []string `json:"keywords"`
}

// Response ต้องมีฟิลด์ตรงกับ GenerateResponse
// ใน client/one-stock/src/lib/api/generate.ts
type Response struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Keywords    []string `json:"keywords"`
	Category    string   `json:"category"`
	// ฉบับแปลตามภาษาที่ผู้ใช้เลือกไว้ในหน้า Settings
	Translations []Translation `json:"translations,omitempty"`
	// สิ่งที่ตัวกรองแก้ไขหลังโมเดลตอบ เช่น ตัดชื่อแบรนด์ออก
	Notes []string `json:"notes,omitempty"`
}
