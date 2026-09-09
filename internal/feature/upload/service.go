package upload

import (
	"context"

	"github.com/eezy-tech/one-stocks/server/internal/shared/apperr"
	"github.com/eezy-tech/one-stocks/server/internal/shared/config"
)

type Service interface {
	Presign(ctx context.Context, userID string, req PresignRequest) (PresignResponse, error)
}

type service struct {
	cfg config.R2
}

func NewService(cfg config.R2) Service {
	return &service{cfg: cfg}
}

func (s *service) Presign(_ context.Context, _ string, _ PresignRequest) (PresignResponse, error) {
	// TODO: ใช้ aws-sdk-go-v2 (s3 + s3/presign) ชี้ endpoint ไปที่
	// https://<AccountID>.r2.cloudflarestorage.com แล้วออก presigned PUT
	// ตั้ง key เป็น "previews/<userID>/<uuid>.webp" เพื่อกันไฟล์ชนกันข้ามผู้ใช้
	//
	// ยังตอบ 501 อยู่เพราะออกลิงก์ปลอมไม่ได้ — ต้องมีคีย์ R2 จริงถึงจะเซ็นได้
	return PresignResponse{}, apperr.NotImplemented("ยังไม่ได้ต่อ R2 สำหรับออกลิงก์อัปโหลด")
}
