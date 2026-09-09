package generate

import (
	"context"
	"log/slog"

	"github.com/eezy-tech/one-stocks/server/internal/feature/generation"
	"github.com/eezy-tech/one-stocks/server/internal/feature/settings"
	"github.com/eezy-tech/one-stocks/server/internal/shared/apperr"
	"github.com/eezy-tech/one-stocks/server/internal/shared/config"
	"github.com/eezy-tech/one-stocks/server/internal/shared/storage"
	"github.com/eezy-tech/one-stocks/server/internal/shared/util"
)

/*
SettingsReader และ HistoryWriter ประกาศไว้ที่นี่แทนการรับ service ของ
feature อื่นมาทั้งก้อน ระบุเฉพาะเมธอดที่ feature นี้ใช้จริง
ทำให้เห็นชัดว่าพึ่งพาอะไรบ้าง และเปลี่ยนตัวปลอมตอนทดสอบได้ง่าย
*/
type SettingsReader interface {
	Get(ctx context.Context, userID string) (settings.Settings, error)
}

type HistoryWriter interface {
	Insert(ctx context.Context, userID string, in generation.Generation) (generation.Generation, error)
}

type Service interface {
	Generate(ctx context.Context, userID string, req Request) (Response, error)
}

type service struct {
	settings SettingsReader
	history  HistoryWriter
	store    storage.Storage
	gemini   *geminiClient
	model    string
}

func NewService(
	cfg config.Config,
	store storage.Storage,
	settingsReader SettingsReader,
	history HistoryWriter,
) Service {
	model := cfg.GeminiModel
	if model == "" {
		model = DefaultModel
	}
	return &service{
		settings: settingsReader,
		history:  history,
		store:    store,
		gemini:   newGeminiClient(cfg.GeminiAPIKey, model),
		model:    model,
	}
}

func (s *service) Generate(ctx context.Context, userID string, req Request) (Response, error) {
	if !ownsPreviewKey(req.PreviewKey, userID) {
		return Response{}, apperr.Forbidden("access denied for this image")
	}
	if s.gemini.apiKey == "" {
		return Response{}, apperr.Internal("GEMINI_API_KEY is not configured", nil)
	}

	current, err := s.settings.Get(ctx, userID)
	if err != nil {
		return Response{}, err
	}

	image, mediaType, err := s.store.Get(ctx, req.PreviewKey)
	if err != nil {
		slog.Warn("failed to read image from R2", "key", req.PreviewKey, "error", err)
		return Response{}, apperr.NotFound("image not found; it may have been deleted, please re-upload")
	}

	raw, err := s.gemini.generate(ctx, image, mediaType, current)
	if err != nil {
		slog.Error("failed to generate metadata", "userID", userID, "error", err)
		return Response{}, apperr.Internal("failed to generate metadata: "+err.Error(), err)
	}

	result, _ := sanitizeMetadata(raw, current)
	s.save(ctx, userID, req, result)

	return result, nil
}

/*
save เก็บประวัติทุกครั้งที่สร้างสำเร็จ

ตั้งใจให้ล้มเหลวแบบไม่ขัดจังหวะ — ผู้ใช้จ่ายค่าเรียกโมเดลไปแล้ว
ถ้าเขียนประวัติไม่ลงแล้วโยน error ทิ้ง เท่ากับทิ้งผลลัพธ์ที่จ่ายเงินมา
*/
func (s *service) save(ctx context.Context, userID string, req Request, result Response) {
	_, err := s.history.Insert(ctx, userID, generation.Generation{
		Filename:    req.Filename,
		PreviewKey:  util.NilIfEmpty(req.PreviewKey),
		Title:       result.Title,
		Description: result.Description,
		Keywords:    result.Keywords,
		Category:    util.NilIfEmpty(result.Category),
		Provider:    util.Ptr("gemini"),
		Model:       util.NilIfEmpty(s.model),
	})
	if err != nil {
		slog.Warn("บันทึกประวัติไม่สำเร็จ", "userID", userID, "error", err)
	}
}
