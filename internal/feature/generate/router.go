package generate

import "github.com/gofiber/fiber/v3"

// Register เส้นทางต้องตรงกับ client/one-stock/src/lib/api/generate.ts
func Register(r fiber.Router, service Service) {
	ctl := NewController(service)

	r.Post("/generate", ctl.Generate)
}
