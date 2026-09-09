// Package validation ต่อ ozzo-validation เข้ากับ Fiber
//
// พอใส่ไว้ใน fiber.Config.StructValidator แล้ว การเรียก
// c.Bind().Body(&req) จะเรียกเมธอด Validate() ของ DTO ให้อัตโนมัติ
// controller จึงไม่ต้องเขียน if เช็คทีละฟิลด์
//
// กฎเขียนเป็นโค้ดในไฟล์ validation.go ของแต่ละ feature ไม่ใช่ tag
// ทำให้เขียนกฎที่อ้างอิงหลายฟิลด์ หรือกฎที่ต้องคำนวณได้โดยตรง
package validation

import (
	"errors"
	"sort"
	"strconv"
	"strings"

	ozzo "github.com/go-ozzo/ozzo-validation/v4"

	"github.com/eezy-tech/one-stocks/server/internal/shared/apperr"
)

type Validator struct{}

func New() *Validator {
	return &Validator{}
}

// Validate ทำให้ Validator ใช้เป็น fiber.StructValidator ได้
//
// ozzo จะเรียก Validate() ของ out เองถ้า out ทำ interface Validatable ไว้
// DTO ที่ไม่มีเมธอดนั้นจะผ่านไปเลย ไม่ถือว่าผิด
func (v *Validator) Validate(out any) error {
	if out == nil {
		return nil
	}

	err := ozzo.Validate(out)
	if err == nil {
		return nil
	}

	var fieldErrors ozzo.Errors
	if errors.As(err, &fieldErrors) {
		return apperr.BadRequest(strings.Join(flatten("", fieldErrors), " · "))
	}

	return apperr.BadRequest(err.Error())
}

/*
flatten แปลง error ที่ซ้อนกันให้เป็นบรรทัดเดียวต่อหนึ่งข้อผิดพลาด

ฟิลด์ที่เป็นรายการจะได้ error ซ้อนกลับมา โดยใช้เลขลำดับเป็นชื่อ
ถ้าปล่อยไว้ ozzo จะพิมพ์ออกมาเป็น "items 0: (contentType: ...)." ซึ่งอ่านยาก
ที่นี่แปลงเป็น "items[0].contentType ..." แทน
*/
func flatten(prefix string, fieldErrors ozzo.Errors) []string {
	names := make([]string, 0, len(fieldErrors))
	for name := range fieldErrors {
		names = append(names, name)
	}
	sortNames(names)

	messages := make([]string, 0, len(names))
	for _, name := range names {
		path := join(prefix, name)

		// ฟิลด์ที่เป็นรายการหรือ struct ซ้อน จะได้ Errors กลับมาอีกชั้น
		var nested ozzo.Errors
		if errors.As(fieldErrors[name], &nested) {
			messages = append(messages, flatten(path, nested)...)
			continue
		}
		messages = append(messages, path+" "+fieldErrors[name].Error())
	}
	return messages
}

func join(prefix, name string) string {
	if prefix == "" {
		return name
	}
	// ชื่อที่เป็นตัวเลขคือลำดับในรายการ ไม่ใช่ชื่อฟิลด์
	if isIndex(name) {
		return prefix + "[" + name + "]"
	}
	return prefix + "." + name
}

/*
sortNames เรียงชื่อให้คงที่ ไม่งั้นข้อความจะสลับตำแหน่งไปมาทุกครั้งที่เรียก
เพราะ ozzo.Errors เป็น map ซึ่ง Go วนลำดับไม่แน่นอน

เลขลำดับเรียงแบบตัวเลข ไม่ใช่ตามตัวอักษร ไม่งั้น 10 จะมาก่อน 2
*/
func sortNames(names []string) {
	sort.Slice(names, func(a, b int) bool {
		left, right := names[a], names[b]
		if isIndex(left) && isIndex(right) {
			leftNumber, _ := strconv.Atoi(left)
			rightNumber, _ := strconv.Atoi(right)
			return leftNumber < rightNumber
		}
		return left < right
	})
}

func isIndex(name string) bool {
	if name == "" {
		return false
	}
	_, err := strconv.Atoi(name)
	return err == nil
}
