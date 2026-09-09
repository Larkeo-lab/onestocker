AIR_VERSION  := v1.67.4
SQLC_VERSION := v1.31.1

.PHONY: dev run build test lint tidy tools sqlc clean

# รันแบบ live reload — แก้ไฟล์ .go แล้ว build ใหม่ให้เอง
# ไม่มี air ให้รัน `make tools` ก่อน
dev:
	@command -v air >/dev/null 2>&1 || { \
		echo "ไม่พบ air — รัน 'make tools' ก่อน"; exit 1; \
	}
	air

# รันครั้งเดียวไม่ต้อง watch
run:
	go run ./cmd/api

build:
	go build -o bin/api ./cmd/api

test:
	go test ./...

# gofmt + vet ควรผ่านก่อน commit ทุกครั้ง
lint:
	gofmt -l .
	go vet ./...

tidy:
	go mod tidy

# ติดตั้งเครื่องมือสำหรับ dev แบบล็อกเวอร์ชัน
# ไม่ใส่ไว้ใน go.mod เพราะเป็นของใช้ตอน dev ไม่ได้ใช้ตอนรันจริง
tools:
	go install github.com/air-verse/air@$(AIR_VERSION)
	go install github.com/sqlc-dev/sqlc/cmd/sqlc@$(SQLC_VERSION)

# generate โค้ดฐานข้อมูลจาก query.sql ของแต่ละ feature
# ต้องรันทุกครั้งที่แก้ไฟล์ query.sql หรือเพิ่ม migration ใหม่
sqlc:
	sqlc generate

clean:
	rm -rf bin tmp build-errors.log
