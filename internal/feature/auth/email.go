package auth

import "github.com/clerk/clerk-sdk-go/v2"

// primaryEmail หาอีเมลหลักจากรายการอีเมลทั้งหมดของผู้ใช้
//
// Clerk ให้มาเป็นรายการ พร้อมบอกแยกว่า id ไหนคืออันหลัก
// ผู้ใช้ที่สมัครด้วยเบอร์โทรอย่างเดียวจะไม่มีอีเมลเลย จึงคืน nil ได้
func primaryEmail(user *clerk.User) *string {
	if user.PrimaryEmailAddressID == nil {
		return nil
	}

	for _, address := range user.EmailAddresses {
		if address != nil && address.ID == *user.PrimaryEmailAddressID {
			return &address.EmailAddress
		}
	}
	return nil
}
