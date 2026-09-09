package upload

import (
	"context"

	"github.com/eezy-tech/one-stocks/server/internal/shared/apperr"
	"github.com/eezy-tech/one-stocks/server/internal/shared/storage"
)

type Service interface {
	Presign(ctx context.Context, userID string, req PresignRequest) (PresignResponse, error)
}

type service struct {
	store storage.Storage
}

func NewService(store storage.Storage) Service {
	return &service{store: store}
}

func (s *service) Presign(ctx context.Context, userID string, req PresignRequest) (PresignResponse, error) {
	// ลำดับของผลลัพธ์ต้องตรงกับลำดับที่ส่งมา ฝั่งหน้าเว็บจับคู่ด้วยตำแหน่ง
	uploads := make([]Presigned, 0, len(req.Items))

	for _, item := range req.Items {
		key, url, err := s.store.UploadURL(ctx, userID, item.Filename)
		if err != nil {
			// ชื่อไฟล์ที่เหลือแต่อักขระที่ใช้ไม่ได้ ถือเป็นความผิดฝั่งผู้เรียก
			return PresignResponse{}, apperr.BadRequest(
				"failed to create upload link for " + item.Filename + ": " + err.Error(),
			)
		}
		uploads = append(uploads, Presigned{Key: key, URL: url})
	}

	return PresignResponse{Uploads: uploads}, nil
}
