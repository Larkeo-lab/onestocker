import { Check, Copy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { useCopy } from '@/hooks/useCopy'
import { highlightHtml } from '@/lib/highlight'

/**
 * โค้ด HTML ที่ AI เขียน แสดงแบบ IDE (พื้นมืด สีแยกตามส่วน เลขบรรทัด) คัดลอกไปใช้ต่อได้
 *
 * ระหว่างโหลดตัวไฮไลต์แสดงเป็นข้อความธรรมดาก่อน เลขบรรทัดอยู่คอลัมน์แยก
 * เพราะ span สีของ highlight.js คร่อมหลายบรรทัดได้ ตัดเป็นบรรทัดตรง ๆ ไม่ได้
 */
export function AnimationCode({ html }: { html: string }) {
  const { t } = useTranslation()
  const [copied, copy] = useCopy()
  const [highlighted, setHighlighted] = useState<{ source: string; html: string }>()
  const lines = useMemo(() => html.split('\n').length, [html])

  useEffect(() => {
    let cancelled = false
    highlightHtml(html).then(
      (result) => {
        if (!cancelled) setHighlighted({ source: html, html: result })
      },
      // โหลดตัวไฮไลต์ไม่ได้ (เน็ตหลุด) ก็ยังอ่านโค้ดแบบไม่มีสีได้
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [html])

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold">
          {t('animation.codeTitle')}
          <span className="ml-2 font-mono text-[11px] font-normal text-subtle-foreground tabular-nums">
            {t('animation.codeSize', { lines: lines.toLocaleString() })}
          </span>
        </h2>
        <Button size="sm" onClick={() => copy(html)}>
          {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          {copied ? t('animation.copied') : t('animation.copyCode')}
        </Button>
      </div>
      <div className="code-ide mt-1.5 max-h-[28rem] overflow-auto rounded-lg border border-border">
        <div className="flex min-w-max font-mono text-[12px] leading-[1.6]">
          <pre
            className="code-ide-gutter sticky left-0 py-3 pr-3 pl-4 text-right select-none"
            aria-hidden
          >
            {Array.from({ length: lines }, (_, index) => index + 1).join('\n')}
          </pre>
          {highlighted?.source === html ? (
            <pre className="py-3 pr-4 pl-3">
              <code dangerouslySetInnerHTML={{ __html: highlighted.html }} />
            </pre>
          ) : (
            <pre className="py-3 pr-4 pl-3">
              <code>{html}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
