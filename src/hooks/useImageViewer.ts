import { useLocation, useNavigate } from 'react-router-dom'

type ViewerState = { imageViewer?: string } | null

/*
  เปิดหน้าดูรูปจากหน้านี้ในการโหลดหน้าเว็บครั้งนี้ ปิดด้วยการย้อนประวัติได้
  เปิดได้ทีละรูป ตัวแปรเดียวพอ โหลดหน้าใหม่แล้วค่ากลับเป็น false เอง
*/
let pushedHere = false

/**
 * เปิดปิดหน้าดูรูปเต็มจอ ผูกกับประวัติของเบราว์เซอร์
 *
 * เปิดแล้วเพิ่มรายการในประวัติ (URL เดิม ต่างแค่ state) ปุ่มย้อนกลับของเบราว์เซอร์
 * และการปัดย้อนกลับบนมือถือจึงปิดหน้าดูรูปกลับมาหน้าเดิม ไม่ออกจากหน้าไปเลย
 * id ต้องไม่ซ้ำกันในหน้า การ์ดที่ id ตรงกับใน state เท่านั้นที่เปิด
 */
export function useImageViewer(id: string) {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as ViewerState
  const path = { pathname: location.pathname, search: location.search, hash: location.hash }

  function show() {
    pushedHere = true
    navigate(path, { state: { ...state, imageViewer: id } })
  }

  function close() {
    if (pushedHere) {
      pushedHere = false
      navigate(-1)
      return
    }
    // เปิดค้างมาจากก่อนโหลดหน้าใหม่ ไม่มีรายการของเราให้ย้อน แทนที่ด้วยสถานะที่ไม่มีหน้าดูรูป
    navigate(path, { replace: true, state: { ...state, imageViewer: undefined } })
  }

  return { open: state?.imageViewer === id, show, close }
}
