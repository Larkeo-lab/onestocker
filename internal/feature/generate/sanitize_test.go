package generate

import "testing"

func TestReplaceWholeWord(t *testing.T) {
	cases := []struct{ text, term, want string }{
		// ต้องไม่กินคำอื่นที่มีคำต้องห้ามอยู่ข้างใน
		{"pineapple on a plate", "apple", "pineapple on a plate"},
		{"a red apple", "apple", "a red "},
		{"nike shoes", "nike", " shoes"},
		{"unikely", "nike", "unikely"},
		{"coca cola bottle", "coca cola", " bottle"},
	}
	for _, c := range cases {
		if got := replaceWholeWord(c.text, c.term, ""); got != c.want {
			t.Errorf("replaceWholeWord(%q, %q) = %q ต้องได้ %q", c.text, c.term, got, c.want)
		}
	}
}

func TestCleanKeywords(t *testing.T) {
	input := []string{"Scooter", "scooter", "nike", "  ", "vespa", "stock photo", "wheel"}
	got, blocked := cleanKeywords(input, blockedTerms, 10)

	if blocked != 2 {
		t.Errorf("ต้องตัดคำต้องห้าม 2 คำ ได้ %d", blocked)
	}
	want := []string{"scooter", "vespa", "wheel"}
	if len(got) != len(want) {
		t.Fatalf("ได้ %v ต้องได้ %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("ตำแหน่ง %d ได้ %q ต้องได้ %q", i, got[i], want[i])
		}
	}
}

func TestTruncateAtWordCountsRunesNotBytes(t *testing.T) {
	thai := "ภาพวาดสีน้ำดอกไม้บนพื้นหลังสีขาว"
	if got := truncateAtWord(thai, 200); got != thai {
		t.Errorf("ข้อความไทยสั้นกว่าเพดานต้องไม่ถูกตัด ได้ %q", got)
	}
	if got := len([]rune(truncateAtWord(thai, 10))); got > 10 {
		t.Errorf("ตัดแล้วต้องไม่เกิน 10 ตัวอักษร ได้ %d", got)
	}
}
