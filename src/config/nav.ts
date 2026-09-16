import {
  FileSpreadsheet,
  History,
  Images,
  Store,
  WandSparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ParseKeys } from "i18next";

import { APP_PATH } from "@/config/site";

export type NavItem = {
  /** key ของข้อความใน config/messages — แปลตอน render จะได้เปลี่ยนตามภาษาทันที */
  labelKey: ParseKeys;
  /** path ต้องตรงกับที่ประกาศไว้ใน routes/router.tsx */
  to: string;
  icon: LucideIcon;
};

export type NavSection = {
  labelKey: ParseKeys;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    labelKey: "nav.workspace",
    items: [
      { labelKey: "nav.generate", to: APP_PATH, icon: WandSparkles },
      {
        labelKey: "nav.remove-bg",
        to: `${APP_PATH}/remove-bg`,
        icon: removeBg,
      },
      { labelKey: "nav.library", to: `${APP_PATH}/library`, icon: Images },
      { labelKey: "nav.history", to: `${APP_PATH}/history`, icon: History },
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
