package generate

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

// Generate สร้าง metadata ให้รูปหนึ่งรูป
// หน้าเว็บยิงเข้ามาพร้อมกันได้หลายคำขอ ตัวละหนึ่งรูป
func (ctl *Controller) Generate(c fiber.Ctx) error {
	var body Request
	if err := c.Bind().Body(&body); err != nil {
		return err
	}

	result, err := ctl.service.Generate(c.Context(), middleware.UserID(c), body)
	if err != nil {
		return err
	}
	return response.Success(c, result)
}
