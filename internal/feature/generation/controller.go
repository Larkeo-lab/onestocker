package generation

import (
	"github.com/gofiber/fiber/v3"

	"github.com/eezy-tech/one-stocks/server/internal/shared/apperr"
	"github.com/eezy-tech/one-stocks/server/internal/shared/middleware"
	"github.com/eezy-tech/one-stocks/server/internal/shared/response"
)

type Controller struct {
	service Service
}

func NewController(service Service) *Controller {
	return &Controller{service: service}
}

// List คืนประวัติทีละหน้า ใหม่ไปเก่า
func (ctl *Controller) List(c fiber.Ctx) error {
	var query ListQuery
	if err := c.Bind().Query(&query); err != nil {
		return err
	}

	result, err := ctl.service.List(c.Context(), middleware.UserID(c), query)
	if err != nil {
		return err
	}

	return response.PaginationSuccess(c, result.Items, result.Page, result.Limit, result.Total)
}

// Delete ลบประวัติหนึ่งแถว
func (ctl *Controller) Delete(c fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return apperr.BadRequest("deletion id is required")
	}

	if err := ctl.service.Delete(c.Context(), middleware.UserID(c), id); err != nil {
		return err
	}

	// ตอบ 200 พร้อม envelope แทน 204 เพื่อให้ทุกคำตอบมีรูปร่างเดียวกัน
	return response.SuccessWithMessage(c, "DELETED", nil)
}
