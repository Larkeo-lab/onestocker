package generation

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/eezy-tech/one-stocks/server/internal/shared/database/sqlc"
)

type Repository interface {
	List(ctx context.Context, userID string, platform string, limit, offset int) ([]Generation, error)
	Count(ctx context.Context, userID string, platform string) (int, error)
	ListUserPlatforms(ctx context.Context, userID string) ([]string, error)
	// Delete คืน false เมื่อไม่มีแถวนั้น หรือแถวนั้นเป็นของคนอื่น
	Delete(ctx context.Context, userID, id string) (bool, error)
	Insert(ctx context.Context, userID string, in Generation) (Generation, error)
}

type repository struct {
	queries *sqlc.Queries
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &repository{queries: sqlc.New(pool)}
}

func (r *repository) ListUserPlatforms(ctx context.Context, userID string) ([]string, error) {
	rows, err := r.queries.ListUserPlatforms(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("อ่านแพลตฟอร์มไม่สำเร็จ: %w", err)
	}

	// คอลัมน์ platform_id เป็น null ได้ sqlc จึงคืนมาเป็น []*string
	// แม้ตัวคำสั่งจะกรอง is not null ไว้แล้วก็ยังต้องคลายพอยน์เตอร์เอง
	//
	// ต้องเป็น slice ว่าง ไม่ใช่ nil ไม่งั้น JSON จะออกมาเป็น null
	// แล้วฝั่งหน้าเว็บที่เรียก .length จะพัง
	platforms := make([]string, 0, len(rows))
	for _, row := range rows {
		if row == nil || *row == "" {
			continue
		}
		platforms = append(platforms, *row)
	}
	return platforms, nil
}

func (r *repository) List(ctx context.Context, userID string, platform string, limit, offset int) ([]Generation, error) {
	var rows []sqlc.ListGenerationsRow
	var err error

	if platform != "" {
		var filtered []sqlc.ListGenerationsByPlatformRow
		filtered, err = r.queries.ListGenerationsByPlatform(ctx, sqlc.ListGenerationsByPlatformParams{
			UserID:     userID,
			PlatformID: &platform,
			Limit:      int32(limit),
			Offset:     int32(offset),
		})
		// สองคำสั่งคืนคอลัมน์ชุดเดียวกัน แต่ sqlc สร้าง struct แยกให้คนละตัว
		// แปลงให้เป็นชนิดเดียวกันตรงนี้ โค้ดที่แปลงเป็น Generation จะได้มีที่เดียว
		rows = make([]sqlc.ListGenerationsRow, 0, len(filtered))
		for _, row := range filtered {
			rows = append(rows, sqlc.ListGenerationsRow(row))
		}
	} else {
		rows, err = r.queries.ListGenerations(ctx, sqlc.ListGenerationsParams{
			UserID: userID,
			Limit:  int32(limit),
			Offset: int32(offset),
		})
	}

	if err != nil {
		return nil, fmt.Errorf("อ่านประวัติไม่สำเร็จ: %w", err)
	}

	// ต้องเป็น slice ว่าง ไม่ใช่ nil ไม่งั้น JSON จะออกมาเป็น null
	// แล้วฝั่งหน้าเว็บที่เรียก .length จะพัง
	items := make([]Generation, 0, len(rows))
	for _, row := range rows {
		items = append(items, Generation{
			ID:          row.ID.String(),
			Filename:    row.Filename,
			PreviewKey:  row.PreviewKey,
			Title:       row.Title,
			Description: row.Description,
			Keywords:    row.Keywords,
			Category:    row.Category,
			Provider:    row.Provider,
			Model:       row.Model,
			PlatformId:  row.PlatformID,
			CreatedAt:   row.CreatedAt,
		})
	}
	return items, nil
}

func (r *repository) Count(ctx context.Context, userID string, platform string) (int, error) {
	var total int64
	var err error

	if platform != "" {
		total, err = r.queries.CountGenerationsByPlatform(ctx, sqlc.CountGenerationsByPlatformParams{
			UserID:     userID,
			PlatformID: &platform,
		})
	} else {
		total, err = r.queries.CountGenerations(ctx, userID)
	}

	if err != nil {
		return 0, fmt.Errorf("นับประวัติไม่สำเร็จ: %w", err)
	}
	return int(total), nil
}

func (r *repository) Delete(ctx context.Context, userID, id string) (bool, error) {
	parsed, err := uuid.Parse(id)
	if err != nil {
		// id ที่ไม่ใช่ uuid ย่อมไม่มีทางมีอยู่จริง ไม่ต้องยิงไปถามฐานข้อมูล
		return false, nil
	}

	affected, err := r.queries.DeleteGeneration(ctx, sqlc.DeleteGenerationParams{
		ID:     parsed,
		UserID: userID,
	})
	if err != nil {
		return false, fmt.Errorf("ลบประวัติไม่สำเร็จ: %w", err)
	}
	return affected > 0, nil
}

func (r *repository) Insert(ctx context.Context, userID string, in Generation) (Generation, error) {
	row, err := r.queries.InsertGeneration(ctx, sqlc.InsertGenerationParams{
		UserID:      userID,
		Filename:    in.Filename,
		PreviewKey:  in.PreviewKey,
		Title:       in.Title,
		Description: in.Description,
		Keywords:    in.Keywords,
		Category:    in.Category,
		Provider:    in.Provider,
		Model:       in.Model,
		PlatformID:  in.PlatformId,
	})
	if err != nil {
		return Generation{}, fmt.Errorf("บันทึกผลลัพธ์ไม่สำเร็จ: %w", err)
	}

	return Generation{
		ID:          row.ID.String(),
		Filename:    row.Filename,
		PreviewKey:  row.PreviewKey,
		Title:       row.Title,
		Description: row.Description,
		Keywords:    row.Keywords,
		Category:    row.Category,
		Provider:    row.Provider,
		Model:       row.Model,
		PlatformId:  row.PlatformID,
		CreatedAt:   row.CreatedAt,
	}, nil
}
