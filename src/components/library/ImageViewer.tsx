import {
  ArrowLeft,
  ChevronsLeftRight,
  Download,
  LoaderCircle,
  Maximize,
  Minimize,
  Minus,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import {
  cachedUrl,
  holdPreload,
  isPreloaded,
  markPreloaded,
} from "@/lib/preload";
import { CHECKERBOARD_STYLE, DOWNLOAD_LINK_CLASS } from "@/lib/removeBg";
import { cn } from "@/lib/utils";

/** ระยะขอบรอบรูปในโหมดพอดีจอ */
const FRAME_PADDING = 16;

/**
 * ด้านยาวของไฟล์ดูบนจอ ต้องตรงกับ imaging.DisplayMaxSide ใน server/internal/shared/imaging/display.go
 * ซูมจนจอแสดงละเอียดกว่านี้ สลับไปใช้ไฟล์เต็ม
 */
const DISPLAY_MAX_SIDE = 2560;

/**
 * รูปที่ไม่เกินเท่านี้โหลดไฟล์เต็มต่อทันทีหลังไฟล์ดูบนจอ ซูมลึกเมื่อไรคมเลย
 * ใหญ่กว่านี้ (เช่นลบพื้นหลัง Pro ขนาดเท่าต้นฉบับ 9600×7168 ไฟล์ PNG 30–70 MB) โหลดเมื่อซูมจนต้องใช้
 * ดูพอดีจอไม่ต้องดาวน์โหลดหลายสิบ MB และมือถือไม่ต้องถอดรหัสรูปหลายร้อย MB ในหน่วยความจำ
 */
const EAGER_FULL_MAX_PIXELS = 25_000_000;

/** ปุ่มลูกศรเลื่อนเส้นเทียบทีละเท่านี้ (%) กด Shift ค้างเลื่อนทีละ 10 */
const SPLIT_STEP = 2;

/** ซูมได้สูงสุดกี่เท่าของขนาดจริง (400%) */
const MAX_SCALE = 4;

/** ปุ่ม + / − และแป้น + / − ขยายหรือย่อทีละเท่านี้ */
const ZOOM_STEP = 1.5;

/** ลากเกินเท่านี้ (px) นับเป็นการเลื่อนรูป ไม่ใช่การกด */
const DRAG_THRESHOLD = 6;

/** แตะสองครั้งภายในเวลานี้ (ms) และห่างกันไม่เกินนี้ (px) นับเป็นแตะสองครั้ง */
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DISTANCE = 30;

/** ขนาดที่แสดง (เท่าของพิกเซลจริง) กับมุมซ้ายบนของรูปในกรอบ */
type View = { scale: number; x: number; y: number };
type Point = { x: number; y: number };

/**
 * การลากหรือถ่างนิ้วที่กำลังทำอยู่
 * pinch = เริ่มถ่างนิ้วตอนไหน ขนาดตอนนั้น และจุดบนรูป (หน่วยพิกเซลจริง) ที่ต้องอยู่ใต้กึ่งกลางสองนิ้วตลอด
 */
type Gesture = {
  start: Point;
  moved: boolean;
  pinch: { distance: number; view: View; anchor: Point } | null;
};

/** ไฟล์ขนาดดูบนจอ JPEG ของสี กับ PNG ขาวดำของความโปร่งใส (null = รูปทึบ) */
export type DisplayFiles = { url: string; maskUrl: string | null };

/**
 * ดูรูปเต็มจอ ซูมได้อิสระแบบดูรูปถ่าย
 *
 * มีไฟล์ดูบนจอ (display) แสดงไฟล์นั้นก่อน เล็กและขึ้นเร็ว แล้วโหลดไฟล์เต็มต่อเบื้องหลังทันที
 * ซูมจนไฟล์ดูบนจอไม่พอ (จอแสดงละเอียดกว่า 2560 px ของรูป) สลับไปใช้ไฟล์เต็ม ดาวน์โหลดได้ไฟล์เต็มเสมอ
 *
 * - ลูกกลิ้งเมาส์ / ถ่างนิ้วบน trackpad หรือจอสัมผัส: ซูมตรงจุดที่ชี้
 * - ลาก: เลื่อนดูส่วนอื่นตอนซูมอยู่
 * - คลิก (เมาส์) หรือแตะสองครั้ง (จอสัมผัส): สลับพอดีจอกับขนาดจริง ตรงจุดที่กด
 * - ปุ่ม − / + ด้านล่าง และแป้น − / + / 0
 *
 * ย่อได้ไม่เล็กกว่าพอดีจอ ขยายได้ถึง 400% ของขนาดจริง
 * ตอนพอดีจอ กดพื้นที่รอบรูปเพื่อปิด
 */
export function ImageViewer({
  previewUrl,
  fullUrl,
  display,
  beforeUrl,
  afterLabel,
  width,
  height,
  transparent,
  filename,
  details,
  chips,
  preloadKey,
  onClose,
}: {
  previewUrl: string | null;
  fullUrl: string | null;
  display?: DisplayFiles | null;
  /** มี = เทียบก่อน/หลังได้ ซ้ายของเส้นเป็นรูปนี้ ขวาเป็นผลลัพธ์ */
  beforeUrl?: string | null;
  /** ป้ายด้านขวาของเส้นเทียบ ค่าตั้งต้นคือ "ลบพื้นหลังแล้ว" */
  afterLabel?: string;
  width: number;
  height: number;
  transparent: boolean;
  filename: string;
  details: ReactNode;
  chips?: ReactNode;
  /**
   * key ของรูปใน lib/preload (ไฟล์ดูบนจอ = key, ความโปร่งใส = key#mask, ไฟล์เต็ม = key#full)
   * ใช้ไฟล์ที่โหลดไว้ล่วงหน้า (หรือต่อจากที่กำลังโหลดค้าง) และระหว่างเปิดอยู่รูปนี้ได้เน็ตก่อนรูปอื่นในคิว
   */
  preloadKey?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  /*
    เลือกลิงก์ครั้งเดียวตอนเปิด รายการโหลดใหม่ได้ลิงก์ใหม่ระหว่างดูอยู่ก็ไม่ต้องโหลดใหม่
    screen = ไฟล์ที่แสดงตอนดูปกติ (ไฟล์ดูบนจอ ไม่มีก็ใช้ไฟล์เต็ม)
    full = ไฟล์เต็มสำหรับซูมลึก null = screen เป็นไฟล์เต็มอยู่แล้ว
  */
  const [files] = useState(() => {
    const cached = (suffix: string, url: string | null) =>
      preloadKey ? cachedUrl(preloadKey + suffix, url) : url;
    return display
      ? {
          screen: cached("", display.url),
          mask: display.maskUrl ? cached("#mask", display.maskUrl) : null,
          full: cached("#full", fullUrl),
        }
      : { screen: cached("", fullUrl), mask: null, full: null };
  });
  // โหลดไว้ล่วงหน้าแล้ว แสดงได้เลย ไม่ต้องขึ้นรูปย่อก่อน
  const [screenReady, setScreenReady] = useState(
    () =>
      files.screen !== null &&
      isPreloaded(files.screen) &&
      (files.mask === null || isPreloaded(files.mask)),
  );
  const [fullReady, setFullReady] = useState(
    () => files.full !== null && isPreloaded(files.full),
  );
  // ถึงเวลาโหลดไฟล์เต็มแล้ว รูปใหญ่มากรอจนซูมถึง (ดู EAGER_FULL_MAX_PIXELS)
  const [wantFull, setWantFull] = useState(
    () => width * height <= EAGER_FULL_MAX_PIXELS,
  );
  const [screenFailed, setScreenFailed] = useState(false);
  const [fullFailed, setFullFailed] = useState(false);
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(
    null,
  );
  // null = พอดีจอ (ปรับตามขนาดจอเองเมื่อหมุนมือถือหรือย่อหน้าต่าง)
  const [view, setView] = useState<View | null>(null);
  const [dragging, setDragging] = useState(false);
  // ตำแหน่งเส้นเทียบ (0–100% ของความกว้างรูป) ซ้ายของเส้นคือต้นฉบับ
  const [split, setSplit] = useState(50);
  const frameRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef<{ time: number; point: Point } | null>(null);
  const wheelRef = useRef<(event: WheelEvent) => void>(() => {});

  // โหลดครบทุกไฟล์ที่จะใช้แล้ว (ไฟล์เต็มด้วยถ้ามีและต้องใช้) หรือโหลดไม่ได้
  const settled =
    files.full && wantFull
      ? fullReady || fullFailed
      : screenReady || screenFailed || files.screen === null;

  // ระหว่างยังโหลดไม่ครบ รูปนี้ได้เน็ตทั้งหมด คิวโหลดล่วงหน้าของรูปอื่นหยุดรอ
  useEffect(() => {
    if (!preloadKey || settled) return;
    return holdPreload([preloadKey, `${preloadKey}#mask`, `${preloadKey}#full`]);
  }, [preloadKey, settled]);

  // ไฟล์ที่แสดงตอนดูปกติก่อน (ไฟล์ดูบนจอเล็ก ขึ้นเร็ว) รูปย่อแสดงอยู่ระหว่างรอ
  useEffect(() => {
    if (screenReady || !files.screen) return;
    const targets = [
      { key: "", url: files.screen },
      ...(files.mask ? [{ key: "#mask", url: files.mask }] : []),
    ];
    let pending = targets.length;
    const cancels = targets.map(({ key, url }) =>
      loadImage(
        url,
        () => {
          if (preloadKey) markPreloaded(preloadKey + key, url);
          pending -= 1;
          if (pending === 0) setScreenReady(true);
        },
        () => setScreenFailed(true),
      ),
    );
    return () => cancels.forEach((cancel) => cancel());
  }, [files, screenReady, preloadKey]);

  // แล้วโหลดไฟล์เต็มต่อ (รูปใหญ่มากรอจนซูมถึง) ซูมลึกเมื่อไรจะได้คมเลย
  useEffect(() => {
    if (
      !files.full ||
      fullReady ||
      !wantFull ||
      !(screenReady || screenFailed)
    )
      return;
    const url = files.full;
    return loadImage(
      url,
      () => {
        if (preloadKey) markPreloaded(`${preloadKey}#full`, url);
        setFullReady(true);
      },
      () => setFullFailed(true),
    );
  }, [files, fullReady, wantFull, screenReady, screenFailed, preloadKey]);

  // เปิดแล้วล็อกการเลื่อนหน้าข้างหลัง ปิดแล้วคืนโฟกัสให้ปุ่มที่กดเปิด
  useEffect(() => {
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // ขนาดกรอบเปลี่ยนตามจอ (หมุนมือถือ ย่อหน้าต่าง) คำนวณขนาดพอดีจอใหม่
  useLayoutEffect(() => {
    const element = frameRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setFrame({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /*
    React ผูก onWheel แบบ passive สั่ง preventDefault ไม่ได้ ผูกเองจะได้กันหน้าเว็บซูมหรือเลื่อนตาม
    ตัวจัดการอยู่ใน ref อัปเดตทุก render ตัวที่ผูกไว้ครั้งเดียวจึงเห็นค่าล่าสุดเสมอ
  */
  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;
    const listener = (event: WheelEvent) => wheelRef.current(event);
    element.addEventListener("wheel", listener, { passive: false });
    return () => element.removeEventListener("wheel", listener);
  }, []);

  // ไม่ขยายเกินขนาดจริง รูปเล็กกว่าจอแสดงเท่าตัวจริง
  const fitScale = frame
    ? Math.min(
        1,
        (frame.width - FRAME_PADDING * 2) / width,
        (frame.height - FRAME_PADDING * 2) / height,
      )
    : 0;
  const maxScale = Math.max(MAX_SCALE, fitScale);

  function fitView(): View {
    if (!frame) return { scale: 0, x: 0, y: 0 };
    return {
      scale: fitScale,
      x: (frame.width - width * fitScale) / 2,
      y: (frame.height - height * fitScale) / 2,
    };
  }

  /**
   * จำกัดขนาดไว้ระหว่างพอดีจอกับ maxScale แล้วจัดตำแหน่ง
   * ด้านที่เล็กกว่ากรอบอยู่กลาง ด้านที่ใหญ่กว่าเลื่อนได้แต่ไม่ให้เห็นช่องว่างที่ขอบ
   * กลับมาเท่าพอดีจอคืน null
   */
  function settle(next: View): View | null {
    if (!frame) return null;
    const scale = Math.min(maxScale, Math.max(fitScale, next.scale));
    if (scale <= fitScale * 1.001) return null;
    const shownWidth = width * scale;
    const shownHeight = height * scale;
    return {
      scale,
      x:
        shownWidth <= frame.width
          ? (frame.width - shownWidth) / 2
          : Math.min(0, Math.max(frame.width - shownWidth, next.x)),
      y:
        shownHeight <= frame.height
          ? (frame.height - shownHeight) / 2
          : Math.min(0, Math.max(frame.height - shownHeight, next.y)),
    };
  }

  // ที่เก็บไว้อาจเกินขอบหลังจอเปลี่ยนขนาด จัดใหม่ทุกครั้งที่ใช้
  function resolve(stored: View | null): View {
    return (stored && settle(stored)) ?? fitView();
  }

  const shown = resolve(view);
  const zoomedIn = view !== null && shown.scale > fitScale;

  /** ซูมเป็น scale โดยให้จุดบนรูปที่อยู่ใต้ point อยู่ที่เดิม */
  function zoomAt(scale: number | ((current: number) => number), point: Point) {
    setView((stored) => {
      const current = resolve(stored);
      const next = typeof scale === "function" ? scale(current.scale) : scale;
      const u = (point.x - current.x) / current.scale;
      const v = (point.y - current.y) / current.scale;
      return settle({ scale: next, x: point.x - u * next, y: point.y - v * next });
    });
  }

  function frameCenter(): Point {
    return { x: (frame?.width ?? 0) / 2, y: (frame?.height ?? 0) / 2 };
  }

  /** พอดีจอ → ขนาดจริง (รูปที่เล็กกว่าจออยู่แล้วขยาย 2 เท่า) ซูมอยู่ → พอดีจอ */
  function toggleZoom(point: Point) {
    if (zoomedIn) {
      setView(null);
      return;
    }
    zoomAt(fitScale < 1 ? 1 : Math.min(maxScale, 2), point);
  }

  useEffect(() => {
    wheelRef.current = (event) => {
      const element = frameRef.current;
      if (!element) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
      // ถ่างนิ้วบน trackpad มาเป็น wheel ที่กด ctrl ค่าเล็กกว่าลูกกลิ้งมาก ต้องคูณแรงกว่า
      const factor = Math.exp(
        -event.deltaY * unit * (event.ctrlKey ? 0.01 : 0.002),
      );
      zoomAt((current) => current * factor, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };
  });

  function localPoint(event: PointerEvent<HTMLDivElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function startPinch(g: Gesture) {
    const [a, b] = [...pointers.current.values()];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    g.moved = true;
    g.pinch = {
      distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      view: shown,
      anchor: {
        x: (mid.x - shown.x) / shown.scale,
        y: (mid.y - shown.y) / shown.scale,
      },
    };
  }

  // จับกรอบไว้ (pointer capture) ลากต่อได้แม้เมาส์หรือนิ้วออกนอกกรอบ
  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = localPoint(event);
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 1) {
      gesture.current = { start: point, moved: false, pinch: null };
    } else if (pointers.current.size === 2 && gesture.current) {
      startPinch(gesture.current);
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    const g = gesture.current;
    if (!previous || !g) return;
    const point = localPoint(event);
    pointers.current.set(event.pointerId, point);

    if (g.pinch && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const scale =
        (g.pinch.view.scale * Math.hypot(a.x - b.x, a.y - b.y)) /
        g.pinch.distance;
      setView(
        settle({
          scale,
          x: mid.x - g.pinch.anchor.x * scale,
          y: mid.y - g.pinch.anchor.y * scale,
        }),
      );
      return;
    }

    if (
      !g.moved &&
      Math.hypot(point.x - g.start.x, point.y - g.start.y) < DRAG_THRESHOLD
    )
      return;
    g.moved = true;
    if (!zoomedIn) return;
    setDragging(true);
    const dx = point.x - previous.x;
    const dy = point.y - previous.y;
    setView((stored) => {
      if (!stored) return null;
      const current = resolve(stored);
      return settle({ ...current, x: current.x + dx, y: current.y + dy });
    });
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.delete(event.pointerId)) return;
    const g = gesture.current;
    if (pointers.current.size > 0) {
      // ยกนิ้วหนึ่งจากสองนิ้ว เลิกถ่าง นิ้วที่เหลือลากต่อได้
      if (g) g.pinch = null;
      return;
    }
    gesture.current = null;
    setDragging(false);
    if (!g || g.moved || event.type === "pointercancel") return;

    // กดโดยไม่ลาก หลัง capture แล้ว target เป็นกรอบเสมอ ดูจากตำแหน่งว่าโดนรูปไหม
    const point = localPoint(event);
    const onImage =
      point.x >= shown.x &&
      point.x <= shown.x + width * shown.scale &&
      point.y >= shown.y &&
      point.y <= shown.y + height * shown.scale;

    if (event.pointerType === "mouse") {
      if (onImage) toggleZoom(point);
      else if (!zoomedIn) onClose();
      return;
    }

    // จอสัมผัส: แตะสองครั้งซูม แตะครั้งเดียวนอกรูปตอนพอดีจอปิดหน้า
    const last = lastTap.current;
    if (
      last &&
      event.timeStamp - last.time < DOUBLE_TAP_MS &&
      Math.hypot(point.x - last.point.x, point.y - last.point.y) <
        DOUBLE_TAP_DISTANCE
    ) {
      lastTap.current = null;
      toggleZoom(point);
      return;
    }
    lastTap.current = { time: event.timeStamp, point };
    if (!onImage && !zoomedIn) onClose();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "+" || event.key === "=") {
      zoomAt((current) => current * ZOOM_STEP, frameCenter());
    } else if (event.key === "-" || event.key === "_") {
      zoomAt((current) => current / ZOOM_STEP, frameCenter());
    } else if (event.key === "0") {
      setView(null);
    } else {
      return;
    }
    event.preventDefault();
  }

  function splitAt(clientX: number) {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSplit(
      Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)),
    );
  }

  // จับเส้นแล้วลากต่อได้แม้นิ้วหรือเมาส์ออกนอกเส้น ไม่ส่งต่อให้กรอบ (ไม่เลื่อนรูป)
  function handleSplitDown(event: PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    splitAt(event.clientX);
  }

  function handleSplitMove(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      splitAt(event.clientX);
  }

  function handleSplitKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 10 : SPLIT_STEP;
    // คิดจากค่าล่าสุด กดค้างหลายครั้งติดกันจะได้เลื่อนครบทุกครั้ง
    const next: ((current: number) => number) | null =
      event.key === "ArrowLeft"
        ? (current) => current - step
        : event.key === "ArrowRight"
          ? (current) => current + step
          : event.key === "Home"
            ? () => 0
            : event.key === "End"
              ? () => 100
              : null;
    if (!next) return;
    event.preventDefault();
    setSplit((current) => Math.min(100, Math.max(0, next(current))));
  }

  /*
    จอแสดงละเอียดกว่าไฟล์ดูบนจอแล้ว (คิดความละเอียดจอ retina ด้วย) ต้องใช้ไฟล์เต็มถึงจะคม
    ไฟล์ดูบนจอโหลดไม่ได้ใช้ไฟล์เต็มแทนตลอด
  */
  const displayRatio = Math.min(1, DISPLAY_MAX_SIDE / Math.max(width, height));
  const needsFull =
    files.full !== null &&
    (screenFailed ||
      shown.scale * (window.devicePixelRatio || 1) > displayRatio * 1.02);
  const showFull = needsFull && fullReady;
  /*
    ซูมจนต้องใช้ไฟล์เต็มแล้ว เริ่มโหลด (รูปที่ไม่ใหญ่มากโหลดไว้ตั้งแต่เปิดแล้ว)
    ตั้งระหว่าง render ได้ React วาดใหม่ทันทีก่อนแสดงผล ซูมกลับออกก็ยังโหลดต่อจนเสร็จ
  */
  if (needsFull && !wantFull) setWantFull(true);
  const showScreen = screenReady && !showFull;
  const loading =
    (files.screen !== null && !screenReady && !screenFailed) ||
    (needsFull && !fullReady && !fullFailed);
  const loadFailed = files.full ? needsFull && fullFailed : screenFailed;
  const downloadUrl = files.full ?? files.screen;
  const controlClass =
    "flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/15 disabled:pointer-events-none disabled:opacity-40";

  return createPortal(
    // ทับเฉพาะส่วน main: เว้น h-14 ของ AppHeader และ w-60 ของ Sidebar (จอ lg ขึ้นไป)
    // อยู่ใต้ header (z-40) เมนูโปรไฟล์จึงยังเปิดทับได้
    <div
      className="fixed inset-x-0 top-14 bottom-0 z-30 flex flex-col bg-black/90 lg:left-60"
      role="dialog"
      aria-label={filename}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-start gap-3 border-b border-border bg-card px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 text-[13px] font-medium transition-colors hover:border-border-strong hover:bg-muted"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          {t("viewer.back")}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium" title={filename}>
            {filename}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground tabular-nums">
            <span>{details}</span>
            {chips}
          </div>
        </div>

        {downloadUrl ? (
          <a href={downloadUrl} className={cn(DOWNLOAD_LINK_CLASS, "flex-none")}>
            <Download className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">{t("removeBg.download")}</span>
          </a>
        ) : null}
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          title={t("common.close")}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div
        ref={frameRef}
        // touch-none: ถ่างนิ้วหรือลากแล้วหน้าเว็บไม่ซูมหรือเลื่อนตาม
        className={cn(
          "relative min-h-0 flex-1 touch-none overflow-hidden select-none",
          zoomedIn && (dragging ? "cursor-grabbing" : "cursor-grab"),
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {frame && (previewUrl || files.screen || files.full) ? (
          <div
            ref={boxRef}
            className={cn("absolute", !zoomedIn && "cursor-zoom-in")}
            style={{
              ...(transparent
                ? CHECKERBOARD_STYLE
                : { backgroundColor: "#ffffff" }),
              left: shown.x,
              top: shown.y,
              width: width * shown.scale,
              height: height * shown.scale,
            }}
          >
            {previewUrl && !showScreen && !showFull ? (
              <img
                src={previewUrl}
                alt={filename}
                draggable={false}
                className="absolute inset-0 size-full"
              />
            ) : null}
            {/* ซ่อนแทนถอดออก สลับกับไฟล์เต็มไปมาตอนซูมเข้าออกได้ทันที ไม่ต้อง decode ใหม่ */}
            {screenReady && files.screen ? (
              files.mask ? (
                <MaskedImage
                  colorUrl={files.screen}
                  maskUrl={files.mask}
                  alt={filename}
                  hidden={!showScreen}
                />
              ) : (
                <img
                  src={files.screen}
                  alt={filename}
                  draggable={false}
                  className={cn(
                    "absolute inset-0 size-full",
                    !showScreen && "invisible",
                  )}
                />
              )
            ) : null}
            {fullReady && files.full ? (
              <img
                src={files.full}
                alt={filename}
                draggable={false}
                className={cn(
                  "absolute inset-0 size-full",
                  !showFull && "invisible",
                )}
              />
            ) : null}

            {beforeUrl ? (
              <>
                <img
                  src={beforeUrl}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 size-full"
                  style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
                />

                <span
                  className={cn(
                    "pointer-events-none absolute top-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[11.5px] font-medium text-white transition-opacity",
                    split < 15 && "opacity-0",
                  )}
                >
                  {t("viewer.before")}
                </span>
                <span
                  className={cn(
                    "pointer-events-none absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[11.5px] font-medium text-white transition-opacity",
                    split > 85 && "opacity-0",
                  )}
                >
                  {afterLabel ?? t("viewer.after")}
                </span>

                {/* แถบจับกว้างกว่าเส้น กดโดนง่ายบนมือถือ touch-none ให้ลากแล้วหน้าไม่เลื่อนตาม */}
                <div
                  role="slider"
                  tabIndex={0}
                  aria-label={t("viewer.compare")}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(split)}
                  onPointerDown={handleSplitDown}
                  onPointerMove={handleSplitMove}
                  onKeyDown={handleSplitKey}
                  className="group absolute inset-y-0 w-10 -translate-x-1/2 cursor-ew-resize touch-none outline-none"
                  style={{ left: `${split}%` }}
                >
                  <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_4px_rgba(0,0,0,0.6)]" />
                  <span className="absolute top-1/2 left-1/2 flex size-9 -translate-1/2 items-center justify-center rounded-full bg-white text-neutral-900 shadow-md group-focus-visible:ring-2 group-focus-visible:ring-primary">
                    <ChevronsLeftRight className="size-4" aria-hidden />
                  </span>
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {loading || loadFailed ? (
          <p className="pointer-events-none absolute top-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-[12px] whitespace-nowrap text-white">
            {loadFailed ? (
              <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <LoaderCircle
                className="size-3.5 shrink-0 animate-spin"
                aria-hidden
              />
            )}
            {loadFailed ? t("viewer.fullFailed") : t("viewer.loadingFull")}
          </p>
        ) : null}

        {/* ปุ่มซูม กดแล้วไม่ส่งต่อให้กรอบ (ไม่นับเป็นการลากหรือการกดที่รูป) */}
        {frame ? (
          <div
            className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-neutral-800/90 p-1 text-white shadow-lg ring-1 ring-white/15"
            title={t("viewer.zoomHint")}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() =>
                zoomAt((current) => current / ZOOM_STEP, frameCenter())
              }
              disabled={!zoomedIn}
              aria-label={t("viewer.zoomOut")}
              title={t("viewer.zoomOut")}
              className={controlClass}
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <span
              className="min-w-12 text-center text-[12px] font-medium tabular-nums"
              aria-live="polite"
            >
              {Math.round(shown.scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() =>
                zoomAt((current) => current * ZOOM_STEP, frameCenter())
              }
              disabled={shown.scale >= maxScale}
              aria-label={t("viewer.zoomIn")}
              title={t("viewer.zoomIn")}
              className={controlClass}
            >
              <Plus className="size-4" aria-hidden />
            </button>
            <span className="mx-0.5 h-4 w-px bg-white/25" aria-hidden />
            <button
              type="button"
              onClick={() => toggleZoom(frameCenter())}
              aria-label={
                zoomedIn ? t("viewer.fitScreen") : t("viewer.actualSize")
              }
              title={zoomedIn ? t("viewer.fitScreen") : t("viewer.actualSize")}
              className={controlClass}
            >
              {zoomedIn ? (
                <Minimize className="size-4" aria-hidden />
              ) : (
                <Maximize className="size-4" aria-hidden />
              )}
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/**
 * โหลดรูปแล้ว decode ให้เสร็จก่อนเรียก onLoad รูปจะขึ้นทันทีที่แสดง ไม่กระพริบว่าง
 * คืนฟังก์ชันยกเลิกการแจ้งผล
 */
function loadImage(
  url: string,
  onLoad: () => void,
  onError: () => void,
): () => void {
  let active = true;
  const image = new Image();
  image.src = url;
  image
    .decode()
    .then(() => active && onLoad())
    .catch(() => {
      // decode ไม่ผ่านแต่โหลดสำเร็จ (บางเบราว์เซอร์กับรูปใหญ่มาก) ยังแสดงได้
      if (!active) return;
      if (image.complete && image.naturalWidth > 0) onLoad();
      else onError();
    });
  return () => {
    active = false;
  };
}

/**
 * ไฟล์ดูบนจอของรูปโปร่งใส: JPEG ของสีกับ PNG ขาวดำของความโปร่งใส ประกอบด้วย SVG mask
 * ใช้ SVG ไม่ใช่ CSS mask-image เพราะ mask-image ต้องได้ CORS จาก R2 ส่วนรูปใน SVG ไม่ต้อง
 */
function MaskedImage({
  colorUrl,
  maskUrl,
  alt,
  hidden,
}: {
  colorUrl: string;
  maskUrl: string;
  alt: string;
  hidden: boolean;
}) {
  // id ของ React มี ":" ซึ่งใช้ใน url(#...) ไม่ได้ทุกเบราว์เซอร์
  const maskId = `mask-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      role="img"
      aria-label={alt}
      className={cn("absolute inset-0 size-full", hidden && "invisible")}
    >
      <mask
        id={maskId}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="100"
        height="100"
      >
        <image
          href={maskUrl}
          width="100"
          height="100"
          preserveAspectRatio="none"
        />
      </mask>
      <image
        href={colorUrl}
        width="100"
        height="100"
        preserveAspectRatio="none"
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}
