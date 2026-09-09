package generate

import (
	"context"

	"github.com/eezy-tech/one-stocks/server/internal/shared/apperr"
	"github.com/eezy-tech/one-stocks/server/internal/shared/config"
)

type Service interface {
	Generate(ctx context.Context, userID string, req Request) (Response, error)
}

type service struct {
	cfg config.Config
}

func NewService(cfg config.Config) Service {
	return &service{cfg: cfg}
}

func (s *service) Generate(_ context.Context, userID string, req Request) (Response, error) {
	if !ownsPreviewKey(req.PreviewKey, userID) {
		return Response{}, apperr.Forbidden("ไม่มีสิทธิ์เข้าถึงรูปนี้")
	}

	// TODO: ขั้นตอนที่ต้องทำต่อ
	//  1. ดึงรูปย่อจาก R2 ด้วย req.PreviewKey
	//  2. อ่านค่าตั้งต้นของผู้ใช้จาก feature settings (จำนวนคำ, สไตล์, ภาษา)
	//  3. เรียก Gemini ผ่าน REST ตรง ๆ ไม่ผ่าน SDK
	//     (SDK ถูกปฏิเสธด้วย "User location is not supported for the API use."
	//      บน runtime บางตัว ส่วน fetch ตรงไป endpoint เดียวกันได้ 200 ปกติ)
	//  4. กรองคำต้องห้ามออก แล้วบันทึกผลลงตาราง generations
	return Response{}, apperr.NotImplemented("ยังไม่ได้ต่อโมเดลสำหรับสร้าง metadata")
}
