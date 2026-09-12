/**
 * แพลตฟอร์มปลายทางสำหรับ export
 * `limits` คือสเปคที่ใช้ตัด/ตรวจ metadata ตอน export (ยังไม่ผูกกับ logic)
 * ตัวเลขของ Adobe Stock ยืนยันจาก CSV template ทางการแล้ว
 * ที่เหลือเป็นค่าตั้งต้น ควรตรวจกับเอกสารของแต่ละเจ้าก่อนใช้จริง
 */
export type Platform = {
  id: string
  name: string
  /** อักษรย่อบนไทล์ ใช้แทนโลโก้แบรนด์เมื่อรูปโหลดไม่ได้ */
  monogram: string
  /** สีประจำไทล์ */
  color: string
  /** พาธโลโก้ใน public/platformIcon/ */
  icon?: string
  limits: {
    title: number
    description: number | null
    keywords: number
  }
}

export const PLATFORMS: Platform[] = [
  {
    id: 'adobe-stock',
    name: 'Adobe Stock',
    monogram: 'St',
    color: '#E5342B',
    icon: '/platformIcon/adobe-stock.png',
    limits: { title: 200, description: null, keywords: 50 },
  },
  {
    id: 'shutterstock',
    name: 'Shutterstock',
    monogram: 'Sh',
    color: '#D6322A',
    icon: '/platformIcon/shutterstock.png',
    limits: { title: 200, description: 200, keywords: 50 },
  },
  {
    id: 'freepik',
    name: 'Freepik',
    monogram: 'Fp',
    color: '#2A7FEA',
    icon: '/platformIcon/freepik.png',
    limits: { title: 100, description: 200, keywords: 50 },
  },
  {
    id: 'istock',
    name: 'iStock',
    monogram: 'iS',
    color: '#3F4A56',
    icon: '/platformIcon/istock.jpg',
    limits: { title: 120, description: 200, keywords: 50 },
  },
  {
    id: 'getty-images',
    name: 'Getty Images',
    monogram: 'Gt',
    color: '#5B5F66',
    icon: '/platformIcon/getty-images.webp',
    limits: { title: 120, description: 250, keywords: 50 },
  },
  {
    id: 'dreamstime',
    name: 'Dreamstime',
    monogram: 'Dt',
    color: '#4C9A2A',
    icon: '/platformIcon/dreamstime.png',
    limits: { title: 100, description: 200, keywords: 50 },
  },
  {
    id: '123rf',
    name: '123RF',
    monogram: '12',
    color: '#1E9BD7',
    icon: '/platformIcon/123rf.png',
    limits: { title: 100, description: 200, keywords: 50 },
  },
  {
    id: 'pond5',
    name: 'Pond5',
    monogram: 'P5',
    color: '#7A5AF8',
    icon: '/platformIcon/pond5.webp',
    limits: { title: 100, description: 300, keywords: 50 },
  },
  {
    id: 'depositphotos',
    name: 'Depositphotos',
    monogram: 'Dp',
    color: '#D4553D',
    icon: '/platformIcon/depositphotos.jpg',
    limits: { title: 100, description: 200, keywords: 50 },
  },
  {
    id: 'alamy',
    name: 'Alamy',
    monogram: 'Al',
    color: '#0F9B8E',
    icon: '/platformIcon/alamy.jpg',
    limits: { title: 80, description: 250, keywords: 50 },
  },
  {
    id: 'vecteezy',
    name: 'Vecteezy',
    monogram: 'Vz',
    color: '#E07B39',
    icon: '/platformIcon/vecteezy.png',
    limits: { title: 100, description: 200, keywords: 50 },
  },
  {
    id: 'canva',
    name: 'Canva',
    monogram: 'Cv',
    color: '#00A6B4',
    icon: '/platformIcon/canva.jpeg',
    limits: { title: 100, description: 200, keywords: 40 },
  },
  {
    id: 'motion-array',
    name: 'Motion Array',
    monogram: 'Ma',
    color: '#8B5CF6',
    icon: '/platformIcon/motion-array.jpeg',
    limits: { title: 100, description: 250, keywords: 30 },
  },
  {
    id: 'general',
    name: 'General',
    monogram: 'Gn',
    color: '#57A05F',
    icon: '/platformIcon/general.jpg',
    limits: { title: 200, description: 300, keywords: 50 },
  },
]

/** แพลตฟอร์มที่เลือกไว้ตั้งต้นเมื่อเปิดแอปครั้งแรก */
export const DEFAULT_PLATFORM_IDS = ['adobe-stock']
