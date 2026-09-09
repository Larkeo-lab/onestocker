package settings

import "github.com/gofiber/fiber/v3"

// Register ผูกเส้นทางของ feature นี้เข้ากับ router ที่รับมา
// เส้นทางที่ประกาศที่นี่ต้องตรงกับ client/one-stock/src/lib/api/settings.ts
func Register(r fiber.Router, service Service) {
	ctl := NewController(service)

	group := r.Group("/settings")
	group.Get("/", ctl.Get)
	group.Put("/", ctl.Update)
}
