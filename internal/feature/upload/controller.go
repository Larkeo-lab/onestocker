package upload

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

// Presign ขอลิงก์อัปโหลดทีเดียวหลายไฟล์ ประหยัดกว่ายิงทีละรูป
func (ctl *Controller) Presign(c fiber.Ctx) error {
	var body PresignRequest
	if err := c.Bind().Body(&body); err != nil {
		return err
	}

	result, err := ctl.service.Presign(c.Context(), middleware.UserID(c), body)
	if err != nil {
		return err
	}
	return response.Success(c, result)
}
