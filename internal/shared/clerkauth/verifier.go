// Package clerkauth ตรวจลายเซ็นของ session token ที่ Clerk ออกให้
//
// Clerk เซ็น token ด้วยคีย์คู่ ฝั่งเราตรวจด้วยกุญแจสาธารณะ (JWK)
// ที่ดึงมาจาก Clerk แล้วเก็บไว้ในหน่วยความจำ
package clerkauth

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
)

// อายุของกุญแจที่เก็บไว้ ครบแล้วดึงใหม่เผื่อ Clerk หมุนกุญแจ
//
// ถึงจะหมุนก่อนครบเวลาก็ไม่พัง เพราะ token ที่เซ็นด้วยกุญแจใหม่จะมี kid
// ที่ไม่มีใน cache ทำให้ดึงกุญแจใหม่ทันทีอยู่แล้ว
const keyTTL = time.Hour

type cachedKey struct {
	key       *clerk.JSONWebKey
	fetchedAt time.Time
}

// Verifier ตรวจ token พร้อมเก็บกุญแจไว้ใช้ซ้ำ
//
// จำเป็นต้องเก็บเอง เพราะ jwt.Verify ของ SDK จะยิงไปขอ JWKS จาก Clerk
// ใหม่ทุกครั้งถ้าไม่ส่งกุญแจไปให้ — แปลว่าทุกคำขอของผู้ใช้จะกลายเป็น
// การเรียกข้ามเน็ตหนึ่งครั้ง ทั้งช้าและพังทันทีถ้า Clerk ล่ม
type Verifier struct {
	mu   sync.RWMutex
	keys map[string]cachedKey
}

func NewVerifier() *Verifier {
	return &Verifier{keys: make(map[string]cachedKey)}
}

// VerifyToken ตรวจลายเซ็นและวันหมดอายุ แล้วคืน user id ของเจ้าของ token
func (v *Verifier) VerifyToken(ctx context.Context, token string) (string, error) {
	kid, err := keyID(token)
	if err != nil {
		return "", err
	}

	key, err := v.jsonWebKey(ctx, kid)
	if err != nil {
		return "", err
	}

	claims, err := jwt.Verify(ctx, &jwt.VerifyParams{Token: token, JWK: key})
	if err != nil {
		return "", err
	}
	if claims.Subject == "" {
		return "", errors.New("token ไม่มี subject")
	}
	return claims.Subject, nil
}

func (v *Verifier) jsonWebKey(ctx context.Context, kid string) (*clerk.JSONWebKey, error) {
	v.mu.RLock()
	entry, found := v.keys[kid]
	v.mu.RUnlock()

	if found && time.Since(entry.fetchedAt) < keyTTL {
		return entry.key, nil
	}

	key, err := jwt.GetJSONWebKey(ctx, &jwt.GetJSONWebKeyParams{KeyID: kid})
	if err != nil {
		return nil, err
	}

	v.mu.Lock()
	v.keys[kid] = cachedKey{key: key, fetchedAt: time.Now()}
	v.mu.Unlock()

	return key, nil
}

// keyID อ่าน kid จากส่วนหัวของ token
//
// ต้องอ่านเองก่อน เพราะต้องรู้ว่าจะใช้กุญแจดอกไหนก่อนเรียก jwt.Verify
// ส่วนหัวยังไม่ผ่านการตรวจลายเซ็น จึงใช้ได้แค่เป็นตัวชี้กุญแจเท่านั้น
// ห้ามเอาค่าอื่นจากตรงนี้ไปเชื่อเด็ดขาด
func keyID(token string) (string, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return "", errors.New("รูปแบบ token ไม่ถูกต้อง")
	}

	raw, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return "", errors.New("อ่านส่วนหัวของ token ไม่ได้")
	}

	var header struct {
		KeyID string `json:"kid"`
	}
	if err := json.Unmarshal(raw, &header); err != nil {
		return "", errors.New("ส่วนหัวของ token ไม่ใช่ JSON")
	}
	if header.KeyID == "" {
		return "", errors.New("token ไม่มี kid")
	}
	return header.KeyID, nil
}
