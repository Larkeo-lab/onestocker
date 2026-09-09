#!/usr/bin/env bash
#
# ตั้งเครื่อง EC2 ให้พร้อมรันอิมเมจ — รันครั้งเดียวตอนสร้างเครื่องใหม่
#
# วิธีใช้ (รันบนเครื่อง EC2):
#   curl -fsSL -o setup-ec2.sh <ที่อยู่ไฟล์นี้> && bash setup-ec2.sh
#
# หรือส่งขึ้นไปจากเครื่องเรา:
#   scp scripts/setup-ec2.sh ec2-user@<ip>:~ && ssh ec2-user@<ip> 'bash setup-ec2.sh'
#
# รองรับ Amazon Linux 2023 เป็นหลัก (AMI เริ่มต้นของ AWS)
# ถ้าใช้ Ubuntu คำสั่งลง docker จะต่างออกไป ดู https://docs.docker.com/engine/install/ubuntu/

set -euo pipefail

COMPOSE_VERSION=v2.40.3

say() { printf '\n── %s\n' "$1"; }

# ─── ตรวจว่าเป็นเครื่องที่รองรับ ────────────────────────────────
if ! command -v dnf >/dev/null 2>&1; then
  echo "สคริปต์นี้เขียนสำหรับ Amazon Linux 2023 (ใช้ dnf)" >&2
  echo "เครื่องนี้ไม่มี dnf — ถ้าเป็น Ubuntu ให้ลง docker ตามคู่มือของ Docker แทน" >&2
  exit 1
fi

# ─── Docker ────────────────────────────────────────────────────
say "ลง Docker"
if command -v docker >/dev/null 2>&1; then
  echo "  มีอยู่แล้ว: $(docker --version)"
else
  sudo dnf install -y docker
fi

sudo systemctl enable --now docker

# เพิ่มผู้ใช้เข้ากลุ่ม docker จะได้ไม่ต้อง sudo ทุกครั้ง
# ต้อง logout แล้ว login ใหม่ถึงจะมีผล
if ! id -nG "$USER" | grep -qw docker; then
  sudo usermod -aG docker "$USER"
  NEED_RELOGIN=1
fi

# ─── Docker Compose ────────────────────────────────────────────
# Amazon Linux 2023 ไม่มีแพ็กเกจ docker-compose-plugin ในรีโป
# ต้องโหลดไบนารีมาวางเองที่โฟลเดอร์ปลั๊กอินของ docker
say "ลง Docker Compose plugin"
if docker compose version >/dev/null 2>&1; then
  echo "  มีอยู่แล้ว: $(docker compose version --short)"
else
  case "$(uname -m)" in
    x86_64)  ARCH=x86_64 ;;   # t3, t3a
    aarch64) ARCH=aarch64 ;;  # t4g
    *) echo "ไม่รู้จักสถาปัตยกรรม $(uname -m)" >&2; exit 1 ;;
  esac

  PLUGIN_DIR=/usr/local/lib/docker/cli-plugins
  sudo mkdir -p "$PLUGIN_DIR"
  sudo curl -fsSL \
    "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-${ARCH}" \
    -o "$PLUGIN_DIR/docker-compose"
  sudo chmod +x "$PLUGIN_DIR/docker-compose"
  echo "  ลงแล้ว: $(docker compose version --short 2>/dev/null || echo "$COMPOSE_VERSION")"
fi

# ─── Swap ──────────────────────────────────────────────────────
# เครื่อง 1 GB (t3.micro / t4g.micro) ไม่มี swap มาให้
# ถ้ามีอะไรพุ่งขึ้นมาแวบเดียว OOM killer จะฆ่า container ทิ้งทันที
# swap 1 GB เป็นตาข่ายรองรับ ไม่ได้ทำให้ช้าลงถ้าหน่วยความจำยังพอ
say "ตั้ง swap"
if sudo swapon --show | grep -q swapfile; then
  echo "  มีอยู่แล้ว"
else
  sudo dd if=/dev/zero of=/swapfile bs=1M count=1024 status=none
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || \
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  echo "  สร้าง swap 1 GB แล้ว"
fi

# ─── สรุป ──────────────────────────────────────────────────────
say "สรุป"
printf '  docker         : %s\n' "$(docker --version 2>/dev/null || echo 'ไม่พบ')"
printf '  docker compose : %s\n' "$(docker compose version --short 2>/dev/null || echo 'ไม่พบ')"
printf '  หน่วยความจำ    : %s\n' "$(free -h | awk '/^Mem:/{print $2}')"
printf '  swap           : %s\n' "$(free -h | awk '/^Swap:/{print $2}')"
printf '  ดิสก์          : %s ว่าง\n' "$(df -h / | awk 'NR==2{print $4}')"

if [[ -n "${NEED_RELOGIN:-}" ]]; then
  cat <<'MSG'

  ⚠ เพิ่งเพิ่มผู้ใช้เข้ากลุ่ม docker — ต้อง logout แล้ว login ใหม่ก่อน
    ไม่งั้นจะต้องพิมพ์ sudo นำหน้าทุกคำสั่ง docker
MSG
fi

cat <<'MSG'

  ขั้นต่อไป — คัดลอก .env ขึ้นมาวางที่เครื่องนี้:
    make deploy-env EC2=ec2-user@<ip>

  แล้วค่อยส่งอิมเมจขึ้นมา:
    make deploy EC2=ec2-user@<ip>
MSG
