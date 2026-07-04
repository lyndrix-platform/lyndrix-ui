import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import QuickRow from './appearance/QuickRow'
import ThemeCard from './appearance/ThemeCard'
import OverridesCard from './appearance/OverridesCard'
import BackgroundCard from './appearance/BackgroundCard'
import ThemeEditor from '../../../theme/editor/ThemeEditor'
import type { GroupId } from '../../../theme/editor/groups/common'

const GROUP_IDS = new Set<GroupId>([
  'colors',
  'shape',
  'density',
  'typography',
  'depth',
  'motion',
  'gradient',
  'charts',
  'terminal',
  'sizing',
  'effects',
  'background',
  'raw',
])

/**
 * Appearance settings — thin orchestrator. Composes four focused cards, and
 * portals the full-screen live Theme Editor over everything when the
 * `?editor=theme` search param is present (`&group=`/`&base=` deep-link the
 * opening group and base pack). Closing the editor strips those params so the
 * URL is shareable and browser back/forward works.
 */
export default function AppearanceSection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const editorOpen = searchParams.get('editor') === 'theme'
  const groupParam = searchParams.get('group')
  const initialGroup = groupParam && GROUP_IDS.has(groupParam as GroupId) ? (groupParam as GroupId) : undefined
  const initialBase = searchParams.get('base') ?? undefined

  function closeEditor() {
    setSearchParams(
      (prev) => {
        prev.delete('editor')
        prev.delete('group')
        prev.delete('base')
        return prev
      },
      { replace: true },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <QuickRow />
      <ThemeCard />
      <OverridesCard />
      <BackgroundCard />

      {editorOpen &&
        createPortal(
          <ThemeEditor initialGroup={initialGroup} initialBase={initialBase} onClose={closeEditor} />,
          document.body,
        )}
    </div>
  )
}
