package generation

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/eezy-tech/one-stocks/server/internal/shared/database/sqlc"
)

type Repository interface {
	List(ctx context.Context, userID string, limit, offset int) ([]Generation, error)
	Count(ctx context.Context, userID string) (int, error)
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

func (r *repository) List(ctx context.Context, userID string, limit, offset int) ([]Generation, error) {
	rows, err := r.queries.ListGenerations(ctx, sqlc.ListGenerationsParams{
		UserID: userID,
		Limit:  int32(limit),
		Offset: int32(offset),
	})
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
			CreatedAt:   row.CreatedAt,
		})
	}
	return items, nil
}

func (r *repository) Count(ctx context.Context, userID string) (int, error) {
	total, err := r.queries.CountGenerations(ctx, userID)
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
		CreatedAt:   row.CreatedAt,
	}, nil
}
