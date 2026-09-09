package config

import (
	"os"
	"strconv"
	"strings"
)

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func number(key string, fallback int) int {
	value, err := strconv.Atoi(env(key, ""))
	if err != nil {
		return fallback
	}
	return value
}

func boolean(key string, fallback bool) bool {
	value, err := strconv.ParseBool(env(key, ""))
	if err != nil {
		return fallback
	}
	return value
}

// list อ่านค่าที่คั่นด้วยจุลภาค เช่น ALLOWED_ORIGINS
func list(key, fallback string) []string {
	var items []string
	for _, part := range strings.Split(env(key, fallback), ",") {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			items = append(items, trimmed)
		}
	}
	return items
}
