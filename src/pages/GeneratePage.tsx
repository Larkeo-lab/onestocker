import { GenerateWorkspace } from '@/components/generate/GenerateWorkspace'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function GeneratePage() {
  useDocumentTitle('Generate')
  return <GenerateWorkspace />
}
