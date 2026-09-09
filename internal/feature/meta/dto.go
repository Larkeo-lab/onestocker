// Package meta บอกค่าคงที่ของระบบให้หน้าเว็บรู้
//
// มีไว้เพื่อไม่ให้ค่าอย่างเพดานจำนวนรูปถูกเขียนซ้ำสองที่
// ถ้าฝั่งหน้าเว็บฮาร์ดโค้ด 30 ไว้เอง วันที่เซิร์ฟเวอร์เปลี่ยนเป็น 50
// ผู้ใช้จะยังอัปได้แค่ 30 โดยไม่มีใครรู้ว่าทำไม
package meta

type Meta struct {
	// ชื่อผู้ให้บริการโมเดลที่เซิร์ฟเวอร์ตั้งไว้ เช่น "gemini"
	Provider string `json:"provider"`
	Model    string `json:"model"`
	// จำนวนรูปสูงสุดต่อหนึ่งรอบ
	MaxAssets int `json:"maxAssets"`
	// จำนวน keyword สูงสุดที่ Adobe Stock รับ
	KeywordsMax int `json:"keywordsMax"`
	// ภาษาที่เลือกได้ในหน้า Settings
	Languages []Language `json:"languages"`
}

type Language struct {
	Code   string `json:"code"`
	Name   string `json:"name"`
	Native string `json:"native"`
	// true = ปิดไม่ได้ ต้องออกภาษานี้เสมอ
	Primary bool `json:"primary"`
}
