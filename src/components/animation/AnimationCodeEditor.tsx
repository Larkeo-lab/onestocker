import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'

import { loadHighlighter } from '@/lib/highlight'
import { cn } from '@/lib/utils'

const INDENT = '  '

/** แท็กที่ไม่มีแท็กปิด ขึ้นบรรทัดใหม่หลังแท็กพวกนี้ไม่ต้องย่อหน้าเพิ่ม */
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])

/** ก่อนเคอร์เซอร์จบด้วย { [ ( หรือแท็กเปิด บรรทัดถัดไปต้องย่อหน้าเข้าอีกขั้น */
function opensBlock(before: string): boolean {
  if (/[{[(]\s*$/.test(before)) return true
  const tag = /<([a-zA-Z][\w-]*)\b[^<>]*>\s*$/.exec(before)
  return !!tag && !tag[0].trimEnd().endsWith('/>') && !VOID_TAGS.has(tag[1].toLowerCase())
}

/** หลังเคอร์เซอร์ขึ้นต้นด้วยตัวปิด เช่นกด Enter ระหว่าง {} หรือ <div></div> */
function closesBlock(after: string): boolean {
  return /^\s*([}\])]|<\/)/.test(after)
}

/**
 * ช่องแก้โค้ด HTML แบบ IDE: ลงสีตามส่วน เลขบรรทัด Enter ย่อหน้าตามบรรทัดบน (เข้าเพิ่มหลังแท็กเปิดหรือ {)
 * Tab / Shift+Tab ย่อหน้าเข้าออก (เลือกหลายบรรทัดได้) พิมพ์ตัวปิดบนบรรทัดว่างแล้วถอยย่อหน้าให้เอง
 *
 * เป็น textarea โปร่งใสวางทับโค้ดที่ลงสีแล้ว ตัวอักษรเดียวกันขนาดเดียวกัน ตำแหน่งจึงตรงกันทุกตัว
 * แก้ข้อความผ่าน execCommand('insertText') ให้ Ctrl+Z ย้อนได้เหมือนพิมพ์เอง
 */
export function AnimationCodeEditor({
  value,
  onChange,
  placeholder,
  ariaLabel,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
  disabled?: boolean
}) {
  const [highlight, setHighlight] = useState<(code: string) => string>()
  const colored = useMemo(() => highlight?.(value), [highlight, value])
  const lines = useMemo(() => value.split('\n').length, [value])

  useEffect(() => {
    let cancelled = false
    loadHighlighter().then(
      (fn) => {
        if (!cancelled) setHighlight(() => fn)
      },
      // โหลดตัวไฮไลต์ไม่ได้ (เน็ตหลุด) ก็ยังแก้โค้ดแบบไม่มีสีได้
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [])

  function replace(textarea: HTMLTextAreaElement, start: number, end: number, text: string) {
    textarea.setSelectionRange(start, end)
    if (!document.execCommand('insertText', false, text)) {
      textarea.setRangeText(text, start, end, 'end')
      onChange(textarea.value)
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing || event.ctrlKey || event.metaKey || event.altKey) return
    const textarea = event.currentTarget
    const { selectionStart: start, selectionEnd: end } = textarea
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const before = value.slice(lineStart, start)
    const indent = /^[ \t]*/.exec(before)![0]

    if (event.key === 'Enter') {
      event.preventDefault()
      const lineEnd = value.indexOf('\n', end)
      const after = value.slice(end, lineEnd === -1 ? undefined : lineEnd)
      if (!opensBlock(before)) {
        replace(textarea, start, end, '\n' + indent)
      } else if (closesBlock(after)) {
        // แยกตัวเปิดกับตัวปิดคนละบรรทัด เคอร์เซอร์อยู่บรรทัดกลางที่ย่อหน้าเข้าแล้ว
        replace(textarea, start, end, '\n' + indent + INDENT + '\n' + indent)
        const caret = start + 1 + indent.length + INDENT.length
        textarea.setSelectionRange(caret, caret)
      } else {
        replace(textarea, start, end, '\n' + indent + INDENT)
      }
      return
    }

    if (event.key === 'Tab') {
      event.preventDefault()
      const multiline = value.slice(start, end).includes('\n')
      if (!multiline && !event.shiftKey) {
        replace(textarea, start, end, INDENT)
        return
      }
      // ย่อหน้าเข้าออกทั้งบรรทัดที่เลือก แล้วเลือกบรรทัดชุดเดิมไว้ กด Tab ซ้ำได้
      const blockEnd = value.indexOf('\n', end - (end > start && value[end - 1] === '\n' ? 1 : 0))
      const block = value.slice(lineStart, blockEnd === -1 ? undefined : blockEnd)
      const changed = block
        .split('\n')
        .map((line) => (event.shiftKey ? line.replace(/^( {1,2}|\t)/, '') : INDENT + line))
        .join('\n')
      if (changed === block) return
      replace(textarea, lineStart, lineStart + block.length, changed)
      if (multiline) {
        textarea.setSelectionRange(lineStart, lineStart + changed.length)
      } else {
        const caret = Math.max(lineStart, start + changed.length - block.length)
        textarea.setSelectionRange(caret, caret)
      }
      return
    }

    // พิมพ์ตัวปิด (} ] ) หรือ / ของ </) บนบรรทัดที่มีแต่ช่องว่าง ถอยย่อหน้าออกหนึ่งขั้นให้ตรงกับตัวเปิด
    const closing = ['}', ']', ')'].includes(event.key) && before === indent
    const closingTag = event.key === '/' && before === indent + '<'
    if ((closing || closingTag) && start === end && indent.length > 0) {
      event.preventDefault()
      const dedented = indent.slice(0, Math.max(0, indent.length - INDENT.length))
      replace(textarea, lineStart, start, dedented + (closingTag ? '</' : event.key))
    }
  }

  return (
    <div
      className={cn(
        'code-ide h-[32rem] resize-y overflow-auto rounded-lg border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary',
        disabled && 'opacity-60',
      )}
    >
      <div className="flex min-h-full min-w-max font-mono text-[12px] leading-[1.6]">
        <pre className="code-ide-gutter sticky left-0 z-10 py-3 pr-3 pl-4 text-right select-none" aria-hidden>
          {Array.from({ length: lines }, (_, index) => index + 1).join('\n')}
        </pre>
        <div className="relative grow">
          {/* ต่อท้ายด้วย \n ให้บรรทัดว่างสุดท้ายมีความสูง ขนาดจะเท่า textarea ที่ทับอยู่ */}
          {colored !== undefined ? (
            <pre className="py-3 pr-4 pl-3" aria-hidden>
              <code dangerouslySetInnerHTML={{ __html: colored + '\n' }} />
            </pre>
          ) : (
            <pre className="py-3 pr-4 pl-3" aria-hidden>
              <code>{value + '\n'}</code>
            </pre>
          )}
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            aria-label={ariaLabel}
            disabled={disabled}
            wrap="off"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            className="absolute inset-0 size-full resize-none overflow-hidden bg-transparent py-3 pr-4 pl-3 whitespace-pre text-transparent caret-[#aeafad] outline-none selection:bg-[#264f78]/60 placeholder:text-[#6e7681]"
          />
        </div>
      </div>
    </div>
  )
}
