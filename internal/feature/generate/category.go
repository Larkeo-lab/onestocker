package generate

/*
AdobeCategories คือหมวดหมู่ของ Adobe Stock

ลำดับในรายการนี้ตรงกับเลขในคอลัมน์ Category ของไฟล์ CSV (เริ่มที่ 1)
เลข 1, 2 และ 21 ยืนยันจากเอกสารทางการแล้ว ที่เหลือควรเทียบกับ
รายการในหน้าอัปโหลดของ Adobe อีกครั้งก่อนใช้งานจริง
*/
var AdobeCategories = []string{
	"Animals",
	"Buildings and Architecture",
	"Business",
	"Drinks",
	"The Environment",
	"States of Mind",
	"Food",
	"Graphic Resources",
	"Hobbies and Leisure",
	"Industry",
	"Landscape",
	"Lifestyle",
	"People",
	"Plants and Flowers",
	"Culture and Religion",
	"Science",
	"Social Issues",
	"Sports",
	"Technology",
	"Transport",
	"Travel",
}

// CategoryNumber คืนเลขหมวดหมู่ที่ Adobe ใช้ในไฟล์ CSV คืน 0 เมื่อไม่รู้จัก
func CategoryNumber(category string) int {
	for i, name := range AdobeCategories {
		if name == category {
			return i + 1
		}
	}
	return 0
}

func isKnownCategory(category string) bool {
	return CategoryNumber(category) > 0
}
