package generation

import (
	"context"

	"github.com/eezy-tech/one-stocks/server/internal/shared/apperr"
)

type Service interface {
	List(ctx context.Context, userID string, query ListQuery) (ListResult, error)
	Delete(ctx context.Context, userID, id string) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) List(ctx context.Context, userID string, query ListQuery) (ListResult, error) {
	// เติมค่าเริ่มต้นที่นี่ ไม่ใช่ที่ controller เพื่อให้ผู้เรียกจากที่อื่น
	// (เช่น งาน export ในอนาคต) ได้พฤติกรรมเดียวกัน
	query = query.applyDefaults()

	items, err := s.repo.List(ctx, userID, query.Limit, query.offset())
	if err != nil {
		return ListResult{}, apperr.Internal("อ่านประวัติไม่สำเร็จ", err)
	}

	total, err := s.repo.Count(ctx, userID)
	if err != nil {
		return ListResult{}, apperr.Internal("นับประวัติไม่สำเร็จ", err)
	}

	// TODO: ขอ presigned GET จาก R2 ให้แต่ละแถวเพื่อเติม PreviewURL
	// ต้องรอให้ feature upload ต่อกับ R2 เสร็จก่อน
	return ListResult{
		Items: items,
		Total: total,
		Page:  query.Page,
		Limit: query.Limit,
	}, nil
}

func (s *service) Delete(ctx context.Context, userID, id string) error {
	deleted, err := s.repo.Delete(ctx, userID, id)
	if err != nil {
		return apperr.Internal("ลบประวัติไม่สำเร็จ", err)
	}
	// แถวของคนอื่นก็ตอบว่าไม่พบเหมือนกัน ไม่บอกว่ามีอยู่จริงแต่ไม่มีสิทธิ์
	if !deleted {
		return apperr.NotFound("ไม่พบรายการนี้")
	}
	return nil
}
