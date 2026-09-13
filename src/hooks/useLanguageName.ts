import { useTranslation } from 'react-i18next'

/**
 * ชื่อภาษาของ metadata ในภาษาของหน้าเว็บ เช่นหน้าไทยเห็น "ลาว" หน้าอังกฤษเห็น "Lao"
 * ภาษาที่ยังไม่มีคำแปลแสดงเป็นรหัสไปก่อน ดีกว่าช่องว่าง
 */
export function useLanguageName(): (code: string) => string {
  const { t } = useTranslation()

  return (code) => {
    switch (code) {
      case 'en':
        return t('languageNames.en')
      case 'th':
        return t('languageNames.th')
      case 'lo':
        return t('languageNames.lo')
      default:
        return code
    }
  }
}
