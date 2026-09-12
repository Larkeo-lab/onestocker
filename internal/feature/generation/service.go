package generation

import (
	"context"
	"log/slog"

	"github.com/eezy-tech/one-stocks/server/internal/shared/apperr"
	"github.com/eezy-tech/one-stocks/server/internal/shared/storage"
)

type Service interface {
	List(ctx context.Context, userID string, query ListQuery) (ListResult, error)
	Delete(ctx context.Context, userID, id string) error
}

type service struct {
	repo  Repository
	store storage.Storage
}

func NewService(repo Repository, store storage.Storage) Service {
	return &service{repo: repo, store: store}
}

func (s *service) List(ctx context.Context, userID string, query ListQuery) (ListResult, error) {
	// เติมค่าเริ่มต้นที่นี่ ไม่ใช่ที่ controller เพื่อให้ผู้เรียกจากที่อื่น
	// (เช่น งาน export ในอนาคต) ได้พฤติกรรมเดียวกัน
	query = query.applyDefaults()

	items, err := s.repo.List(ctx, userID, query.Platform, query.Limit, query.offset())
	if err != nil {
		return ListResult{}, apperr.Internal("failed to read history", err)
	}

	total, err := s.repo.Count(ctx, userID, query.Platform)
	if err != nil {
		return ListResult{}, apperr.Internal("failed to count history", err)
	}

	platforms, err := s.repo.ListUserPlatforms(ctx, userID)
	if err != nil {
		slog.Warn("failed to fetch user platforms", "userID", userID, "error", err)
		platforms = []string{}
	}

	s.attachPreviewURLs(ctx, items)

	return ListResult{
		Items:              items,
		Total:              total,
		Page:               query.Page,
		Limit:              query.Limit,
		AvailablePlatforms: platforms,
	}, nil
}

func (s *service) Delete(ctx context.Context, userID, id string) error {
	deleted, err := s.repo.Delete(ctx, userID, id)
	if err != nil {
		return apperr.Internal("failed to delete history item", err)
	}
	// แถวของคนอื่นก็ตอบว่าไม่พบเหมือนกัน ไม่บอกว่ามีอยู่จริงแต่ไม่มีสิทธิ์
	if !deleted {
		return apperr.NotFound("item not found")
	}
	return nil
}

/*
attachPreviewURLs เติมลิงก์รูปชั่วคราวให้แต่ละแถว

bucket ไม่เปิดสาธารณะ จึงต้องเซ็นลิงก์ให้ทีละไฟล์ การเซ็นเป็นการคำนวณ
ในเครื่อง ไม่ได้ยิงออกเน็ต การทำทีละแถวจึงไม่ช้า

แถวที่เซ็นไม่สำเร็จปล่อยให้ previewUrl เป็น null แล้วไปต่อ
ดีกว่าทำให้ทั้งหน้าเปิดไม่ขึ้นเพราะรูปเดียวมีปัญหา
*/
func (s *service) attachPreviewURLs(ctx context.Context, items []Generation) {
	for i := range items {
		key := items[i].PreviewKey
		if key == nil || *key == "" {
			continue
		}

		url, err := s.store.DownloadURL(ctx, *key)
		if err != nil {
			slog.Warn("สร้างลิงก์รูปไม่สำเร็จ", "key", *key, "error", err)
			continue
		}
		items[i].PreviewURL = &url
	}
}
