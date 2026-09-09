// Package router ประกอบ Fiber app ขึ้นมาจากทุก feature
//
// ที่นี่คือที่เดียวที่เห็นภาพรวมว่าแอปมีเส้นทางอะไรบ้าง
// แต่ละ feature เป็นคนบอกเองว่าเส้นทางของตัวเองหน้าตายังไง
package router

import (
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
	recoverer "github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/requestid"

	"github.com/eezy-tech/one-stocks/server/internal/feature/auth"
	"github.com/eezy-tech/one-stocks/server/internal/feature/generate"
	"github.com/eezy-tech/one-stocks/server/internal/feature/generation"
	"github.com/eezy-tech/one-stocks/server/internal/feature/meta"
	"github.com/eezy-tech/one-stocks/server/internal/feature/settings"
	"github.com/eezy-tech/one-stocks/server/internal/feature/upload"
	"github.com/eezy-tech/one-stocks/server/internal/shared/apperr"
	"github.com/eezy-tech/one-stocks/server/internal/shared/clerkauth"
	"github.com/eezy-tech/one-stocks/server/internal/shared/config"
	"github.com/eezy-tech/one-stocks/server/internal/shared/middleware"
	"github.com/eezy-tech/one-stocks/server/internal/shared/response"
	"github.com/eezy-tech/one-stocks/server/internal/shared/storage"
	"github.com/eezy-tech/one-stocks/server/internal/shared/validation"
)

func New(cfg config.Config, pool *pgxpool.Pool, store storage.Storage) *fiber.App {
	app := fiber.New(fiber.Config{
		AppName: "one-stocks api",
		// ทุก error ที่ handler คืนออกมาจบที่นี่ที่เดียว
		ErrorHandler: apperr.Handler,
		// ทำให้ c.Bind().Body() ตรวจ tag validate ให้อัตโนมัติ
		StructValidator: validation.New(),
		// รับแต่ JSON ก้อนเล็ก รูปอัปตรงขึ้น R2 ไม่ผ่านเซิร์ฟเวอร์นี้
		BodyLimit:   1 * 1024 * 1024,
		ReadTimeout: 15 * time.Second,
		// เผื่อไว้ยาวหน่อย เพราะการเรียกโมเดลหนึ่งรูปใช้เวลา 5-10 วินาที
		WriteTimeout: 90 * time.Second,
	})

	// panic ในเส้นใดเส้นหนึ่งต้องไม่ทำให้ทั้งเซิร์ฟเวอร์ตาย
	app.Use(recoverer.New())
	app.Use(requestid.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: cfg.AllowedOrigins,
		AllowMethods: []string{
			fiber.MethodGet,
			fiber.MethodPost,
			fiber.MethodPut,
			fiber.MethodDelete,
			fiber.MethodOptions,
		},
		AllowHeaders: []string{
			fiber.HeaderContentType,
			fiber.HeaderAuthorization,
		},
	}))

	// เส้นตรวจสุขภาพต้องอยู่นอกด่านล็อกอิน
	// ตัว health check ของ load balancer ไม่มี token ให้ส่ง
	app.Get("/healthz", func(c fiber.Ctx) error {
		return response.Success(c, fiber.Map{"status": "ok"})
	})

	// ทุกเส้นใต้ /api ต้องล็อกอินก่อน
	// verifier ตัวเดียวใช้ร่วมกันทุกคำขอ เพราะข้างในมี cache ของกุญแจอยู่
	api := app.Group("/api", middleware.RequireAuth(cfg, clerkauth.NewVerifier()))

	// feature generate ต้องใช้ค่าตั้งต้นของผู้ใช้และเขียนประวัติ
	// จึงประกอบไว้ก่อนแล้วส่งต่อ ไม่ให้แต่ละ feature สร้าง repository ซ้ำ
	settingsService := settings.NewService(settings.NewRepository(pool))
	generationRepo := generation.NewRepository(pool)

	auth.Register(api, auth.NewService(auth.NewRepository(pool)))
	generate.Register(api, generate.NewService(cfg, store, settingsService, generationRepo))
	generation.Register(api, generation.NewService(generationRepo, store))
	meta.Register(api, meta.NewService(cfg))
	settings.Register(api, settingsService)
	upload.Register(api, upload.NewService(store))

	return app
}
