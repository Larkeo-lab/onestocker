package auth

import (
	"context"
	"log/slog"
	"strings"

	clerkuser "github.com/clerk/clerk-sdk-go/v2/user"

	"github.com/eezy-tech/one-stocks/server/internal/shared/apperr"
	"github.com/eezy-tech/one-stocks/server/internal/shared/usertype"
	"github.com/eezy-tech/one-stocks/server/internal/shared/util"
)

/** ขนาดรูปโปรไฟล์ที่ขอจาก Gravatar */
const avatarSize = 128

type Service interface {
	// Me คืนโปรไฟล์ของเจ้าของ token ที่ผ่าน middleware เข้ามาแล้ว
	Me(ctx context.Context, userID string) (Profile, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) Me(ctx context.Context, userID string) (Profile, error) {
	if userID == "" {
		return Profile{}, apperr.Unauthorized("authentication required")
	}

	// ผู้ใช้สมมติตอน AUTH_DEV_BYPASS ไม่มีตัวตนอยู่บน Clerk
	// ถ้าไปถามจะได้ 404 กลับมา จึงตอบโปรไฟล์เปล่าไปเลย
	// (id จริงของ Clerk ขึ้นต้นด้วย user_ เสมอ จึงไม่ชนกัน)
	if !strings.HasPrefix(userID, "user_") {
		return Profile{
			UserID:    userID,
			FirstName: util.Ptr("Dev"),
			LastName:  util.Ptr("User"),
			UserType:  usertype.Default,
		}, nil
	}

	found, err := clerkuser.Get(ctx, userID)
	if err != nil {
		slog.Error("failed to fetch Clerk profile", "userID", userID, "error", err)
		return Profile{}, apperr.Internal("failed to fetch user profile", err)
	}

	email := primaryEmail(found)

	profile := Profile{
		UserID:    found.ID,
		FirstName: found.FirstName,
		LastName:  found.LastName,
		Email:     email,
		// Clerk ไม่รู้จักระดับแพ็กเกจ ค่าจริงมาจากแถวที่ Upsert คืนกลับมา
		// ตั้ง Default ไว้เผื่อกรณีเขียนฐานข้อมูลไม่สำเร็จด้านล่าง
		// จะได้ไม่ส่งค่าว่างให้หน้าเว็บ
		UserType: usertype.Default,
	}

	// ถ้าผู้ใช้อัปรูปไว้ใน Clerk ใช้รูปนั้น ไม่งั้นดึงจากอีเมลผ่าน Gravatar
	switch {
	case found.HasImage && found.ImageURL != nil:
		profile.ProfileURL = found.ImageURL
	case email != nil:
		profile.ProfileURL = util.Ptr(gravatarURL(*email, avatarSize))
	}

	// เก็บสำเนาไว้ฝั่งเรา เพื่อให้ join กับตารางอื่นได้โดยไม่ต้องถาม Clerk ทุกครั้ง
	//
	// ตั้งใจให้ล้มเหลวแบบไม่ขัดจังหวะ — ถ้าเขียนไม่ลง ยังคืนค่าจาก Clerk
	// ให้หน้าเว็บใช้งานต่อได้ ดีกว่าทำให้ทั้งหน้าเปิดไม่ขึ้นเพราะเรื่องนี้
	saved, err := s.repo.Upsert(ctx, profile)
	if err != nil {
		slog.Warn("บันทึกโปรไฟล์ลงฐานข้อมูลไม่สำเร็จ", "userID", userID, "error", err)
		return profile, nil
	}
	return saved, nil
}
