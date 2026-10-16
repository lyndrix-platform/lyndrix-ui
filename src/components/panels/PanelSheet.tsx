import type { PanelEntry, PanelState } from '../../lib/panels'
import { PanelTitleBar } from './FloatingPanel'
import PluginPanelMount from './PluginPanelMount'

/**
 * Below the `md` breakpoint a panel is a full-width bottom sheet: no drag or
 * resize, just the title bar (pin / close) above the plugin UI. The host shows
 * the top-most open panel; the others stay reachable through the launcher.
 */
export default function PanelSheet({
  entry,
  state,
  invalidation,
}: {
  entry: PanelEntry
  state: PanelState
  invalidation: number
}) {
  return (
    <section
      role="dialog"
      aria-label={entry.panel.label}
      className="fixed inset-x-0 bottom-0 z-[35] flex flex-col lx-popover lx-safe-x"
      style={{
        height: '72vh',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderBottom: 'none',
      }}
    >
      <PanelTitleBar entry={entry} state={state} showMinimize={false} />
      <div className="flex-1 min-h-0 overflow-y-auto lx-safe-bottom">
        <PluginPanelMount plugin={entry.plugin} panelId={entry.panel.id} invalidation={invalidation} />
      </div>
    </section>
  )
}
