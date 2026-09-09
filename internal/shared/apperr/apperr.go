// Package apperr เป็น error ที่รู้ว่าตัวเองควรตอบ HTTP status อะไร
//
// service คืน error พวกนี้ออกมา แล้ว Handler ที่ปลายทางแปลงเป็น JSON
// controller จึงไม่ต้องรู้เรื่อง status code ของแต่ละกรณีเอง
package apperr

import "net/http"

type Error struct {
	Status int
	// ข้อความที่ผู้ใช้จะเห็น เขียนให้อ่านรู้เรื่องโดยไม่ต้องเปิดโค้ด
	Message string
	// สาเหตุจริง ไม่ถูกส่งออกไปให้ผู้ใช้ ใช้เขียน log อย่างเดียว
	Err error
}

func (e *Error) Error() string {
	if e.Err != nil {
		return e.Message + ": " + e.Err.Error()
	}
	return e.Message
}

func (e *Error) Unwrap() error { return e.Err }

func New(status int, message string, cause error) *Error {
	return &Error{Status: status, Message: message, Err: cause}
}

func BadRequest(message string) *Error {
	return New(http.StatusBadRequest, message, nil)
}

func Unauthorized(message string) *Error {
	return New(http.StatusUnauthorized, message, nil)
}

func Forbidden(message string) *Error {
	return New(http.StatusForbidden, message, nil)
}

func NotFound(message string) *Error {
	return New(http.StatusNotFound, message, nil)
}

func Conflict(message string) *Error {
	return New(http.StatusConflict, message, nil)
}

func TooManyRequests(message string) *Error {
	return New(http.StatusTooManyRequests, message, nil)
}

func Internal(message string, cause error) *Error {
	return New(http.StatusInternalServerError, message, cause)
}

// NotImplemented ใช้กับเส้นที่วางโครงไว้แล้วแต่ยังต่อของจริงไม่เสร็จ
// ตอบ 501 ชัด ๆ ดีกว่าตอบข้อมูลปลอมแล้วให้ฝั่งหน้าเว็บเข้าใจผิด
func NotImplemented(message string) *Error {
	return New(http.StatusNotImplemented, message, nil)
}
