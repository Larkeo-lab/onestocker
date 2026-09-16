import {
  Eraser,
  FileSpreadsheet,
  History,
  Images,
  Store,
  WandSparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ParseKeys } from "i18next";

import { APP_PATH } from "@/config/site";
import type { PageFeature } from "@/types/creditCost";

export type NavItem = {
  /** key ของข้อความใน config/messages — แปลตอน render จะได้เปลี่ยนตามภาษาทันที */
  labelKey: ParseKeys;
  /** path ต้องตรงกับที่ประกาศไว้ใน routes/router.tsx */
  to: string;
  icon: LucideIcon;
  /** เมนูของงานที่แอดมินเปิด/ปิดได้ ปิดอยู่แล้วเมนูนี้ถูกซ่อน */
  feature?: PageFeature;
};

export type NavSection = {
  labelKey: ParseKeys;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    labelKey: "nav.workspace",
    items: [
      {
        labelKey: "nav.generate",
        to: APP_PATH,
        icon: WandSparkles,
        feature: "generate",
      },
      { labelKey: "nav.history", to: `${APP_PATH}/history`, icon: History },
      {
        labelKey: "nav.remove-bg",
        to: `${APP_PATH}/remove-bg`,
        icon: Eraser,
        feature: "removeBg",
      },
      { labelKey: "nav.library", to: `${APP_PATH}/library`, icon: Images },
      {
        labelKey: "nav.exports",
        to: `${APP_PATH}/exports`,
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    labelKey: "nav.configuration",
    items: [
      { labelKey: "nav.platforms", to: `${APP_PATH}/platforms`, icon: Store },
    ],
  },
];
