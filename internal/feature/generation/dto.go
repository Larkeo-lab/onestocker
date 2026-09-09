// Package generation ดูแลประวัติ metadata ที่เคยสร้างไว้
package generation

import "time"

// Generation ต้องมีฟิลด์ตรงกับ GenerationWithPreview
// ใน client/one-stock/src/types/generation.ts
type Generation struct {
	ID       string `json:"id"`
	Filename string `json:"filename"`
	// ตำแหน่งรูปย่อบน R2
	PreviewKey  *string   `json:"previewKey"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Keywords    []string  `json:"keywords"`
	Category    *string   `json:"category"`
	Provider    *string   `json:"provider"`
	Model       *string   `json:"model"`
	CreatedAt   time.Time `json:"createdAt"`
	// ลิงก์ชั่วคราวสำหรับแสดงรูป สร้างใหม่ทุกครั้งที่เรียก เพราะมีวันหมดอายุ
	PreviewURL *string `json:"previewUrl"`
}

// ListQuery คือพารามิเตอร์ที่รับจาก query string
type ListQuery struct {
	Page  int `query:"page"  json:"page"`
	Limit int `query:"limit" json:"limit"`
}

// ListResult ส่งค่าที่ใช้จริงกลับมาด้วย (Page, Limit หลังเติมค่าเริ่มต้น)
// controller จะได้ตอบข้อมูลการแบ่งหน้าตรงกับที่ query จริง
type ListResult struct {
	Items []Generation
	Total int
	Page  int
	Limit int
}
