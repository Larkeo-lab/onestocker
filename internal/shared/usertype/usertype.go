// Package usertype เก็บระดับแพ็กเกจของผู้ใช้ไว้ที่เดียว
//
// อยู่ใน shared ไม่ใช่ใน feature/auth เพราะฟีเจอร์อื่นต้องใช้ตัดสินโควตา
// ด้วย เช่น generate ที่จะจำกัดจำนวนรูปต่อเดือนตามระดับ
//
// ค่าต้องตรงกันสามที่:
//   - constraint profiles_user_type_check (migrations/0005_profiles_user_type.sql)
//   - USER_TYPES ใน client/one-stock/src/types/profile.ts
//   - ที่นี่
package usertype

import "fmt"

// Type คือระดับแพ็กเกจของผู้ใช้หนึ่งคน
type Type string

const (
	Free  Type = "FREE"
	Plus  Type = "PLUS"
	Pro   Type = "PRO"
	Ultra Type = "ULTRA"
)

// Default คือระดับที่ผู้ใช้ได้ทันทีที่สมัคร ต้องตรงกับ default ของคอลัมน์
const Default = Free

// All เรียงจากระดับต่ำสุดไปสูงสุด ลำดับนี้ใช้เทียบระดับกันได้ด้วย
var All = []Type{Free, Plus, Pro, Ultra}

// Valid บอกว่าเป็นค่าที่รู้จักไหม
//
// ค่าที่อ่านจากฐานข้อมูลผ่าน check constraint มาแล้วจึงไม่ต้องเช็คซ้ำ
// ตัวนี้มีไว้สำหรับค่าที่มาจากข้างนอก เช่น body ของคำขอฝั่ง admin
func (t Type) Valid() bool {
	for _, known := range All {
		if t == known {
			return true
		}
	}
	return false
}

func (t Type) String() string { return string(t) }

// Parse แปลงข้อความเป็นระดับ ปฏิเสธค่าที่ไม่รู้จัก
//
// ไม่แปลงตัวพิมพ์เล็กให้โดยอัตโนมัติ เพราะค่าที่เก็บจริงเป็นตัวพิมพ์ใหญ่ล้วน
// การรับ "free" ได้ด้วยจะทำให้ค่าที่ส่งมาผิดรูปแบบหลุดผ่านไปโดยไม่มีใครรู้
func Parse(s string) (Type, error) {
	t := Type(s)
	if !t.Valid() {
		return "", fmt.Errorf("ระดับผู้ใช้ %q ไม่ถูกต้อง", s)
	}
	return t, nil
}
