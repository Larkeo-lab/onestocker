/**
 * จุดเข้าตอน build หน้า landing เป็น HTML นิ่ง
 *
 * ไฟล์นี้ไม่ถูกโหลดในเบราว์เซอร์เลย — scripts/prerender.mjs สั่ง
 * `vite build --ssr` แล้ว import ผลลัพธ์ไปเรียกฟังก์ชันด้านล่างทีละภาษา
 * ตัวเลขและข้อความทั้งหมดจึงมาจากที่เดียวกับที่หน้าเว็บใช้
 */
import { renderToString } from 'react-dom/server'

import i18n from '@/config/i18n'
import {
  APP_LANGUAGE_CODES,
  APP_LANGUAGES,
  DEFAULT_LANGUAGE,
  type AppLanguage,
} from '@/config/languages'
import { APP_PATH, siteConfig } from '@/config/site'

import { LandingPage } from './LandingPage'

export { APP_LANGUAGE_CODES, APP_LANGUAGES }

/** ขนาดของ public/og.png ต้องตรงกับไฟล์จริง Facebook ใช้ตัวเลขนี้จองพื้นที่ */
const OG_IMAGE_WIDTH = 1200
const OG_IMAGE_HEIGHT = 630

const imageUrl = `${siteConfig.url}${siteConfig.seo.image}`

function pageUrl(language: AppLanguage): string {
  return `${siteConfig.url}${APP_LANGUAGES[language].landingPath}`
}

export function renderLanding(language: AppLanguage): string {
  return renderToString(<LandingPage language={language} />)
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

/**
 * JSON ที่ฝังใน <script> ต้องไม่มี "</script>" โผล่ในเนื้อหา
 * ไม่งั้นเบราว์เซอร์จะปิดแท็กกลางคัน — แทน < ด้วยรหัส unicode ซึ่ง JSON อ่านได้เหมือนเดิม
 */
function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}

/**
 * แท็กใน <head> สำหรับ Google และตัวทำพรีวิวลิงก์
 *
 * ตัวทำพรีวิวของ Facebook, LINE, WhatsApp ไม่รัน JavaScript
 * ต้องอยู่ใน HTML ตั้งแต่แรก ตั้งผ่าน document.title ทีหลังไม่ได้ผล
 */
export function renderHead(language: AppLanguage): string {
  const t = i18n.getFixedT(language)
  const title = t('landing.seo.title')
  const description = t('landing.seo.description')
  const url = pageUrl(language)

  const meta: [attribute: 'name' | 'property', key: string, content: string][] = [
    ['name', 'description', description],
    ['name', 'theme-color', '#278bf5'],
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', siteConfig.name],
    ['property', 'og:locale', APP_LANGUAGES[language].ogLocale],
    ...APP_LANGUAGE_CODES.filter((code) => code !== language).map(
      (code) =>
        ['property', 'og:locale:alternate', APP_LANGUAGES[code].ogLocale] as [
          'property',
          string,
          string,
        ],
    ),
    ['property', 'og:url', url],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:image', imageUrl],
    ['property', 'og:image:width', String(OG_IMAGE_WIDTH)],
    ['property', 'og:image:height', String(OG_IMAGE_HEIGHT)],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', description],
    ['name', 'twitter:image', imageUrl],
  ]

  /*
    บอก Google ว่าหน้านี้มีภาษาอื่นอยู่ที่ไหน จะได้ส่งคนไปหน้าภาษาของเขาถูก
    ต้องใส่ครบทุกภาษารวมตัวเองในทุกหน้า ไม่งั้น Google ไม่เชื่อ
  */
  const alternates = [
    ...APP_LANGUAGE_CODES.map(
      (code) =>
        `<link rel="alternate" hreflang="${code}" href="${escapeAttribute(pageUrl(code))}" />`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${escapeAttribute(pageUrl(DEFAULT_LANGUAGE))}" />`,
  ]

  // บอก Google ว่านี่คือแอปบนเว็บที่เริ่มใช้ฟรี และมีคำถามที่พบบ่อยชุดนี้
  // ข้อความคำถามต้องตรงกับที่แสดงบนหน้าทุกตัวอักษร จึงดึงจาก key เดียวกับที่หน้าใช้
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: siteConfig.name,
      url,
      description,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: language,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: t('landing.faq.items', { returnObjects: true as const }).map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    },
  ]

  return [
    `<title>${escapeAttribute(title)}</title>`,
    `<link rel="canonical" href="${escapeAttribute(url)}" />`,
    ...alternates,
    ...meta.map(
      ([attribute, key, content]) =>
        `<meta ${attribute}="${key}" content="${escapeAttribute(content)}" />`,
    ),
    `<script type="application/ld+json">${jsonForScript(structuredData)}</script>`,
  ].join('\n    ')
}

/**
 * บอก crawler ว่าเก็บได้เฉพาะหน้าสาธารณะ
 *
 * ตัวแอปกับหน้าล็อกอินไม่มีเนื้อหาให้ค้นอยู่แล้ว และทุก path ในนั้นตอบ HTML
 * ชุดเดียวกับหน้าแรก ถ้าปล่อยให้เก็บ Google จะเห็นเป็นหน้าซ้ำหลายสิบหน้า
 */
export function renderRobots(): string {
  return [
    'User-agent: *',
    'Allow: /',
    `Disallow: ${APP_PATH}`,
    'Disallow: /sign-in',
    'Disallow: /sign-up',
    '',
    `Sitemap: ${siteConfig.url}/sitemap.xml`,
    '',
  ].join('\n')
}

export function renderSitemap(buildDate: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...APP_LANGUAGE_CODES.flatMap((code) => [
      '  <url>',
      `    <loc>${pageUrl(code)}</loc>`,
      `    <lastmod>${buildDate}</lastmod>`,
      '  </url>',
    ]),
    '</urlset>',
    '',
  ].join('\n')
}
