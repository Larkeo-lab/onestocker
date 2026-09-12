import type { ContactChannelKey, ContactChannels } from '@/types/contact'

export type ContactOption = {
  key: ContactChannelKey
  label: string
  /** พาธโลโก้ใน public/contact/ แบบเดียวกับ PLATFORMS ใน config/platforms.ts */
  icon: string
  /** ลิงก์ที่จะเปิดเมื่อผู้ใช้กด */
  href: string
  /** ค่าของช่องทางนั้น เช่นเบอร์หรือ URL — ใช้เป็น tooltip ตอนชี้ที่ไอคอน */
  display: string
}

type Builder = {
  key: ContactChannelKey
  label: string
  icon: string
  href: (value: string) => string
  display: (value: string) => string
}

/**
 * ลำดับนี้คือลำดับที่ปุ่มจะเรียงในป๊อปอัป
 *
 * ใช้โลโก้จริงจาก public/contact/ ไม่ใช่ไอคอนของ lucide
 * เพราะ lucide ตัดไอคอนแบรนด์ออกไปแล้ว เหลือแต่ไอคอนทั่วไปที่ดูไม่ออกว่าช่องทางไหน
 */
const BUILDERS: Builder[] = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: '/contact/whatsapp.avif',
    // wa.me รับเฉพาะตัวเลข ซึ่งฝั่งเซิร์ฟเวอร์จัดรูปแบบมาให้แล้ว
    href: (value) => `https://wa.me/${value}`,
    display: (value) => `+${value}`,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    icon: '/contact/facebook.avif',
    href: (value) => value,
    display: (value) => value.replace(/^https?:\/\//, ''),
  },
  {
    // ชื่อไฟล์เป็น email ไม่ใช่ gmail — ตั้งใจให้ตรงกับโลโก้ที่วางไว้
    key: 'gmail',
    label: 'Gmail',
    icon: '/contact/email.webp',
    href: (value) => `mailto:${value}`,
    display: (value) => value,
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    icon: '/contact/tiktok.avif',
    href: (value) => value,
    display: (value) => value.replace(/^https?:\/\//, ''),
  },
]

/**
 * แปลงค่าที่เก็บไว้เป็นรายการปุ่ม ข้ามช่องทางที่ยังไม่ได้ตั้ง
 *
 * คืนรายการว่างได้ — หมายความว่าแอดมินยังไม่ได้กรอกอะไรเลย
 * ป๊อปอัปต้องจัดการกรณีนั้นเอง
 */
export function contactOptions(channels: ContactChannels | null): ContactOption[] {
  if (!channels) return []

  return BUILDERS.flatMap((builder) => {
    const value = channels[builder.key]
    if (!value) return []
    return [
      {
        key: builder.key,
        label: builder.label,
        icon: builder.icon,
        href: builder.href(value),
        display: builder.display(value),
      },
    ]
  })
}
