# syntax=docker/dockerfile:1

# ─── ขั้น build ────────────────────────────────────────────────
# ตรึงรุ่น Go ให้ตรงกับ go.mod ไม่งั้นเครื่อง build กับ CI จะได้ผลไม่เหมือนกัน
#
# --platform=$BUILDPLATFORM บังคับให้ขั้นนี้รันด้วยสถาปัตยกรรมของเครื่องที่
# build อยู่จริง แล้วให้ Go ข้ามคอมไพล์ไปหาเป้าหมายเอง
#
# จำเป็นเพราะเครื่อง dev เป็น Apple Silicon (arm64) ถ้าไม่ใส่บรรทัดนี้
# การ build สำหรับ t3 (amd64) จะถูกจำลองผ่าน QEMU ทั้งขั้นตอน ช้ากว่าหลายเท่า
# ส่วน Go ข้ามคอมไพล์ได้ในตัวอยู่แล้ว จึงเร็วเท่ากันทั้งสองเป้าหมาย
FROM --platform=$BUILDPLATFORM golang:1.25-alpine AS build

WORKDIR /src

# คัดลอกไฟล์ dependency ก่อนโค้ด เพื่อให้ layer ของ go mod download
# ถูกใช้ซ้ำได้ตราบใดที่ go.mod/go.sum ไม่เปลี่ยน — build รอบถัดไปเร็วขึ้นมาก
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .

# buildx ใส่ค่าสองตัวนี้ให้เองตาม --platform ที่สั่ง
# t4g (Graviton) ได้ arm64 ส่วน t3/t3a ได้ amd64
ARG TARGETOS
ARG TARGETARCH

# CGO_ENABLED=0 ทำให้ได้ไบนารีที่ไม่ผูกกับ libc ของเครื่องไหนเลย
# จึงเอาไปวางบน image เปล่าที่ไม่มี shell ได้ และเป็นเงื่อนไขของการข้ามคอมไพล์ด้วย
#
# -trimpath ตัด path ของเครื่อง build ออกจากไบนารี
# -s -w ตัดตารางสัญลักษณ์และ debug info ออก ไฟล์เล็กลงราวหนึ่งในสาม
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build \
      -trimpath \
      -ldflags="-s -w" \
      -o /out/api ./cmd/api

# ─── ขั้นรัน ───────────────────────────────────────────────────
# static-debian12 มีแค่ใบรับรอง CA กับ /etc/passwd ไม่มี shell ไม่มี package manager
# ผิวสัมผัสที่โดนโจมตีได้จึงเล็กมาก และ image รวมแล้วราว 20 MB
#
# ต้องมีใบรับรอง CA เพราะแอปต่อ HTTPS ออกนอกตลอด (Neon, R2, Gemini, Clerk)
FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=build /out/api /api

# รันด้วยผู้ใช้ธรรมดา ไม่ใช่ root — มากับ tag :nonroot อยู่แล้ว
USER nonroot:nonroot

EXPOSE 8080

# ไม่ใส่ HEALTHCHECK เพราะ image ไม่มี shell ให้เรียก
# ให้ตัวที่อยู่ข้างนอก (ALB, systemd, uptime monitor) เรียก GET /healthz แทน
ENTRYPOINT ["/api"]
