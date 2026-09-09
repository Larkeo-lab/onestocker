package generate

import (
	ozzo "github.com/go-ozzo/ozzo-validation/v4"

	"github.com/eezy-tech/one-stocks/server/internal/shared/storage"
)

// KeywordsMax คือเพดานของ Adobe Stock ยืนยันจาก CSV template ทางการ
const KeywordsMax = 50

// TitleMax คือความยาว title สูงสุดที่ Adobe Stock รับ
const TitleMax = 200

// DescriptionMax คือความยาวคำอธิบายสูงสุด
const DescriptionMax = 200

// ownsPreviewKey เช็คว่า key ที่ส่งมาเป็นของผู้ใช้คนนี้จริง
//
// จำเป็นเพราะ previewKey มาจากฝั่งหน้าเว็บ ถ้าไม่เช็ค ผู้ใช้คนหนึ่ง
// เดา key ของอีกคนแล้วสั่งอ่านรูปนั้นได้ ทั้งที่ไม่ใช่ของตัวเอง
//
// รูปแบบคือ <user id>/<ชื่อไฟล์>.webp ซึ่งเป็นรูปแบบเดียวกับที่ my-app ใช้
// ห้ามเปลี่ยน ไม่งั้นรูปเก่าที่ย้ายข้อมูลมาจะเข้าถึงไม่ได้
func ownsPreviewKey(key, userID string) bool {
	return storage.OwnedBy(key, userID)
}

func (r Request) Validate() error {
	return ozzo.ValidateStruct(&r,
		ozzo.Field(&r.PreviewKey,
			ozzo.Required.Error("is required"),
			ozzo.Length(1, 500).Error("must be between 1 and 500 characters"),
		),
		ozzo.Field(&r.Filename,
			ozzo.Required.Error("is required"),
			ozzo.Length(1, 255).Error("must be between 1 and 255 characters"),
		),
	)
}
