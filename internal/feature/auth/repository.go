package auth

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/eezy-tech/one-stocks/server/internal/shared/database/sqlc"
)

type Repository interface {
	// Upsert คัดลอกโปรไฟล์จาก Clerk มาเก็บไว้ฝั่งเรา
	Upsert(ctx context.Context, in Profile) (Profile, error)
}

type repository struct {
	queries *sqlc.Queries
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &repository{queries: sqlc.New(pool)}
}

func (r *repository) Upsert(ctx context.Context, in Profile) (Profile, error) {
	row, err := r.queries.UpsertProfile(ctx, sqlc.UpsertProfileParams{
		UserID:     in.UserID,
		FirstName:  in.FirstName,
		LastName:   in.LastName,
		Email:      in.Email,
		ProfileUrl: in.ProfileURL,
	})
	if err != nil {
		return Profile{}, fmt.Errorf("บันทึกโปรไฟล์ไม่สำเร็จ: %w", err)
	}

	return Profile{
		UserID:     row.UserID,
		FirstName:  row.FirstName,
		LastName:   row.LastName,
		Email:      row.Email,
		ProfileURL: row.ProfileUrl,
		UserType:   row.UserType,
	}, nil
}
