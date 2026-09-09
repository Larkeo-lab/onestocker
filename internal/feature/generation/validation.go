package generation

import ozzo "github.com/go-ozzo/ozzo-validation/v4"

// DefaultLimit คือจำนวนแถวต่อหน้าเมื่อผู้เรียกไม่ได้ระบุมา
//
// หน้า History โหลดรูปย่อทุกแถว แถวละราว 159 KB
// 30 แถวจึงราว 4.8 MB ต่อหน้า มากกว่านี้เริ่มรู้สึกช้าบนเน็ตบ้านเรา
const DefaultLimit = 30

const MaxLimit = 100

// Validate ถูกเรียกอัตโนมัติตอน c.Bind().Query() ผ่าน StructValidator
//
// ทั้งสองฟิลด์ไม่บังคับ ค่า 0 แปลว่าไม่ได้ส่งมา แล้วค่อยเติมใน applyDefaults
func (q ListQuery) Validate() error {
	return ozzo.ValidateStruct(&q,
		ozzo.Field(&q.Page, ozzo.Min(0).Error("must not be negative")),
		ozzo.Field(&q.Limit,
			ozzo.Min(0).Error("must not be negative"),
			ozzo.Max(MaxLimit).Error("must not exceed 100"),
		),
	)
}

// applyDefaults เติมค่าที่ผู้เรียกไม่ได้ส่งมา
// ทำหลังผ่าน validate แล้ว จึงมั่นใจได้ว่า Limit ไม่เกิน MaxLimit
func (q ListQuery) applyDefaults() ListQuery {
	if q.Page <= 0 {
		q.Page = 1
	}
	if q.Limit <= 0 {
		q.Limit = DefaultLimit
	}
	return q
}

// offset แปลงเลขหน้าเป็นตำแหน่งเริ่มต้นสำหรับ SQL OFFSET
func (q ListQuery) offset() int {
	return (q.Page - 1) * q.Limit
}
