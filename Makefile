AIR_VERSION  := v1.67.4
SQLC_VERSION := v1.31.1

IMAGE := one-stocks-api
TAG   := $(shell git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d-%H%M)

# สถาปัตยกรรมของเครื่องปลายทาง — t3/t3a เป็น amd64 ส่วน t4g เป็น arm64
#
# ไม่ว่าเลือกอันไหน build ก็เร็วเท่ากัน เพราะ Dockerfile ให้ Go ข้ามคอมไพล์
# ไปหาเป้าหมายเอง ไม่ได้จำลองทั้งขั้นตอนผ่าน QEMU
PLATFORM ?= linux/amd64

.PHONY: dev run build test lint tidy tools sqlc clean \
        docker-build docker-run docker-stop docker-save \
        check-ec2 setup-ec2 deploy-env deploy logs

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

# ─── Docker ────────────────────────────────────────────────────

# build อิมเมจสำหรับ EC2 แล้วตั้ง tag เป็น commit ปัจจุบัน
# ติด latest ไว้ด้วยเพื่อให้ compose.yaml หยิบตัวล่าสุดได้โดยไม่ต้องแก้
docker-build:
	docker build --platform $(PLATFORM) \
	  -t $(IMAGE):$(TAG) -t $(IMAGE):latest .
	@echo
	@docker images $(IMAGE) --format '  {{.Repository}}:{{.Tag}}  {{.Size}}'

# ลองรันอิมเมจบนเครื่องก่อนส่งขึ้นจริง ใช้ .env ตัวเดียวกับตอน dev
docker-run: docker-build
	docker compose up -d
	@echo "  ขึ้นแล้วที่ http://localhost:$${PORT:-8080}/healthz"

docker-stop:
	docker compose down

# บีบอิมเมจเป็นไฟล์เดียวไว้ส่งขึ้น EC2
docker-save: docker-build
	docker save $(IMAGE):$(TAG) $(IMAGE):latest | gzip > $(IMAGE)-$(TAG).tar.gz
	@ls -lh $(IMAGE)-$(TAG).tar.gz | awk '{print "  " $$9 "  " $$5}'

# คำสั่ง ssh/scp ที่ใส่ไฟล์กุญแจให้ถ้ามีการระบุ EC2_KEY
SSH = ssh $(if $(EC2_KEY),-i $(EC2_KEY),) $(EC2)
SCP = scp $(if $(EC2_KEY),-i $(EC2_KEY),)

# ตรวจก่อนทำอย่างอื่น ไม่งั้น deploy จะ build จนเสร็จแล้วค่อยมาฟ้องว่าลืมใส่ EC2
check-ec2:
	@test -n "$(EC2)" || { \
		echo "ต้องระบุปลายทาง เช่น  make $(MAKECMDGOALS) EC2=ec2-user@1.2.3.4"; \
		exit 1; \
	}

# ตั้งเครื่อง EC2 ครั้งแรก — ลง docker, compose plugin และ swap
#
#   make setup-ec2 EC2=ec2-user@1.2.3.4
setup-ec2: check-ec2
	$(SCP) scripts/setup-ec2.sh $(EC2):~/
	$(SSH) 'bash setup-ec2.sh && rm -f setup-ec2.sh'

# คัดลอก .env.production ขึ้นเครื่องปลายทาง (ไปวางเป็น ~/.env ที่นั่น)
#
# ส่ง .env.production ไม่ใช่ .env เพราะ .env เป็นค่าสำหรับเครื่องตัวเอง
# ถ้าเผลอส่งขึ้นไปจะได้ APP_ENV=development และคีย์ Clerk ของ instance dev
#
# แยกเป็นคำสั่งของตัวเองเพราะเป็นความลับ ไม่ควรถูกส่งขึ้นไปโดยไม่ตั้งใจ
# ทุกครั้งที่ deploy — ส่งครั้งเดียวตอนตั้งเครื่อง แล้วแก้บนเครื่องนั้นเมื่อจำเป็น
deploy-env: check-ec2
	@test -f .env.production || { \
		echo "ไม่พบไฟล์ .env.production — คัดลอกจาก .env.example แล้วเติมค่าของเครื่องจริง"; \
		exit 1; \
	}
	@grep -q '^APP_ENV=production' .env.production || { \
		echo "ใน .env.production ต้องตั้ง APP_ENV=production"; exit 1; \
	}
	@grep -q '^CLERK_SECRET_KEY=sk_live_' .env.production || { \
		echo "เตือน: CLERK_SECRET_KEY ใน .env.production ไม่ใช่คีย์ production (sk_live_)"; \
	}
	$(SCP) .env.production $(EC2):~/.env
	$(SSH) 'chmod 600 ~/.env'
	@echo "  ส่งขึ้นแล้ว วางเป็น ~/.env บนเครื่องปลายทาง"

# ดู log ของ container บนเครื่องปลายทาง
logs: check-ec2
	$(SSH) 'docker compose logs -f --tail=100'

# ส่งอิมเมจขึ้น EC2 แล้วสั่งรันใหม่ ไม่ต้องมี registry
#
#   make deploy EC2=ec2-user@1.2.3.4
#
# ตั้ง EC2_KEY เพิ่มได้ถ้าใช้ไฟล์กุญแจที่ไม่ใช่ตัวเริ่มต้น
#   make deploy EC2=... EC2_KEY=~/.ssh/one-stocks.pem
deploy: check-ec2 docker-save
	@echo "── ส่งอิมเมจขึ้นเครื่องปลายทาง"
	$(SCP) $(IMAGE)-$(TAG).tar.gz compose.yaml $(EC2):~/
	@echo "── ตรวจว่ามี .env อยู่บนเครื่องแล้ว"
	$(SSH) 'test -f ~/.env || { echo "ไม่พบ ~/.env — รัน make deploy-env ก่อน"; exit 1; }'
	@echo "── โหลดแล้วสั่งรันใหม่"
	$(SSH) 'gunzip -c $(IMAGE)-$(TAG).tar.gz | docker load \
	  && docker compose up -d \
	  && rm -f $(IMAGE)-$(TAG).tar.gz \
	  && docker image prune -f'
	@echo "── ตรวจว่าขึ้นจริง"
	$(SSH) 'sleep 2 && curl -s localhost:8080/healthz && echo'

clean:
	rm -rf bin tmp build-errors.log $(IMAGE)-*.tar.gz
