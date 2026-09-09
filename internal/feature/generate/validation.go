package generate

import (
	"strings"

	ozzo "github.com/go-ozzo/ozzo-validation/v4"
)

// KeywordsMax คือเพดานของ Adobe Stock ยืนยันจาก CSV template ทางการ
const KeywordsMax = 50

// TitleMax คือความยาว title สูงสุดที่ Adobe Stock รับ
const TitleMax = 200

// previewKeyPrefix กันไม่ให้ผู้ใช้ส่ง key ที่ชี้ไปนอกโฟลเดอร์รูปย่อ
const previewKeyPrefix = "previews/"

// ownsPreviewKey เช็คว่า key ที่ส่งมาเป็นของผู้ใช้คนนี้จริง
//
// จำเป็นเพราะ previewKey มาจากฝั่งหน้าเว็บ ถ้าไม่เช็ค ผู้ใช้คนหนึ่ง
// เดา key ของอีกคนแล้วสั่งอ่านรูปนั้นได้ ทั้งที่ไม่ใช่ของตัวเอง
func ownsPreviewKey(key, userID string) bool {
	if userID == "" || strings.Contains(key, "..") {
		return false
	}
	return strings.HasPrefix(key, previewKeyPrefix+userID+"/")
}

func (r Request) Validate() error {
	return ozzo.ValidateStruct(&r,
		ozzo.Field(&r.PreviewKey,
			ozzo.Required.Error("ต้องระบุ"),
			ozzo.Length(1, 500).Error("ยาวเกิน 500 ตัวอักษร"),
		),
		ozzo.Field(&r.Filename,
			ozzo.Required.Error("ต้องระบุ"),
			ozzo.Length(1, 255).Error("ยาวเกิน 255 ตัวอักษร"),
		),
	)
}
