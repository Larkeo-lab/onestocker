package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/gofiber/fiber/v3"
	"github.com/joho/godotenv"

	"github.com/eezy-tech/one-stocks/server/internal/router"
	"github.com/eezy-tech/one-stocks/server/internal/shared/config"
	"github.com/eezy-tech/one-stocks/server/internal/shared/database"
	"github.com/eezy-tech/one-stocks/server/internal/shared/middleware"
)

func main() {
	// .env มีเฉพาะตอนรันบนเครื่อง ตอน deploy ใช้ environment ของ EC2 โดยตรง
	// ไม่มีไฟล์ก็ไม่เป็นไร จึงไม่เช็ค error
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		slog.Error("อ่านค่า config ไม่ได้", "error", err)
		os.Exit(1)
	}

	// SDK ของ Clerk เก็บคีย์ไว้ที่ตัวแปรระดับแพ็กเกจ ต้องตั้งก่อนเรียกใช้อะไรก็ตาม
	if cfg.ClerkSecretKey != "" {
		clerk.SetKey(cfg.ClerkSecretKey)
	}

	if cfg.IsDev() && cfg.AuthDevBypass {
		slog.Warn("เปิด AUTH_DEV_BYPASS อยู่ — ทุกคำขอถูกนับเป็นผู้ใช้สมมติโดยไม่ตรวจ token",
			"userID", middleware.DevUserID)
	}

	// ต่อฐานข้อมูลตั้งแต่ตอนสตาร์ท ต่อไม่ได้ก็ไม่ต้องเปิดรับคำขอ
	// ดีกว่าเปิดรับแล้วทุกคำขอพังทีละอันโดยที่ log ไม่บอกสาเหตุที่แท้จริง
	startup, cancelStartup := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancelStartup()

	pool, err := database.New(startup, cfg.DatabaseURL)
	if err != nil {
		slog.Error("ต่อฐานข้อมูลไม่ได้", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// อัปเดตโครงตารางให้ตรงกับโค้ดทุกครั้งที่สตาร์ท
	// จะได้ไม่มีกรณีลืมรัน SQL เองแล้วไปพังตอนผู้ใช้กดปุ่ม
	if err := database.Migrate(startup, pool); err != nil {
		slog.Error("อัปเดตโครงตารางไม่สำเร็จ", "error", err)
		os.Exit(1)
	}

	app := router.New(cfg, pool)

	// ปิดให้คำขอที่ค้างอยู่ทำงานจนจบก่อน ไม่ตัดกลางคัน
	// สำคัญเพราะการเรียกโมเดลหนึ่งครั้งใช้เวลาหลายวินาที
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-shutdown
		slog.Info("ได้รับสัญญาณให้ปิด กำลังรอคำขอที่ค้างอยู่")

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := app.ShutdownWithContext(ctx); err != nil {
			slog.Error("ปิดเซิร์ฟเวอร์ไม่เรียบร้อย", "error", err)
		}
	}()

	addr := ":" + cfg.Port
	slog.Info("เซิร์ฟเวอร์พร้อมใช้งาน", "addr", addr, "env", cfg.AppEnv)

	if err := app.Listen(addr, fiber.ListenConfig{DisableStartupMessage: true}); err != nil {
		slog.Error("เซิร์ฟเวอร์หยุดทำงาน", "error", err)
		os.Exit(1)
	}

	slog.Info("ปิดเซิร์ฟเวอร์เรียบร้อย")
}
