package meta

import (
	"github.com/gofiber/fiber/v3"

	"github.com/eezy-tech/one-stocks/server/internal/shared/response"
)

type Controller struct {
	service Service
}

func NewController(service Service) *Controller {
	return &Controller{service: service}
}

func (ctl *Controller) Get(c fiber.Ctx) error {
	result, err := ctl.service.Get(c.Context())
	if err != nil {
		return err
	}
	return response.Success(c, result)
}
