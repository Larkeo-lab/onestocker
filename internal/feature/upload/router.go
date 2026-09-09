package upload

import "github.com/gofiber/fiber/v3"

// Register เส้นทางต้องตรงกับ client/one-stock/src/lib/api/uploads.ts
func Register(r fiber.Router, service Service) {
	ctl := NewController(service)

	group := r.Group("/uploads")
	group.Post("/presign", ctl.Presign)
}
