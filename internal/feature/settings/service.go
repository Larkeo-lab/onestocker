package settings

import (
	"context"

	"github.com/eezy-tech/one-stocks/server/internal/shared/apperr"
)

// Service คือกฎของ feature นี้ ไม่รู้จัก HTTP เลย
// controller เป็นคนแปลง HTTP เข้าออก ส่วนที่นี่รับ-คืนแต่ข้อมูล
type Service interface {
	Get(ctx context.Context, userID string) (Settings, error)
	Save(ctx context.Context, userID string, in Settings) (Settings, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) Get(ctx context.Context, userID string) (Settings, error) {
	current, found, err := s.repo.Get(ctx, userID)
	if err != nil {
		return Settings{}, apperr.Internal("อ่านค่าตั้งต้นไม่สำเร็จ", err)
	}
	// ผู้ใช้ที่ยังไม่เคยบันทึก ให้ค่าเริ่มต้นไปใช้ก่อน
	if !found {
		return Default(), nil
	}
	return current, nil
}

func (s *service) Save(ctx context.Context, userID string, in Settings) (Settings, error) {
	// จัดรูปแบบก่อนบันทึก แล้วคืนค่าที่บันทึกจริงกลับไป
	// หน้าเว็บจะได้แสดงตรงกับสิ่งที่อยู่ในฐานข้อมูล ไม่ใช่สิ่งที่ผู้ใช้พิมพ์
	saved, err := s.repo.Upsert(ctx, userID, in.normalize())
	if err != nil {
		return Settings{}, apperr.Internal("บันทึกค่าตั้งต้นไม่สำเร็จ", err)
	}
	return saved, nil
}
