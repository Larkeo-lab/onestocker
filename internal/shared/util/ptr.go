// Package util รวมฟังก์ชันเล็ก ๆ ที่ไม่ผูกกับ feature ไหนเป็นพิเศษ
package util

// Ptr คืน pointer ของค่าที่ส่งเข้ามา
//
// จำเป็นเพราะ Go เขียน &"ข้อความ" ตรง ๆ ไม่ได้ แต่ DTO หลายตัวใช้
// *string เพื่อให้ออกมาเป็น null ใน JSON เวลาไม่มีค่า
func Ptr[T any](value T) *T {
	return &value
}

// Deref อ่านค่าจาก pointer ถ้าเป็น nil ให้ใช้ค่าสำรองแทน
func Deref[T any](p *T, fallback T) T {
	if p == nil {
		return fallback
	}
	return *p
}

// NilIfEmpty คืน nil เมื่อข้อความว่าง
// ใช้ตอนแปลงค่าลงคอลัมน์ที่เป็น NULL ได้ จะได้ไม่เก็บสตริงว่างปนกับ NULL
func NilIfEmpty(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
