package auth

import (
	"github.com/gofiber/fiber/v3"

	"github.com/eezy-tech/one-stocks/server/internal/shared/response"

	"github.com/eezy-tech/one-stocks/server/internal/shared/middleware"
)

type Controller struct {
	service Service
}

func NewController(service Service) *Controller {
	return &Controller{service: service}
}

// Me ตอบว่าคนที่ถือ token นี้คือใคร ใช้ตอนหน้าเว็บโหลดครั้งแรก
func (ctl *Controller) Me(c fiber.Ctx) error {
	profile, err := ctl.service.Me(c.Context(), middleware.UserID(c))
	if err != nil {
		return err
	}
	return response.Success(c, profile)
}
