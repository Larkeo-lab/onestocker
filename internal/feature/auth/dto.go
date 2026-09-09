// Package auth ดูแลตัวตนของผู้ใช้ที่เรียก API เข้ามา
//
// การล็อกอินจริงเกิดที่ Clerk บนหน้าเว็บ ฝั่งนี้มีหน้าที่ตรวจ token
// (ดู internal/middleware/auth.go) แล้วบอกว่าคนที่ถือ token คือใคร
//
// ยังไม่มีไฟล์ validation.go เพราะยังไม่มี request ที่ต้องตรวจ
// จะเพิ่มตอนรับ webhook จาก Clerk ซึ่งต้องตรวจลายเซ็นของ payload
package auth

// Profile ต้องมีฟิลด์ตรงกับ Profile ใน client/one-stock/src/types/profile.ts
//
// ไม่มีฟิลด์รหัสผ่านโดยตั้งใจ — Clerk เป็นผู้เก็บและ hash ให้
type Profile struct {
	UserID    string  `json:"userId"`
	FirstName *string `json:"firstName"`
	LastName  *string `json:"lastName"`
	Email     *string `json:"email"`
	// รูปที่อัปไว้ใน Clerk ถ้ามี ไม่งั้นเป็น Gravatar ที่อิงอีเมล
	ProfileURL *string `json:"profileUrl"`
}
