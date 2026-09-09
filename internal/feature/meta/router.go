package meta

import "github.com/gofiber/fiber/v3"

func Register(r fiber.Router, service Service) {
	ctl := NewController(service)

	r.Get("/meta", ctl.Get)
}
