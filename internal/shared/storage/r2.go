// Package storage เก็บรูปย่อไว้บน Cloudflare R2
//
// R2 รองรับ S3 API เต็มรูปแบบ จึงใช้ aws-sdk-go-v2 ตัวเดิมได้
// ต่างกันแค่ endpoint และ region ต้องเป็น "auto"
//
// เก็บเฉพาะ "รูปย่อ" เท่านั้น ไฟล์ต้นฉบับอยู่ในเครื่องผู้ใช้
// เพราะระบบต้องใช้รูปแค่สองอย่าง — ส่งให้ AI ดู และทำ thumbnail
// ซึ่งรูปย่อพอทั้งคู่ ทำให้ 10 GB ที่ R2 แถมฟรีรองรับได้ราว 50,000 รูป
package storage

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"regexp"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"github.com/eezy-tech/one-stocks/server/internal/shared/config"
)

/** รูปย่อถูกแปลงเป็น webp ตั้งแต่ในเบราว์เซอร์เสมอ */
const PreviewContentType = "image/webp"

/** ลิงก์ดูรูปอายุยาวกว่าลิงก์อัป พอให้เปิดหน้า History ค้างไว้ได้สักพัก */
const downloadTTL = time.Hour

/** เพดานตอนอ่านไฟล์กลับมา กัน object ผิดปกติทำหน่วยความจำเต็ม */
const maxObjectBytes = 16 << 20

type Storage interface {
	// UploadURL คืนลิงก์ PUT ชั่วคราว ให้เบราว์เซอร์อัปขึ้น R2 ตรง ๆ
	UploadURL(ctx context.Context, userID, filename string) (key, url string, err error)
	// DownloadURL คืนลิงก์ GET ชั่วคราวสำหรับแสดงรูป
	DownloadURL(ctx context.Context, key string) (string, error)
	// Get อ่านไฟล์กลับมาทั้งก้อน ใช้ตอนส่งรูปให้โมเดลดู
	Get(ctx context.Context, key string) ([]byte, string, error)
}

type r2 struct {
	client    *s3.Client
	presign   *s3.PresignClient
	bucket    string
	uploadTTL time.Duration
}

func New(cfg config.R2) (Storage, error) {
	if cfg.AccountID == "" || cfg.Bucket == "" {
		return nil, errors.New("ยังไม่ได้ตั้งค่า R2 (ต้องมี R2_ACCOUNT_ID และ R2_BUCKET)")
	}

	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", cfg.AccountID)

	client := s3.New(s3.Options{
		// R2 ไม่มีแนวคิดเรื่อง region ต้องใส่ auto
		Region:       "auto",
		BaseEndpoint: aws.String(endpoint),
		Credentials: credentials.NewStaticCredentialsProvider(
			cfg.AccessKeyID, cfg.SecretAccessKey, "",
		),
		// SDK รุ่นใหม่ใส่ checksum CRC32 ให้อัตโนมัติ
		// แต่ตอน presign ยังไม่มีเนื้อไฟล์ จึงได้ checksum ของไฟล์เปล่าติดไปใน URL
		// แล้วเบราว์เซอร์อัปไม่ผ่านเพราะ checksum ไม่ตรง
		RequestChecksumCalculation: aws.RequestChecksumCalculationWhenRequired,
	})

	ttl := time.Duration(cfg.PresignTTLSeconds) * time.Second
	if ttl <= 0 {
		ttl = 15 * time.Minute
	}

	return &r2{
		client:    client,
		presign:   s3.NewPresignClient(client),
		bucket:    cfg.Bucket,
		uploadTTL: ttl,
	}, nil
}

func (s *r2) UploadURL(ctx context.Context, userID, filename string) (string, string, error) {
	key, err := BuildObjectKey(userID, filename)
	if err != nil {
		return "", "", err
	}

	signed, err := s.presign.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		ContentType: aws.String(PreviewContentType),
	}, s3.WithPresignExpires(s.uploadTTL))
	if err != nil {
		return "", "", fmt.Errorf("สร้างลิงก์อัปโหลดไม่สำเร็จ: %w", err)
	}

	return key, signed.URL, nil
}

func (s *r2) DownloadURL(ctx context.Context, key string) (string, error) {
	signed, err := s.presign.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(downloadTTL))
	if err != nil {
		return "", fmt.Errorf("สร้างลิงก์ดูรูปไม่สำเร็จ: %w", err)
	}
	return signed.URL, nil
}

func (s *r2) Get(ctx context.Context, key string) ([]byte, string, error) {
	object, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, "", fmt.Errorf("อ่านไฟล์จาก R2 ไม่สำเร็จ: %w", err)
	}
	defer object.Body.Close()

	// จำกัดขนาดตอนอ่าน ไม่เชื่อ Content-Length ที่ปลายทางบอกมา
	body, err := io.ReadAll(io.LimitReader(object.Body, maxObjectBytes+1))
	if err != nil {
		return nil, "", fmt.Errorf("อ่านเนื้อไฟล์ไม่สำเร็จ: %w", err)
	}
	if len(body) > maxObjectBytes {
		return nil, "", errors.New("ไฟล์ใหญ่เกินกำหนด")
	}

	contentType := PreviewContentType
	if object.ContentType != nil && *object.ContentType != "" {
		contentType = *object.ContentType
	}
	return body, contentType, nil
}

// unsafeChars คืออักขระที่ทำให้ URL เพี้ยน ตัดทิ้งให้หมด
var unsafeChars = regexp.MustCompile(`[^a-zA-Z0-9._-]`)
var whitespace = regexp.MustCompile(`\s+`)
var extension = regexp.MustCompile(`\.[a-zA-Z0-9]+$`)
var trimDots = regexp.MustCompile(`^[.-]+|[.-]+$`)

/*
BuildObjectKey สร้างชื่อไฟล์บน R2 = <user id>/<ชื่อรูปเดิม>.webp

ต้องขึ้นต้นด้วย user id เพราะเว็บนี้มีผู้ใช้หลายคน
ถ้าสองคนอัปไฟล์ชื่อ IMG_001.jpg เหมือนกัน ของคนหลังจะทับของคนแรก

ชื่อไฟล์ ASCII ได้ key เหมือนที่ my-app เคยสร้างทุกประการ ห้ามเปลี่ยน
ไม่งั้นรูปเก่าที่ย้ายข้อมูลมาจะเปิดไม่ขึ้น เพราะ preview_key ในฐานข้อมูล
ชี้ไปที่ชื่อแบบเดิม
*/
func BuildObjectKey(userID, filename string) (string, error) {
	if userID == "" {
		return "", errors.New("ไม่รู้ว่าเป็นไฟล์ของใคร")
	}

	// ตัดเส้นทางโฟลเดอร์ทิ้ง กัน path traversal
	base := filename
	if index := strings.LastIndexAny(base, `/\`); index >= 0 {
		base = base[index+1:]
	}
	base = strings.TrimSpace(base)
	if base == "" {
		return "", errors.New("ชื่อไฟล์ไม่ถูกต้อง")
	}

	// ตัดนามสกุลออกจากชื่อเดิมก่อนล้าง ไม่งั้น "ดอกไม้.jpg" จะเหลือแค่ ".jpg"
	// แล้วกลายเป็นไฟล์ชื่อ jpg.webp ซึ่งไม่เกี่ยวอะไรกับชื่อจริงเลย
	stem := extension.ReplaceAllString(base, "")

	normalized := whitespace.ReplaceAllString(stem, "-")
	stripped := unsafeChars.ReplaceAllString(normalized, "")
	safe := trimDots.ReplaceAllString(stripped, "")

	/*
		ชื่อภาษาไทยหรือลาวจะถูกตัดตัวสะกดทิ้งจนเกือบหมด

		"ทดสอบ ภาพ 01.JPG" กับ "รูป ภาพ 01.png" เหลือ "--01" เหมือนกันทั้งคู่
		ถ้าปล่อยไว้ ไฟล์ที่อัปทีหลังจะทับไฟล์แรกโดยไม่มีใครรู้

		จึงต่อรหัสสั้นที่คำนวณจากชื่อเดิมไว้ท้าย เฉพาะกรณีที่มีตัวอักษร
		ถูกตัดทิ้งจริง ๆ ชื่อ ASCII จึงยังได้ key เหมือนเดิมทุกประการ
	*/
	if stripped != normalized || safe == "" {
		if safe == "" {
			safe = "file"
		}
		safe += "-" + shortHash(base)
	}

	return userID + "/" + safe + ".webp", nil
}

// shortHash ย่อชื่อเดิมเป็นรหัสสั้นที่ได้ค่าเดิมทุกครั้ง
// ชื่อเดียวกันจึงได้ key เดิม อัปซ้ำแล้วทับของเดิมเหมือนพฤติกรรมเดิม
func shortHash(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])[:8]
}

/*
OwnedBy บอกว่า key นี้เป็นของผู้ใช้คนนี้หรือไม่

จำเป็นเพราะ key มาจากฝั่งหน้าเว็บ ถ้าไม่เช็ค ผู้ใช้คนหนึ่งเดา key
ของอีกคนแล้วสั่งอ่านรูปนั้นได้ ทั้งที่ไม่ใช่ของตัวเอง
*/
func OwnedBy(key, userID string) bool {
	if userID == "" || strings.Contains(key, "..") {
		return false
	}
	return strings.HasPrefix(key, userID+"/")
}
