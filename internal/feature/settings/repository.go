package settings

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/eezy-tech/one-stocks/server/internal/shared/database/sqlc"
)

// Repository คุยกับฐานข้อมูลแทน service
//
// เป็น interface เพื่อให้ service ทดสอบได้โดยไม่ต้องมีฐานข้อมูลจริง
type Repository interface {
	// Get คืนค่าที่บันทึกไว้ ตัวที่สองบอกว่าเคยบันทึกหรือยัง
	Get(ctx context.Context, userID string) (Settings, bool, error)
	Upsert(ctx context.Context, userID string, in Settings) (Settings, error)
}

type repository struct {
	queries *sqlc.Queries
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &repository{queries: sqlc.New(pool)}
}

func (r *repository) Get(ctx context.Context, userID string) (Settings, bool, error) {
	row, err := r.queries.GetUserSettings(ctx, userID)
	if err != nil {
		// ยังไม่เคยบันทึกไม่ใช่ข้อผิดพลาด ผู้ใช้ใหม่ทุกคนเป็นแบบนี้
		if errors.Is(err, pgx.ErrNoRows) {
			return Settings{}, false, nil
		}
		return Settings{}, false, fmt.Errorf("อ่านค่าตั้งต้นไม่สำเร็จ: %w", err)
	}

	return Settings{
		KeywordsPerImage: int(row.KeywordsPerImage),
		TitleStyle:       row.TitleStyle,
		BlockedTerms:     row.BlockedTerms,
		OutputLanguages:  row.OutputLanguages,
	}, true, nil
}

func (r *repository) Upsert(ctx context.Context, userID string, in Settings) (Settings, error) {
	row, err := r.queries.UpsertUserSettings(ctx, sqlc.UpsertUserSettingsParams{
		UserID:           userID,
		KeywordsPerImage: int32(in.KeywordsPerImage),
		TitleStyle:       in.TitleStyle,
		BlockedTerms:     in.BlockedTerms,
		OutputLanguages:  in.OutputLanguages,
	})
	if err != nil {
		return Settings{}, fmt.Errorf("บันทึกค่าตั้งต้นไม่สำเร็จ: %w", err)
	}

	return Settings{
		KeywordsPerImage: int(row.KeywordsPerImage),
		TitleStyle:       row.TitleStyle,
		BlockedTerms:     row.BlockedTerms,
		OutputLanguages:  row.OutputLanguages,
	}, nil
}
