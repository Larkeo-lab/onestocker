package generation

import "github.com/gofiber/fiber/v3"

// Register เส้นทางต้องตรงกับ client/one-stock/src/lib/api/history.ts
func Register(r fiber.Router, service Service) {
	ctl := NewController(service)

	group := r.Group("/generations")
	group.Get("/", ctl.List)
	group.Delete("/:id", ctl.Delete)
}
