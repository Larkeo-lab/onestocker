// Package database ดูแลการต่อฐานข้อมูลและการอัปเดตโครงตาราง
package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

/*
จำนวนคอนเนกชันสูงสุดที่เปิดค้างไว้

Neon มี connection pooler ของตัวเองอยู่แล้ว ฝั่งนี้จึงไม่ต้องเปิดเยอะ
เปิดมากเกินไปบนเครื่องเล็กกลับกินหน่วยความจำโดยไม่ได้อะไรเพิ่ม
*/
const (
	maxConns        = 10
	minConns        = 1
	maxConnLifetime = 30 * time.Minute
	maxConnIdleTime = 5 * time.Minute
	connectTimeout  = 10 * time.Second
)

// New เปิด pool แล้วลองต่อจริงหนึ่งครั้งก่อนคืนค่า
//
// ต้องลองต่อตั้งแต่ตอนสตาร์ท ไม่งั้นจะไปรู้ว่าต่อไม่ได้ตอนผู้ใช้กดปุ่มแล้ว
func New(ctx context.Context, url string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, fmt.Errorf("DATABASE_URL ไม่ถูกต้อง: %w", err)
	}

	config.MaxConns = maxConns
	config.MinConns = minConns
	config.MaxConnLifetime = maxConnLifetime
	config.MaxConnIdleTime = maxConnIdleTime

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("เปิด pool ไม่สำเร็จ: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, connectTimeout)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ต่อฐานข้อมูลไม่ได้: %w", err)
	}

	return pool, nil
}
