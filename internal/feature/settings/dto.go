// Package settings ดูแลค่าตั้งต้นของผู้ใช้ที่ใช้ตอนสร้าง metadata
package settings

// Settings ต้องมีฟิลด์ตรงกับ UserSettings ใน client/one-stock/src/types/settings.ts
// ถ้าแก้ที่นี่ ต้องไปแก้ฝั่งนั้นด้วย ไม่งั้นหน้าเว็บอ่านค่าไม่เจอ
type Settings struct {
	KeywordsPerImage int    `json:"keywordsPerImage"`
	TitleStyle       string `json:"titleStyle"`
	// คำต้องห้ามเพิ่มเติมของผู้ใช้ คั่นด้วยจุลภาค
	BlockedTerms string `json:"blockedTerms"`
	// ภาษาของผลลัพธ์ คั่นด้วยจุลภาค เช่น "en,lo" — มี en เสมอ
	OutputLanguages string `json:"outputLanguages"`
}

// Default คือค่าที่ผู้ใช้ใหม่ได้ไปตอนยังไม่เคยบันทึกอะไร
//
// 40 คำเป็นช่วงที่ Adobe Stock ค้นเจอดีที่สุดโดยยังไม่ต้องยัดคำที่ไม่ตรง
// (เพดานจริงของ Adobe คือ 50)
func Default() Settings {
	return Settings{
		KeywordsPerImage: 40,
		TitleStyle:       "descriptive",
		BlockedTerms:     "",
		OutputLanguages:  PrimaryLanguage,
	}
}
