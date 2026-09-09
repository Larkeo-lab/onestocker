package auth

import "github.com/gofiber/fiber/v3"

func Register(r fiber.Router, service Service) {
	ctl := NewController(service)

	group := r.Group("/auth")
	group.Get("/me", ctl.Me)
}
