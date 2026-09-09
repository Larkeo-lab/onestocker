// Package config อ่านค่าตั้งต้นของแอปจาก environment ที่เดียว
// ห้ามเรียก os.Getenv จากที่อื่น จะได้รู้ว่าแอปต้องการตัวแปรอะไรบ้าง
package config

import (
	"errors"
	"fmt"
	"log/slog"
	"strings"
)

type R2 struct {
	AccountID       string
	AccessKeyID     string
	SecretAccessKey string
	Bucket          string
	// อายุของ presigned URL หน่วยเป็นวินาที
	PresignTTLSeconds int
}

type Config struct {
	AppEnv string
	Port   string
	// โดเมนของหน้าเว็บที่ยิงเข้ามาได้ (React ฝั่งลูกค้า และฝั่งแอดมิน)
	AllowedOrigins []string

	DatabaseURL    string
	ClerkSecretKey string
	// ข้ามการตรวจ token แล้วนับทุกคำขอเป็นผู้ใช้สมมติ
	// ต้องเปิดเองด้วย AUTH_DEV_BYPASS=true และเปิดบน production ไม่ได้
	AuthDevBypass bool
	// userID ที่จะใช้ตอนเปิด AuthDevBypass
	// ใส่ Clerk user id จริงเพื่อพัฒนากับข้อมูลของบัญชีนั้นบนเครื่องได้
	AuthDevUserID string

	GeminiAPIKey string
	GeminiModel  string

	R2 R2
}

func (c Config) IsDev() bool { return c.AppEnv != "production" }

// Load อ่านค่าทั้งหมด แล้วรวมข้อผิดพลาดที่เจอเป็นก้อนเดียว
// ตอน dev ยอมให้ค่าที่ยังไม่ได้ใช้ว่างไว้ได้ แต่ตอน production ต้องครบ
func Load() (Config, error) {
	cfg := Config{
		AppEnv:         env("APP_ENV", "development"),
		Port:           env("PORT", "8080"),
		AllowedOrigins: list("ALLOWED_ORIGINS", "http://localhost:5173"),

		DatabaseURL:    env("DATABASE_URL", ""),
		ClerkSecretKey: env("CLERK_SECRET_KEY", ""),
		AuthDevBypass:  boolean("AUTH_DEV_BYPASS", false),
		AuthDevUserID:  env("AUTH_DEV_USER_ID", "dev-user"),

		GeminiAPIKey: env("GEMINI_API_KEY", ""),
		GeminiModel:  env("GEMINI_MODEL", "gemini-3.5-flash-lite"),

		R2: R2{
			AccountID:         env("R2_ACCOUNT_ID", ""),
			AccessKeyID:       env("R2_ACCESS_KEY_ID", ""),
			SecretAccessKey:   env("R2_SECRET_ACCESS_KEY", ""),
			Bucket:            env("R2_BUCKET", ""),
			PresignTTLSeconds: number("R2_PRESIGN_TTL_SECONDS", 900),
		},
	}

	// แอปทำงานไม่ได้เลยถ้าไม่มีฐานข้อมูล จึงบังคับทุกสภาพแวดล้อม
	// ไม่งั้นจะไปพังตอน Ping ด้วยข้อความที่ไม่บอกว่าลืมตั้งตัวแปร
	if cfg.DatabaseURL == "" {
		return cfg, errors.New("ไม่พบตัวแปร environment: DATABASE_URL")
	}

	if cfg.IsDev() {
		return cfg, cfg.warnOnMismatchedClerkKey()
	}

	// ถึงตรงนี้แปลว่า APP_ENV=production — ห้ามข้ามการตรวจสิทธิ์เด็ดขาด
	// ตายตั้งแต่สตาร์ทดีกว่าเปิดให้ทุกคนเข้าถึงข้อมูลของกันและกัน
	if cfg.AuthDevBypass {
		return cfg, errors.New("เปิด AUTH_DEV_BYPASS บน production ไม่ได้")
	}

	// ตอน production ขาดตัวไหนให้ตายตั้งแต่ตอนสตาร์ท
	// ดีกว่าไปพังตอนผู้ใช้กดปุ่มแล้วได้ 500 โดยไม่รู้สาเหตุ
	required := map[string]string{
		"CLERK_SECRET_KEY":     cfg.ClerkSecretKey,
		"GEMINI_API_KEY":       cfg.GeminiAPIKey,
		"R2_ACCOUNT_ID":        cfg.R2.AccountID,
		"R2_ACCESS_KEY_ID":     cfg.R2.AccessKeyID,
		"R2_SECRET_ACCESS_KEY": cfg.R2.SecretAccessKey,
		"R2_BUCKET":            cfg.R2.Bucket,
	}

	var missing []string
	for name, value := range required {
		if value == "" {
			missing = append(missing, name)
		}
	}
	if len(missing) > 0 {
		return cfg, fmt.Errorf("ไม่พบตัวแปร environment: %s", strings.Join(missing, ", "))
	}

	return cfg, nil
}

/*
warnOnMismatchedClerkKey เตือนเมื่อรันบนเครื่องด้วยคีย์ Clerk ของ production

Clerk แยก instance ระหว่าง development กับ production เป็นคนละฐานผู้ใช้
และคนละกุญแจเซ็น token — คีย์ต้องเข้าคู่กันทั้งสองฝั่ง

instance production ยังปฏิเสธคำขอที่มาจาก localhost ด้วย (400 Invalid HTTP Origin)
หน้าเว็บบนเครื่องจึงขอ token ไม่ได้เลย และต่อให้ขอได้จาก instance dev
เซิร์ฟเวอร์ก็จะตรวจลายเซ็นไม่ผ่านเพราะใช้กุญแจคนละดอก

อาการที่เห็นคือทุกคำขอได้ 401 โดยไม่มีอะไรบอกว่าเพราะอะไร
เตือนอย่างเดียวไม่ขัดจังหวะ เผื่อมีเหตุให้ตั้งแบบนี้จริง ๆ
*/
func (c Config) warnOnMismatchedClerkKey() error {
	if strings.HasPrefix(c.ClerkSecretKey, "sk_live_") && !c.AuthDevBypass {
		slog.Warn("APP_ENV เป็น development แต่ CLERK_SECRET_KEY เป็นคีย์ production " +
			"— หน้าเว็บบน localhost จะขอ token ไม่ได้ ทุกคำขอจะได้ 401 " +
			"ให้ใช้คีย์ sk_test_ ของ instance development แทน")
	}
	return nil
}
