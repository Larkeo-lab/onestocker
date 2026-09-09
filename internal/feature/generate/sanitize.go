package generate

import (
	"strings"
	"unicode"
)

/*
blockedTerms คือคำที่ต้องตัดออกเสมอ

โมเดลถูกสั่งไม่ให้ใช้คำพวกนี้อยู่แล้ว แต่คำสั่งอย่างเดียวเชื่อไม่ได้ 100%
ด่านนี้เป็นตัวกรองแบบตายตัวที่ไม่ขึ้นกับโมเดล กัน metadata ผิดกฎหลุดไปถึง Adobe

เก็บเฉพาะคำที่เป็นแบรนด์แน่ ๆ คำที่เป็นทั้งแบรนด์และคำธรรมดา
(apple, windows, puma, amazon, android) ไม่อยู่ในรายการนี้
เพราะการบล็อกมันทำให้ภาพผลไม้เสียคีย์เวิร์ด "apple" และภาพอาคาร
เสียคำว่า "windows" ทั้งที่เป็นคีย์เวิร์ดที่ถูกต้องและขายได้
ส่วนกรณีที่หมายถึงแบรนด์จริง system prompt สั่งห้ามไว้อีกชั้นแล้ว
*/
var blockedTerms = []string{
	// แบรนด์
	"nike", "adidas", "gucci", "prada", "chanel", "rolex",
	"iphone", "ipad", "macbook", "samsung", "google",
	"microsoft", "sony", "canon", "nikon", "gopro", "dji",
	"coca-cola", "coca cola", "pepsi", "starbucks", "mcdonald", "kfc",
	"disney", "marvel", "pixar", "netflix", "lego", "ferrari", "tesla",
	"bmw", "mercedes", "toyota", "honda", "ikea", "facebook",
	"instagram", "tiktok", "youtube",
	// คำที่ Adobe ไม่ให้ใช้เป็นคีย์เวิร์ด
	"stock photo", "stock image", "royalty free", "high resolution",
	"high quality", "copy space free", "4k", "8k", "hdr",
	"photoshop", "lightroom", "adobe",
}

/*
isWordByte บอกว่าไบต์นี้นับเป็นตัวอักษรของคำหรือไม่

นิยามเดียวกับ \w ของ regex คือ A-Z a-z 0-9 _ เท่านั้น
อักษรไทยและลาวจึงไม่นับ ซึ่งตรงกับพฤติกรรมเดิมฝั่ง JavaScript
*/
func isWordByte(b byte) bool {
	return b == '_' ||
		(b >= '0' && b <= '9') ||
		(b >= 'a' && b <= 'z') ||
		(b >= 'A' && b <= 'Z')
}

/*
replaceWholeWord แทนที่ term เฉพาะตอนที่เป็นคำเต็ม ไม่ใช่ส่วนหนึ่งของคำอื่น

ถ้าจับแบบ substring คำว่า "pineapple" จะโดน "apple" ตัดทิ้งไปด้วย

เขียนวนเองแทนการใช้ regexp เพราะ Go ไม่รองรับ lookahead/lookbehind
ซึ่งเป็นวิธีที่ฝั่ง JavaScript ใช้ และจำเป็นเพราะคำที่ผู้ใช้พิมพ์เอง
อาจลงท้ายด้วยอักขระพิเศษ เช่น "c++" ที่ \b ท้ายคำไม่มีวันตรง
*/
func replaceWholeWord(text, term, replacement string) string {
	if term == "" {
		return text
	}

	lowerText := strings.ToLower(text)
	lowerTerm := strings.ToLower(term)

	var out strings.Builder
	cursor := 0

	for cursor < len(lowerText) {
		offset := strings.Index(lowerText[cursor:], lowerTerm)
		if offset < 0 {
			break
		}

		start := cursor + offset
		end := start + len(lowerTerm)

		beforeIsWord := start > 0 && isWordByte(lowerText[start-1])
		afterIsWord := end < len(lowerText) && isWordByte(lowerText[end])

		if beforeIsWord || afterIsWord {
			// อยู่กลางคำอื่น ข้ามไปหาตำแหน่งถัดไป
			out.WriteString(text[cursor : start+1])
			cursor = start + 1
			continue
		}

		out.WriteString(text[cursor:start])
		out.WriteString(replacement)
		cursor = end
	}

	out.WriteString(text[cursor:])
	return out.String()
}

func containsBlocked(value string, terms []string) bool {
	for _, term := range terms {
		if replaceWholeWord(value, term, "\x00") != value {
			return true
		}
	}
	return false
}

func removeBlockedWords(value string, terms []string) string {
	result := value
	for _, term := range terms {
		result = replaceWholeWord(result, term, "")
	}

	// ยุบช่องว่างที่เหลือจากการตัดคำออก และดึงเครื่องหมายวรรคตอนกลับมาชิด
	result = strings.Join(strings.Fields(result), " ")
	result = strings.ReplaceAll(result, " ,", ",")
	result = strings.ReplaceAll(result, " .", ".")
	return strings.TrimSpace(result)
}

/*
truncateAtWord ตัดข้อความที่ขอบเขตคำ ไม่ตัดกลางคำ

นับเป็นตัวอักษร ไม่ใช่ไบต์ เพราะภาษาไทยและลาวตัวหนึ่งกินหลายไบต์
ถ้านับตามไบต์ ฉบับแปลจะถูกตัดสั้นกว่าที่ควรมาก
*/
func truncateAtWord(value string, max int) string {
	runes := []rune(value)
	if len(runes) <= max {
		return value
	}

	cut := string(runes[:max])
	if space := strings.LastIndex(cut, " "); space > max*6/10 {
		cut = cut[:space]
	}
	return strings.TrimSpace(cut)
}

/*
cleanKeywords กรองรายการคีย์เวิร์ด ตัดคำต้องห้าม คำซ้ำ และตัดให้พอดีเพดาน
คืนจำนวนคำที่ถูกตัดออกด้วย เพื่อบอกผู้ใช้ว่าเกิดอะไรขึ้น
*/
func cleanKeywords(input, terms []string, limit int) ([]string, int) {
	seen := make(map[string]bool, len(input))
	keywords := make([]string, 0, limit)
	blocked := 0

	for _, raw := range input {
		keyword := strings.ToLower(strings.TrimSpace(raw))
		if keyword == "" {
			continue
		}
		if containsBlocked(keyword, terms) {
			blocked++
			continue
		}
		if seen[keyword] {
			continue
		}
		seen[keyword] = true
		keywords = append(keywords, keyword)
		if len(keywords) == limit {
			break
		}
	}
	return keywords, blocked
}

// parseBlockedTerms อ่านคำต้องห้ามที่ผู้ใช้ตั้งเองในหน้า Settings
func parseBlockedTerms(value string) []string {
	var terms []string
	for _, term := range strings.FieldsFunc(value, func(r rune) bool {
		return r == ',' || r == '\n' || unicode.IsControl(r)
	}) {
		if trimmed := strings.TrimSpace(term); trimmed != "" {
			terms = append(terms, strings.ToLower(trimmed))
		}
	}
	return terms
}
