// Package upload ออกลิงก์ให้เบราว์เซอร์อัปรูปย่อขึ้น R2 ได้โดยตรง
//
// ไฟล์ไม่วิ่งผ่านเซิร์ฟเวอร์นี้เลย ประหยัดทั้งแบนด์วิดท์และหน่วยความจำ
// ของ EC2 เครื่องเล็ก ส่วนไฟล์ต้นฉบับไม่เคยออกจากเครื่องผู้ใช้
package upload

type Item struct {
	Filename    string `json:"filename"`
	ContentType string `json:"contentType"`
}

type PresignRequest struct {
	Items []Item `json:"items"`
}

type Presigned struct {
	// ตำแหน่งไฟล์บน R2 ฝั่งหน้าเว็บส่งค่านี้กลับมาตอนเรียก generate
	Key string `json:"key"`
	// URL ที่ PUT ไฟล์ขึ้นได้โดยตรง มีวันหมดอายุ
	URL string `json:"url"`
}

type PresignResponse struct {
	Uploads []Presigned `json:"uploads"`
}
