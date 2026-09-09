// Package middleware รวม middleware ที่หลาย feature ใช้ร่วมกัน
package middleware

import (
	"log/slog"
	"strings"

	"github.com/gofiber/fiber/v3"

	"github.com/eezy-tech/one-stocks/server/internal/shared/apperr"
	"github.com/eezy-tech/one-stocks/server/internal/shared/clerkauth"
	"github.com/eezy-tech/one-stocks/server/internal/shared/config"
)

// คีย์ของ userID ใน Locals ใช้ชนิดเฉพาะกันชนกับคีย์ของแพ็กเกจอื่น
type contextKey string

const userIDKey contextKey = "userID"

// DevUserID คือผู้ใช้สมมติตอนเปิด AUTH_DEV_BYPASS
const DevUserID = "dev-user"

// RequireAuth กันไม่ให้เรียกเส้นที่ต้องล็อกอินโดยไม่มี token ที่ถูกต้อง
//
// ระหว่างพัฒนาให้เปิด AUTH_DEV_BYPASS=true แล้วทุกคำขอจะถูกนับเป็น
// ผู้ใช้สมมติ — ต้องเปิดเองแบบตั้งใจ ไม่ใช่เดาจากการที่คีย์ยังว่าง
// เพราะกติกาแบบนั้นทำให้ลืมตั้งคีย์แล้ว auth ถูกปิดเงียบ ๆ โดยไม่มีใครรู้
// (config.Load ไม่ยอมให้เปิดแฟล็กนี้ตอน APP_ENV=production)
func RequireAuth(cfg config.Config, verifier *clerkauth.Verifier) fiber.Handler {
	devBypass := cfg.IsDev() && cfg.AuthDevBypass

	return func(c fiber.Ctx) error {
		if devBypass {
			c.Locals(userIDKey, DevUserID)
			return c.Next()
		}

		token := bearerToken(c)
		if token == "" {
			return apperr.Unauthorized("ต้องเข้าสู่ระบบก่อน")
		}

		userID, err := verifier.VerifyToken(c.Context(), token)
		if err != nil {
			// เหตุผลจริงเก็บไว้ใน log อย่างเดียว ไม่บอกผู้เรียก
			// ไม่งั้นกลายเป็นบอกใบ้ให้คนเดา token ว่าพลาดตรงไหน
			slog.Warn("ตรวจ token ไม่ผ่าน", "path", c.Path(), "error", err)
			return apperr.Unauthorized("เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่")
		}

		c.Locals(userIDKey, userID)
		return c.Next()
	}
}

// UserID อ่านเจ้าของคำขอที่ RequireAuth ใส่ไว้
// เส้นที่ผ่าน RequireAuth มาแล้วเท่านั้นถึงจะได้ค่าไม่ว่าง
func UserID(c fiber.Ctx) string {
	return fiber.Locals[string](c, userIDKey)
}

func bearerToken(c fiber.Ctx) string {
	header := c.Get(fiber.HeaderAuthorization)
	if len(header) < 7 || !strings.EqualFold(header[:7], "bearer ") {
		return ""
	}
	return strings.TrimSpace(header[7:])
}
