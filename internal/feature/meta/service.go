package meta

import (
	"context"

	"github.com/eezy-tech/one-stocks/server/internal/feature/generate"
	"github.com/eezy-tech/one-stocks/server/internal/feature/settings"
	"github.com/eezy-tech/one-stocks/server/internal/feature/upload"
	"github.com/eezy-tech/one-stocks/server/internal/shared/config"
)

type Service interface {
	Get(ctx context.Context) (Meta, error)
}

type service struct {
	cfg config.Config
}

func NewService(cfg config.Config) Service {
	return &service{cfg: cfg}
}

func (s *service) Get(_ context.Context) (Meta, error) {
	// ค่าทั้งหมดอ่านมาจาก feature ที่เป็นเจ้าของจริง ไม่ได้พิมพ์ซ้ำที่นี่
	languages := make([]Language, 0, len(settings.SupportedLanguages))
	for _, lang := range settings.SupportedLanguages {
		languages = append(languages, Language{
			Code:    lang.Code,
			Name:    lang.Name,
			Native:  lang.Native,
			Primary: lang.Code == settings.PrimaryLanguage,
		})
	}

	return Meta{
		Provider:    "gemini",
		Model:       s.cfg.GeminiModel,
		MaxAssets:   upload.MaxItemsPerRequest,
		KeywordsMax: generate.KeywordsMax,
		Languages:   languages,
	}, nil
}
