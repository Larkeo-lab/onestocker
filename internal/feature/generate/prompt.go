package generate

import (
	"fmt"
	"strings"

	"github.com/eezy-tech/one-stocks/server/internal/feature/settings"
)

var titleRules = map[string]string{
	"descriptive": "- One natural, descriptive line about what is actually visible. A full sentence is not required — a rich noun phrase reads better in search results.",
	"concise":     "- A short noun phrase naming the subject and its key context. Not a full sentence.",
	"commercial":  "- A phrase written for a buyer browsing results: lead with the subject, then the mood or use case. Stay accurate to the image.",
}

/*
keywordFacets คือมุมที่ต้องไล่ให้ครบตอนคิดคีย์เวิร์ด

นี่คือหัวใจของคุณภาพคีย์เวิร์ด ถ้าไม่ไล่เป็นข้อ ๆ โมเดลจะให้คำที่
"ถูกแต่ไม่ครบ" — ได้ชื่อวัตถุกับสีมา แต่ตกคำที่คนซื้อพิมพ์ค้นหาจริง
เช่น คำพ้องความหมาย เทคนิคที่ใช้วาด และงานที่เอาภาพไปทำต่อ
*/
var keywordFacets = []string{
	"Subject — what it is, and the other words buyers use for the same thing (poppy, wildflower, blossom).",
	"The broader class it belongs to (flower, plant, vehicle, transport).",
	"Named varieties and close relatives a buyer might search instead (cornflower, daisy, cherry blossom, apple blossom).",
	"Visible parts and details that carry their own searches (stem, leaf, petal, twig, wheel, headlight).",
	"Medium and technique — say how the image was made when it is not a plain photograph (watercolor, hand painted, hand drawn, illustration, sketch, clip art, 3d render).",
	"Material, finish and colour, including the specific shade (crimson, burgundy, peach, metallic, glossy).",
	"Action or state (blooming, parked, riding, standing).",
	"Setting, season or where this belongs (meadow, field, urban, studio, spring, summer).",
	"How the shot is presented (isolated, white background, cut out, border, side view, close-up, copy space, no people).",
	"Character and mood (delicate, soft, rustic, vintage, modern, sleek, luxury).",
	"What a buyer would make with it (greeting card, wedding invitation, wallpaper, packaging, poster, print, background, decoration).",
	"The concept behind the image (nature, romance, mobility, commuting, lifestyle, technology, design).",
}

// translationSection ถูกใส่เข้าไปเฉพาะเมื่อผู้ใช้เลือกภาษารอง
func translationSection(languages []settings.Language) string {
	if len(languages) == 0 {
		return ""
	}

	names := make([]string, 0, len(languages))
	for _, language := range languages {
		names = append(names, fmt.Sprintf("%s (%s)", language.Name, language.Code))
	}

	return `

TRANSLATIONS
- After the English metadata, repeat the title, description and keywords in: ` + strings.Join(names, ", ") + `.
- Leave the English fields exactly as they are. A translation is an addition, never a replacement.
- Translate the meaning, not word by word. Use the words a native speaker of that language would actually type when searching for this image.
- Keep the same keyword order and the same number of keywords as the English list.
- Leave a term in English when that is what people in that language really use, or when it has no natural translation.
- The category stays in English.`
}

/*
buildSystemPrompt คือคำสั่งหลักที่กำหนดคุณภาพของผลลัพธ์

กฎในนี้มาจากแนวทางของ Adobe Stock โดยตรง เพราะ metadata ที่ผิดกฎ
ทำให้ภาพถูกปฏิเสธหรือถูกลดอันดับการค้นหา ซึ่งกระทบยอดขายโดยตรง

ส่วนที่ผู้ใช้ตั้งค่าเองได้จะถูกเสียบเข้ามาตรงนี้
*/
func buildSystemPrompt(current settings.Settings) string {
	target := current.KeywordsPerImage
	lower := target - 5
	if lower < 10 {
		lower = 10
	}

	titleRule, ok := titleRules[current.TitleStyle]
	if !ok {
		titleRule = titleRules["descriptive"]
	}

	facets := make([]string, 0, len(keywordFacets))
	for i, facet := range keywordFacets {
		facets = append(facets, fmt.Sprintf("  %d. %s", i+1, facet))
	}

	return `You write metadata for stock photography and illustration that will be submitted to Adobe Stock, Shutterstock and similar marketplaces. Your metadata decides whether the image is ever found, so write for the buyer who is searching, not for a caption.

Write the English fields in English, regardless of the language of these instructions.

Read the image properly before writing: name the subject, then take stock of its parts, its colours, how it was made, how it is framed, and what a buyer would license it for.

TITLE
` + titleRule + `
- Lead with the subject, then what makes this shot specific — its setting, its action, or how it is presented.
- Name the medium when the image is not a plain photograph: "watercolor", "hand drawn", "3d render".
- If the subject is cut out on a plain backdrop, say so: "isolated on white background".
- Aim for 70 characters or fewer. Never exceed 200.
- No keyword stuffing, no lists separated by commas.

DESCRIPTION
- One or two sentences adding context a buyer would search for: setting, mood, lighting, action, and what it suits.
- Maximum 200 characters.

KEYWORDS
- ` + fmt.Sprintf("%d to %d", lower, target) + ` keywords, ordered by how likely a buyer is to search that word and license this image — commercial value first, not just accuracy.
- The first ten decide whether the image is found at all. Put the subject, its strongest synonyms, the medium, and its defining attribute there.
- Work down this list and take every term that genuinely applies. Skip a facet when it does not fit the image — never invent one to fill it:
` + strings.Join(facets, "\n") + `
- Synonyms are not duplicates. Someone searching "poppy" and someone searching "wildflower" want this same image, so give both. What you must not repeat is one word twice, or a word and its plural.
- Mostly single words. Use a two-word phrase only when that is how people actually search: "white background", "greeting card", "hand drawn".
- Accuracy first — every keyword must be defensible from what is visible. But do not stop early either: while facets above are still unused and real, keep going.
- Never hedge with opposites. Pick the one that matches and drop the other: sunrise or sunset, dawn or dusk, summer or winter, indoor or outdoor, day or night. Listing both is a wrong keyword, not a safer one.

NEVER INCLUDE
- Trademarks or brand names (Nike, iPhone, Coca-Cola, Disney...). Name the object generically instead — "scooter", not the make and model.
- Anything owned by someone else: named artworks, characters, franchises, studios, or a living artist's name or signature style. Metadata that claims someone else's work invites rejection.
- Names of real people, or guesses about who someone is.
- Camera or software names, lens or exposure details.
- Words about image quality (high resolution, 4k, stock photo, royalty free).
- Anything you cannot actually see in the image.

CATEGORY
- Choose exactly one from: ` + strings.Join(AdobeCategories, ", ") + `.` +
		translationSection(settings.ExtraLanguages(current.OutputLanguages)) + `

Describe only what is visible. If you are unsure about a detail, leave it out rather than guessing.`
}

const userInstruction = "Write stock metadata for this image following the rules exactly. Work through every keyword facet before you answer."
