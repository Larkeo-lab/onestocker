// Package response กำหนดรูปแบบ JSON ที่ API ตอบกลับ ไว้ที่เดียว
//
// ทุกคำตอบมีรูปร่างเดียวกันหมด ทั้งตอนสำเร็จและตอนพลาด:
//
//	{ "code": "OS-200", "message": "SUCCESS", "data": ... }
//
// handler ห้ามเรียก c.JSON เอง ให้เรียกผ่านแพ็กเกจนี้เสมอ
// ไม่งั้นฝั่งหน้าเว็บจะเจอคำตอบคนละรูปแบบแล้วต้องเขียนเงื่อนไขแยก
package response

import (
	"fmt"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/requestid"
)

// CodePrefix นำหน้ารหัสในทุกคำตอบ เปลี่ยนที่นี่ที่เดียว
const CodePrefix = "OS"

// MessageSuccess เป็นข้อความมาตรฐานตอนสำเร็จ
const MessageSuccess = "SUCCESS"

// Code ประกอบรหัสจาก HTTP status เช่น 200 -> "OS-200"
func Code(status int) string {
	return fmt.Sprintf("%s-%d", CodePrefix, status)
}

// Success ตอบสำเร็จพร้อมข้อมูล ค่าเริ่มต้นคือ 200
func Success(c fiber.Ctx, data any, statusCode ...int) error {
	return SuccessWithMessage(c, MessageSuccess, data, statusCode...)
}

// SuccessWithMessage ตอบสำเร็จพร้อมข้อความที่กำหนดเอง
func SuccessWithMessage(c fiber.Ctx, message string, data any, statusCode ...int) error {
	status := statusOr(fiber.StatusOK, statusCode)

	return c.Status(status).JSON(fiber.Map{
		"code":    Code(status),
		"message": message,
		"data":    data,
	})
}

// Created ตอบ 201 พร้อมข้อมูลที่เพิ่งสร้าง
func Created(c fiber.Ctx, data any) error {
	return Success(c, data, fiber.StatusCreated)
}

// ManyDataSuccess ตอบรายการที่ไม่ต้องแบ่งหน้า
func ManyDataSuccess(c fiber.Ctx, data any, statusCode ...int) error {
	return Success(c, data, statusCode...)
}

// PaginationSuccess ตอบรายการพร้อมข้อมูลการแบ่งหน้า
func PaginationSuccess(c fiber.Ctx, data any, page, limit, total int, statusCode ...int) error {
	status := statusOr(fiber.StatusOK, statusCode)

	// ฝั่ง TS ใช้ Math.ceil(total / limit) ซึ่งตอน limit = 0 จะได้ Infinity (ไม่พัง)
	// แต่ Go หารด้วย 0 จะ panic ทันที จึงต้องกันไว้
	totalPages := 0
	if limit > 0 {
		totalPages = (total + limit - 1) / limit
	}

	return c.Status(status).JSON(fiber.Map{
		"code":    Code(status),
		"message": MessageSuccess,
		"data":    data,
		"pagination": fiber.Map{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": totalPages,
		},
	})
}

// Error ตอบข้อผิดพลาดด้วยรูปร่างเดียวกับตอนสำเร็จ
//
// data เป็น null เสมอ ฝั่งหน้าเว็บจึงอ่าน message ได้ที่เดียวกันทุกกรณี
// requestId แนบให้เฉพาะตอนที่เป็นความผิดของเซิร์ฟเวอร์จริง ๆ
func Error(c fiber.Ctx, status int, message string) error {
	body := fiber.Map{
		"code":    Code(status),
		"message": message,
		"data":    nil,
	}
	if ServerFault(status) {
		body["requestId"] = RequestID(c)
	}
	return c.Status(status).JSON(body)
}

// ServerFault บอกว่า status นี้เป็นความผิดของเซิร์ฟเวอร์ที่ต้องตามแก้หรือไม่
//
// 501 ไม่นับ เพราะเป็นสิ่งที่เรายังไม่ได้ทำ ไม่ใช่ของที่พัง
func ServerFault(status int) bool {
	return status >= fiber.StatusInternalServerError &&
		status != fiber.StatusNotImplemented
}

// RequestID อ่านรหัสประจำคำขอที่ middleware requestid ใส่ไว้
func RequestID(c fiber.Ctx) string {
	return requestid.FromContext(c)
}

func statusOr(fallback int, given []int) int {
	if len(given) > 0 && given[0] > 0 {
		return given[0]
	}
	return fallback
}
