package apperr

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/gofiber/fiber/v3"

	"github.com/eezy-tech/one-stocks/server/internal/shared/response"
)

// statusMessages แปลข้อความมาตรฐานของ Fiber เป็นภาษาไทย
//
// จำเป็นเพราะ error ที่ Fiber สร้างเอง (404, 405, 413) มีข้อความอังกฤษ
// ปนกับข้อความของเราที่เป็นไทย ผู้ใช้เห็นแล้วสับสน
var statusMessages = map[int]string{
	http.StatusBadRequest:            "Invalid request",
	http.StatusUnauthorized:          "Authentication required",
	http.StatusForbidden:             "Access denied",
	http.StatusNotFound:              "Resource not found",
	http.StatusMethodNotAllowed:      "Method not allowed",
	http.StatusRequestTimeout:        "Request timeout",
	http.StatusConflict:              "Resource conflict",
	http.StatusRequestEntityTooLarge: "Request payload too large",
	http.StatusUnsupportedMediaType:  "Unsupported media type",
	http.StatusUnprocessableEntity:   "Request body must be valid JSON (Content-Type: application/json)",
	http.StatusTooManyRequests:       "Too many requests, please try again later",
	http.StatusInternalServerError:   "Internal server error",
	http.StatusNotImplemented:        "Not implemented",
	http.StatusServiceUnavailable:    "Service temporarily unavailable",
}

func statusMessage(status int, fallback string) string {
	if message, ok := statusMessages[status]; ok {
		return message
	}
	if fallback != "" {
		return fallback
	}
	return statusMessages[http.StatusInternalServerError]
}

// Handler เป็น ErrorHandler กลางของ Fiber
// ทุก error ที่ handler คืนออกมาจะผ่านตรงนี้ที่เดียว
func Handler(c fiber.Ctx, err error) error {
	status, message := resolve(c, err)

	// 5xx คือความผิดของเรา ต้องเห็นใน log ส่วน 4xx เป็นเรื่องปกติของ API
	// ยกเว้น 501 ที่เป็นสถานะซึ่งเราตั้งใจให้เป็น ไม่ใช่ของพัง
	if response.ServerFault(status) {
		slog.Error("request failed",
			"requestId", response.RequestID(c),
			"method", c.Method(),
			"path", c.Path(),
			"status", status,
			"error", err,
		)
	}

	return response.Error(c, status, message)
}

// resolve แปลง error เป็น status กับข้อความที่จะตอบกลับ
func resolve(c fiber.Ctx, err error) (int, string) {
	// error ของเราเองรู้ status ของตัวเอง และข้อความถูกเขียนมาให้ผู้ใช้อ่านแล้ว
	var appErr *Error
	if errors.As(err, &appErr) {
		return appErr.Status, appErr.Message
	}

	// bind ล้มเหลว = ผู้เรียกส่งข้อมูลผิดรูปแบบ เช่น JSON ขาดวงเล็บปิด
	// ต้องเป็น 400 ไม่ใช่ 500 เพราะไม่ใช่ความผิดของเซิร์ฟเวอร์
	var bindErr *fiber.BindError
	if errors.As(err, &bindErr) {
		return http.StatusBadRequest, bindMessage(bindErr)
	}

	var fiberErr *fiber.Error
	if errors.As(err, &fiberErr) {
		if fiberErr.Code == http.StatusNotFound {
			return fiberErr.Code, fmt.Sprintf("Route %s %s not found", c.Method(), c.Path())
		}
		return fiberErr.Code, statusMessage(fiberErr.Code, "")
	}

	// ไม่รู้จักชนิดนี้ บันทึกชนิดไว้ด้วยเพื่อให้เพิ่มเคสใหม่ได้ถูกจุด
	slog.Warn("unhandled error type", "type", fmt.Sprintf("%T", err), "error", err)
	return http.StatusInternalServerError, statusMessages[http.StatusInternalServerError]
}

// bindMessage บอกให้ชัดว่าอ่านข้อมูลจากส่วนไหนของคำขอไม่ได้
func bindMessage(err *fiber.BindError) string {
	source := map[string]string{
		fiber.BindSourceBody:   "request body",
		fiber.BindSourceQuery:  "query string",
		fiber.BindSourceHeader: "headers",
		fiber.BindSourceURI:    "request path",
		fiber.BindSourceCookie: "cookies",
	}[err.Source]

	if source == "" {
		source = "request"
	}
	if err.Field != "" {
		return fmt.Sprintf("Failed to parse field '%s' from %s: invalid format", err.Field, source)
	}
	return fmt.Sprintf("Failed to parse %s: invalid format", source)
}
