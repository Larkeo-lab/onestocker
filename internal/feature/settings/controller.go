package settings

import (
	"github.com/gofiber/fiber/v3"

	"github.com/eezy-tech/one-stocks/server/internal/shared/response"

	"github.com/eezy-tech/one-stocks/server/internal/shared/middleware"
)

// Controller แปลง HTTP เป็นการเรียก Service และแปลงผลลัพธ์กลับเป็น JSON
// ตรรกะทางธุรกิจไม่ควรอยู่ในไฟล์นี้
type Controller struct {
	service Service
}

func NewController(service Service) *Controller {
	return &Controller{service: service}
}

// Get ตอบค่าตั้งต้นของผู้ใช้คนที่เรียกมา
func (ctl *Controller) Get(c fiber.Ctx) error {
	current, err := ctl.service.Get(c.Context(), middleware.UserID(c))
	if err != nil {
		return err
	}
	return response.Success(c, current)
}

// Update บันทึกค่าใหม่แล้วตอบค่าที่บันทึกจริงกลับไป
// ต้องตอบค่าที่ผ่าน normalize แล้ว หน้าเว็บจะได้แสดงตรงกับที่เก็บ
func (ctl *Controller) Update(c fiber.Ctx) error {
	var body Settings

	// Bind().Body ตรวจ tag validate ให้เอง เพราะตั้ง StructValidator ไว้ที่ fiber.Config
	if err := c.Bind().Body(&body); err != nil {
		return err
	}

	saved, err := ctl.service.Save(c.Context(), middleware.UserID(c), body)
	if err != nil {
		return err
	}
	return response.Success(c, saved)
}
