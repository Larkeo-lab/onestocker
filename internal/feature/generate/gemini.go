package generate

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math/rand"
	"net/http"
	"time"

	"github.com/eezy-tech/one-stocks/server/internal/feature/settings"
)

/*
apiBase เรียก REST ตรง ๆ ไม่ผ่าน SDK อย่างเป็นทางการ

เหตุผล: บน Cloudflare Worker การเรียกผ่าน SDK ถูก Google ปฏิเสธด้วย
"User location is not supported for the API use." ขณะที่ fetch ตรงไปยัง
endpoint เดียวกัน จาก worker ตัวเดียวกัน คีย์เดียวกัน ได้ 200 ปกติ
(ยืนยันด้วยการวัดบน production แล้ว) จึงตัด SDK ออกจากเส้นทางนี้ตั้งแต่ต้น
*/
const apiBase = "https://generativelanguage.googleapis.com/v1beta/models"

/*
DefaultModel ตรึงรุ่นไว้ชัดเจนเพื่อให้ผลลัพธ์คงเส้นคงวา

ใช้ Flash-Lite เพราะโควตาต่อวันสูงกว่ารุ่น Flash เต็มมาก
และงานบรรยายภาพไม่ต้องใช้ความสามารถระดับรุ่นใหญ่

ถ้าเจอ 404 แปลว่ารุ่นนี้ถูกปลดระวาง ให้เปลี่ยนที่ GEMINI_MODEL ใน .env
*/
const DefaultModel = "gemini-3.5-flash-lite"

/** การเรียกโมเดลหนึ่งครั้งใช้เวลา 5-10 วิ เผื่อไว้ให้พอสำหรับตอนช้า */
const requestTimeout = 60 * time.Second

/** สถานะที่ถือว่าเป็นปัญหาชั่วคราว ลองใหม่แล้วมีโอกาสสำเร็จ */
var retryableStatus = map[int]bool{
	http.StatusRequestTimeout:      true,
	http.StatusTooManyRequests:     true,
	http.StatusInternalServerError: true,
	http.StatusBadGateway:          true,
	http.StatusServiceUnavailable:  true,
	http.StatusGatewayTimeout:      true,
}

const maxAttempts = 3

// httpError ผูก status ไว้กับ error เพื่อให้รู้ว่าควรลองใหม่ไหม
type httpError struct {
	status  int
	message string
}

func (e *httpError) Error() string { return e.message }

/** ผลลัพธ์ดิบที่โมเดลตอบกลับมา ก่อนผ่านตัวกรอง */
type metadata struct {
	Title        string        `json:"title"`
	Description  string        `json:"description"`
	Keywords     []string      `json:"keywords"`
	Category     string        `json:"category"`
	Translations []Translation `json:"translations,omitempty"`
}

type geminiClient struct {
	apiKey string
	model  string
	http   *http.Client
}

func newGeminiClient(apiKey, model string) *geminiClient {
	if model == "" {
		model = DefaultModel
	}
	return &geminiClient{
		apiKey: apiKey,
		model:  model,
		http:   &http.Client{Timeout: requestTimeout},
	}
}

/*
buildResponseSchema บังคับรูปแบบผลลัพธ์ฝั่ง Gemini เอง

สร้างใหม่ทุกครั้งเพราะช่อง translations ขึ้นกับภาษาที่ผู้ใช้เลือก
ถ้าเลือกแต่อังกฤษก็ไม่ต้องมีช่องนี้เลย โมเดลจะได้ไม่พยายามแปล
*/
func buildResponseSchema(languages []settings.Language) map[string]any {
	properties := map[string]any{
		"title":       map[string]any{"type": "STRING"},
		"description": map[string]any{"type": "STRING"},
		"keywords":    map[string]any{"type": "ARRAY", "items": map[string]any{"type": "STRING"}},
		"category":    map[string]any{"type": "STRING", "enum": AdobeCategories},
	}
	required := []string{"title", "description", "keywords", "category"}

	if len(languages) > 0 {
		codes := make([]string, 0, len(languages))
		for _, language := range languages {
			codes = append(codes, language.Code)
		}

		properties["translations"] = map[string]any{
			"type": "ARRAY",
			"items": map[string]any{
				"type": "OBJECT",
				"properties": map[string]any{
					"language":    map[string]any{"type": "STRING", "enum": codes},
					"title":       map[string]any{"type": "STRING"},
					"description": map[string]any{"type": "STRING"},
					"keywords":    map[string]any{"type": "ARRAY", "items": map[string]any{"type": "STRING"}},
				},
				"required": []string{"language", "title", "description", "keywords"},
			},
		}
		required = append(required, "translations")
	}

	return map[string]any{"type": "OBJECT", "properties": properties, "required": required}
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error struct {
		Message string `json:"message"`
	} `json:"error"`
}

func (c *geminiClient) generate(
	ctx context.Context,
	image []byte,
	mediaType string,
	current settings.Settings,
) (metadata, error) {
	body, err := json.Marshal(map[string]any{
		"systemInstruction": map[string]any{
			"parts": []any{map[string]any{"text": buildSystemPrompt(current)}},
		},
		"contents": []any{
			map[string]any{
				"role": "user",
				"parts": []any{
					map[string]any{"inlineData": map[string]any{
						"mimeType": mediaType,
						"data":     base64.StdEncoding.EncodeToString(image),
					}},
					map[string]any{"text": userInstruction},
				},
			},
		},
		"generationConfig": map[string]any{
			"responseMimeType": "application/json",
			"responseSchema": buildResponseSchema(
				settings.ExtraLanguages(current.OutputLanguages),
			),
		},
	})
	if err != nil {
		return metadata{}, fmt.Errorf("ประกอบคำขอไม่สำเร็จ: %w", err)
	}

	parsed, err := c.call(ctx, body)
	if err != nil {
		return metadata{}, err
	}

	if len(parsed.Candidates) == 0 || len(parsed.Candidates[0].Content.Parts) == 0 {
		return metadata{}, errors.New("โมเดลไม่ได้ตอบข้อความกลับมา")
	}

	var result metadata
	text := parsed.Candidates[0].Content.Parts[0].Text
	if err := json.Unmarshal([]byte(text), &result); err != nil {
		return metadata{}, fmt.Errorf("อ่านคำตอบของโมเดลไม่ได้: %w", err)
	}

	// responseSchema บังคับไว้แล้ว แต่ตรวจซ้ำเพราะค่านี้ไปโผล่ในไฟล์ที่ส่ง Adobe
	if !isKnownCategory(result.Category) {
		return metadata{}, fmt.Errorf("โมเดลตอบหมวดหมู่ที่ไม่รู้จัก: %q", result.Category)
	}

	return result, nil
}

/*
call ยิงคำขอพร้อมลองใหม่เมื่อเจอความผิดพลาดชั่วคราวของฝั่งผู้ให้บริการ

Gemini มีช่วงที่คนใช้แน่นแล้วคืน 503 หรือ 429 กลับมา ซึ่งมักหายเอง
ในไม่กี่วินาที การล้มทันทีตั้งแต่ครั้งแรกทำให้ผู้ใช้ต้องมากดเองซ้ำ ๆ
ทั้งที่ระบบรอให้เองได้
*/
func (c *geminiClient) call(ctx context.Context, body []byte) (geminiResponse, error) {
	url := fmt.Sprintf("%s/%s:generateContent", apiBase, c.model)
	var lastErr error

	for attempt := 0; attempt < maxAttempts; attempt++ {
		if attempt > 0 {
			wait := backoff(attempt - 1)
			slog.Warn("Gemini ไม่พร้อมชั่วคราว รอแล้วลองใหม่",
				"wait", wait, "attempt", attempt+1, "of", maxAttempts)

			select {
			case <-ctx.Done():
				return geminiResponse{}, ctx.Err()
			case <-time.After(wait):
			}
		}

		parsed, err := c.once(ctx, url, body)
		if err == nil {
			return parsed, nil
		}
		lastErr = err

		var failure *httpError
		if !errors.As(err, &failure) || !retryableStatus[failure.status] {
			return geminiResponse{}, err
		}
	}

	return geminiResponse{}, lastErr
}

func (c *geminiClient) once(ctx context.Context, url string, body []byte) (geminiResponse, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return geminiResponse{}, err
	}
	request.Header.Set("x-goog-api-key", c.apiKey)
	request.Header.Set("content-type", "application/json")

	response, err := c.http.Do(request)
	if err != nil {
		return geminiResponse{}, fmt.Errorf("เรียก Gemini ไม่สำเร็จ: %w", err)
	}
	defer response.Body.Close()

	var parsed geminiResponse
	if err := json.NewDecoder(response.Body).Decode(&parsed); err != nil {
		return geminiResponse{}, fmt.Errorf("อ่านคำตอบจาก Gemini ไม่ได้: %w", err)
	}

	if response.StatusCode != http.StatusOK {
		message := parsed.Error.Message
		if message == "" {
			message = fmt.Sprintf("Gemini ตอบกลับ %d", response.StatusCode)
		}
		return geminiResponse{}, &httpError{status: response.StatusCode, message: message}
	}

	return parsed, nil
}

// backoff หน่วงเพิ่มขึ้นเรื่อย ๆ พร้อมสุ่มเล็กน้อย
// กันหลายคำขอที่พลาดพร้อมกันยิงซ้ำในจังหวะเดียวกันอีก
func backoff(attempt int) time.Duration {
	base := 800 * time.Millisecond * (1 << attempt)
	return base + time.Duration(rand.Intn(400))*time.Millisecond
}
