package util

import "strings"

// SplitCSV แยกข้อความที่คั่นด้วยจุลภาคหรือขึ้นบรรทัดใหม่
// ตัดช่องว่างหัวท้ายและทิ้งตัวที่ว่างเปล่าออก
func SplitCSV(value string) []string {
	var items []string
	for _, part := range strings.FieldsFunc(value, func(r rune) bool {
		return r == ',' || r == '\n'
	}) {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			items = append(items, trimmed)
		}
	}
	return items
}

// JoinCSV รวมกลับเป็นข้อความเดียว คั่นด้วย ", "
func JoinCSV(items []string) string {
	return strings.Join(items, ", ")
}

// Dedupe ตัดตัวซ้ำออกโดยคงลำดับเดิมไว้
func Dedupe(items []string) []string {
	seen := make(map[string]bool, len(items))
	result := make([]string, 0, len(items))

	for _, item := range items {
		if !seen[item] {
			seen[item] = true
			result = append(result, item)
		}
	}
	return result
}

// LowerAll แปลงเป็นตัวพิมพ์เล็กทั้งหมด
func LowerAll(items []string) []string {
	result := make([]string, len(items))
	for i, item := range items {
		result[i] = strings.ToLower(item)
	}
	return result
}

// Truncate ตัดข้อความให้ยาวไม่เกิน max
//
// นับเป็นตัวอักษร ไม่ใช่ไบต์ เพราะภาษาไทยและลาวตัวหนึ่งกินหลายไบต์
// ถ้าตัดตามไบต์จะได้ตัวอักษรพังกลางตัว
func Truncate(value string, max int) string {
	if max <= 0 {
		return ""
	}
	runes := []rune(value)
	if len(runes) <= max {
		return value
	}
	return string(runes[:max])
}
