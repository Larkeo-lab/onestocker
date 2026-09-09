package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
)

/*
URL รูปโปรไฟล์จากอีเมล ผ่าน Gravatar

Gravatar ผูกรูปกับอีเมลโดยใช้ค่า hash ของอีเมล ไม่ได้ส่งอีเมลออกไปตรง ๆ
d=mp คือรูปแทนคนทั่วไป ใช้เมื่ออีเมลนั้นยังไม่เคยตั้งรูปไว้
*/
func gravatarURL(email string, size int) string {
	sum := sha256.Sum256([]byte(strings.ToLower(strings.TrimSpace(email))))
	return fmt.Sprintf(
		"https://www.gravatar.com/avatar/%s?s=%d&d=mp",
		hex.EncodeToString(sum[:]),
		size,
	)
}
