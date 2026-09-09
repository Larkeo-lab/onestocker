package database

import (
	"context"
	"embed"
	"fmt"
	"log/slog"
	"path"
	"sort"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

/*
lockID เป็นเลขอะไรก็ได้ ขอแค่ทั้งระบบใช้เลขเดียวกัน

ใช้ advisory lock กันไม่ให้เซิร์ฟเวอร์สองตัวที่สตาร์ทพร้อมกันรัน
migration ชุดเดียวกันซ้อนกัน ตัวที่มาทีหลังจะรอจนตัวแรกเสร็จ
แล้วเห็นว่าถูกรันไปแล้วจึงข้ามไป
*/
const lockID = 4181923

// Migrate รันไฟล์ใน migrations/ ที่ยังไม่เคยรัน เรียงตามชื่อไฟล์
//
// รันตอนสตาร์ทอัตโนมัติ เพื่อไม่ให้เกิดกรณีลืมรัน SQL เองแล้วแอปพัง
// ตอนผู้ใช้กดปุ่ม โดยที่ log ไม่ได้บอกอะไรเลยว่าทำไม
func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	conn, err := pool.Acquire(ctx)
	if err != nil {
		return fmt.Errorf("ขอคอนเนกชันไม่ได้: %w", err)
	}
	defer conn.Release()

	if _, err := conn.Exec(ctx, "select pg_advisory_lock($1)", lockID); err != nil {
		return fmt.Errorf("ขอ lock ไม่ได้: %w", err)
	}
	defer func() {
		if _, err := conn.Exec(ctx, "select pg_advisory_unlock($1)", lockID); err != nil {
			slog.Warn("ปลด lock ของ migration ไม่สำเร็จ", "error", err)
		}
	}()

	_, err = conn.Exec(ctx, `
		create table if not exists schema_migrations (
			version    text primary key,
			applied_at timestamptz not null default now()
		)`)
	if err != nil {
		return fmt.Errorf("สร้างตาราง schema_migrations ไม่ได้: %w", err)
	}

	applied, err := appliedVersions(ctx, conn.Conn())
	if err != nil {
		return err
	}

	names, err := migrationNames()
	if err != nil {
		return err
	}

	for _, name := range names {
		if applied[name] {
			continue
		}

		body, err := migrationFiles.ReadFile(path.Join("migrations", name))
		if err != nil {
			return fmt.Errorf("อ่านไฟล์ %s ไม่ได้: %w", name, err)
		}

		// ทั้งไฟล์ต้องสำเร็จหรือไม่สำเร็จพร้อมกัน ไม่ให้ค้างครึ่ง ๆ กลาง ๆ
		tx, err := conn.Begin(ctx)
		if err != nil {
			return fmt.Errorf("เปิด transaction ไม่ได้: %w", err)
		}

		if _, err := tx.Exec(ctx, string(body)); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("รัน migration %s ไม่สำเร็จ: %w", name, err)
		}

		_, err = tx.Exec(ctx,
			"insert into schema_migrations (version) values ($1)", name)
		if err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("บันทึก migration %s ไม่สำเร็จ: %w", name, err)
		}

		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("commit migration %s ไม่สำเร็จ: %w", name, err)
		}

		slog.Info("รัน migration แล้ว", "version", name)
	}

	return nil
}

// appliedVersions อ่านรายการ migration ที่รันไปแล้ว
func appliedVersions(ctx context.Context, conn *pgx.Conn) (map[string]bool, error) {
	rows, err := conn.Query(ctx, "select version from schema_migrations")
	if err != nil {
		return nil, fmt.Errorf("อ่าน schema_migrations ไม่ได้: %w", err)
	}
	defer rows.Close()

	applied := map[string]bool{}
	for rows.Next() {
		var version string
		if err := rows.Scan(&version); err != nil {
			return nil, fmt.Errorf("อ่านแถวของ schema_migrations ไม่ได้: %w", err)
		}
		applied[version] = true
	}
	// rows.Err ต้องเช็คด้วย เพราะ Next คืน false ทั้งตอนหมดแถวและตอนพัง
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("อ่าน schema_migrations ไม่ครบ: %w", err)
	}
	return applied, nil
}

func migrationNames() ([]string, error) {
	entries, err := migrationFiles.ReadDir("migrations")
	if err != nil {
		return nil, fmt.Errorf("อ่านโฟลเดอร์ migrations ไม่ได้: %w", err)
	}

	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() {
			names = append(names, entry.Name())
		}
	}
	// เรียงตามชื่อ เลขนำหน้าจึงเป็นตัวกำหนดลำดับการรัน
	sort.Strings(names)
	return names, nil
}
