package generate

import (
	"fmt"
	"slices"

	"github.com/eezy-tech/one-stocks/server/internal/feature/settings"
)

/*
sanitizeMetadata บังคับให้ผลลัพธ์อยู่ในกฎของ Adobe Stock ก่อนส่งกลับไปแสดง

คืนรายการสิ่งที่ถูกแก้มาด้วย เพื่อบอกผู้ใช้ว่าเกิดอะไรขึ้นกับผลลัพธ์
ไม่ใช่แก้เงียบ ๆ แล้วให้ไปงงเองว่าทำไมได้คีย์เวิร์ดไม่ครบตามที่ตั้งไว้
*/
func sanitizeMetadata(input metadata, current settings.Settings) (Response, []string) {
	var notes []string

	terms := slices.Concat(blockedTerms, parseBlockedTerms(current.BlockedTerms))

	limit := current.KeywordsPerImage
	if limit > KeywordsMax || limit <= 0 {
		limit = KeywordsMax
	}

	title := removeBlockedWords(input.Title, terms)
	if title != input.Title {
		notes = append(notes, "ตัดชื่อแบรนด์ออกจาก title")
	}
	if shortened := truncateAtWord(title, TitleMax); shortened != title {
		title = shortened
		notes = append(notes, fmt.Sprintf("ตัด title ให้เหลือ %d ตัวอักษร", TitleMax))
	}

	description := removeBlockedWords(input.Description, terms)
	if description != input.Description {
		notes = append(notes, "ตัดชื่อแบรนด์ออกจาก description")
	}
	if shortened := truncateAtWord(description, DescriptionMax); shortened != description {
		description = shortened
		notes = append(notes, fmt.Sprintf("ตัด description ให้เหลือ %d ตัวอักษร", DescriptionMax))
	}

	keywords, blocked := cleanKeywords(input.Keywords, terms, limit)
	if blocked > 0 {
		notes = append(notes, fmt.Sprintf("ตัดคีย์เวิร์ดที่ผิดกฎออก %d คำ", blocked))
	}

	// ฉบับแปลผ่านกฎเดียวกับภาษาอังกฤษ คำต้องห้ามไม่ได้หายไปเพราะเปลี่ยนภาษา
	translations := make([]Translation, 0, len(input.Translations))
	for _, item := range input.Translations {
		cleaned, _ := cleanKeywords(item.Keywords, terms, limit)
		translations = append(translations, Translation{
			Language:    item.Language,
			Title:       truncateAtWord(removeBlockedWords(item.Title, terms), TitleMax),
			Description: truncateAtWord(removeBlockedWords(item.Description, terms), DescriptionMax),
			Keywords:    cleaned,
		})
	}

	return Response{
		Title:        title,
		Description:  description,
		Keywords:     keywords,
		Category:     input.Category,
		Translations: translations,
		Notes:        notes,
	}, notes
}
