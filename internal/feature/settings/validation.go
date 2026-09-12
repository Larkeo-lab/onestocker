package settings

import (
	"strings"

	ozzo "github.com/go-ozzo/ozzo-validation/v4"

	"github.com/eezy-tech/one-stocks/server/internal/shared/util"
)

// PrimaryLanguage เป็นภาษาหลักเสมอ เพราะ Adobe Stock ใช้ค้นหาด้วยภาษาอังกฤษ
const PrimaryLanguage = "en"

// Language คือหนึ่งภาษาที่เลือกได้ในหน้า Settings
type Language struct {
	Code   string
	Name   string
	Native string
}

// SupportedLanguages เป็นแหล่งความจริงเดียวของรายการภาษา
// หน้าเว็บอ่านรายการนี้ผ่าน GET /api/meta ไม่ได้เขียนไว้เองอีกชุด
var SupportedLanguages = []Language{
	{Code: "en", Name: "English", Native: "English"},
	{Code: "lo", Name: "Lao", Native: "ລາວ"},
	{Code: "th", Name: "Thai", Native: "ไทย"},
}

func isSupported(code string) bool {
	for _, lang := range SupportedLanguages {
		if lang.Code == code {
			return true
		}
	}
	return false
}

// normalizeLanguages กรองเอาเฉพาะภาษาที่รองรับ ตัดตัวซ้ำ
// แล้ววางภาษาอังกฤษไว้หน้าสุดเสมอ ต่อให้ผู้ใช้ส่งมาไม่ครบหรือเพี้ยน
//
// เขียนเป็นกฎแยกจาก tag `validate` เพราะเป็นการ "แก้ค่าให้ถูก"
// ไม่ใช่แค่ "บอกว่าผิด" — ผู้ใช้ไม่ควรโดนปฏิเสธเพราะพิมพ์ภาษาเกินมา
func normalizeLanguages(value string) string {
	seen := map[string]bool{PrimaryLanguage: true}
	picked := []string{PrimaryLanguage}

	for _, code := range util.SplitCSV(value) {
		code = strings.ToLower(code)
		if isSupported(code) && !seen[code] {
			seen[code] = true
			picked = append(picked, code)
		}
	}

	return strings.Join(picked, ",")
}

// normalizeBlockedTerms ตัดช่องว่างและคำซ้ำออก เก็บเป็นตัวพิมพ์เล็ก
func normalizeBlockedTerms(value string) string {
	return util.JoinCSV(util.Dedupe(util.LowerAll(util.SplitCSV(value))))
}

// normalize จัดค่าที่รับมาให้อยู่ในรูปมาตรฐานก่อนบันทึก
func (s Settings) normalize() Settings {
	s.OutputLanguages = normalizeLanguages(s.OutputLanguages)
	s.BlockedTerms = normalizeBlockedTerms(s.BlockedTerms)
	if strings.TrimSpace(s.SelectedPlatforms) == "" {
		s.SelectedPlatforms = "adobe-stock"
	}
	return s
}

// TitleStyles คือสไตล์ของ title ที่ให้ผู้ใช้เลือกได้
var TitleStyles = []any{"descriptive", "concise", "commercial"}

// Validate ถูกเรียกอัตโนมัติตอน c.Bind().Body() ผ่าน StructValidator
func (s Settings) Validate() error {
	return ozzo.ValidateStruct(&s,
		ozzo.Field(&s.KeywordsPerImage,
			ozzo.Required.Error("is required"),
			ozzo.Min(10).Error("must be at least 10"),
			// เพดานจริงของ Adobe Stock คือ 50
			ozzo.Max(50).Error("must not exceed 50"),
		),
		ozzo.Field(&s.TitleStyle,
			ozzo.Required.Error("is required"),
			ozzo.In(TitleStyles...).Error("must be descriptive, concise, or commercial"),
		),
		ozzo.Field(&s.BlockedTerms,
			ozzo.Length(0, 2000).Error("must not exceed 2000 characters"),
		),
		ozzo.Field(&s.OutputLanguages,
			ozzo.Required.Error("at least one language is required"),
		),
	)
}

// ExtraLanguages คืนภาษารองที่ต้องแปลเพิ่ม (ตัดภาษาหลักออก)
//
// ใช้ตอนประกอบคำสั่งให้โมเดล ถ้าเลือกแต่อังกฤษจะได้รายการว่าง
// แล้วคำสั่งเรื่องการแปลจะไม่ถูกใส่เข้าไปเลย
func ExtraLanguages(value string) []Language {
	picked := make([]Language, 0, len(SupportedLanguages))

	for _, code := range strings.Split(normalizeLanguages(value), ",") {
		if code == PrimaryLanguage {
			continue
		}
		for _, language := range SupportedLanguages {
			if language.Code == code {
				picked = append(picked, language)
				break
			}
		}
	}
	return picked
}
