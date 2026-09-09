package upload

import ozzo "github.com/go-ozzo/ozzo-validation/v4"

// MaxItemsPerRequest ต้องตรงกับที่ GET /meta บอกหน้าเว็บ
//
// หน้าเว็บขอลิงก์ทั้งชุดในคำขอเดียว เพดานนี้จึงเป็นเพดานของทั้งรอบ
const MaxItemsPerRequest = 30

// ชนิดไฟล์ที่รับ ต้องเป็นชนิดที่เบราว์เซอร์ย่อออกมาได้จริง
var allowedContentTypes = []any{"image/webp", "image/jpeg", "image/png"}

func (i Item) Validate() error {
	return ozzo.ValidateStruct(&i,
		ozzo.Field(&i.Filename,
			ozzo.Required.Error("ต้องระบุ"),
			ozzo.Length(1, 255).Error("ยาวเกิน 255 ตัวอักษร"),
		),
		ozzo.Field(&i.ContentType,
			ozzo.Required.Error("ต้องระบุ"),
			ozzo.In(allowedContentTypes...).Error("รองรับเฉพาะ webp, jpeg และ png"),
		),
	)
}

// Validate ตรวจจำนวนไฟล์ ส่วนรายละเอียดของแต่ละไฟล์ ozzo เรียก
// Item.Validate ให้เองเพราะ Item ทำ interface Validatable ไว้
func (r PresignRequest) Validate() error {
	return ozzo.ValidateStruct(&r,
		ozzo.Field(&r.Items,
			ozzo.Required.Error("ต้องมีอย่างน้อยหนึ่งไฟล์"),
			ozzo.Length(1, MaxItemsPerRequest).Error("ขอได้ครั้งละไม่เกิน 30 ไฟล์"),
		),
	)
}
