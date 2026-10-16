import { memo, useMemo } from 'react'
import PluginRoute from '../PluginRoute'
import type { PluginOut } from '../../lib/types'

/**
 * The content of one floating panel: the plugin's React bundle mounted through
 * the same PluginRoute as a page (error boundary, warm-up and remote stand-ins,
 * bundle cache), with the `panel` prop set and compact stand-ins.
 *
 * Memoised so drag/resize re-renders of the window never touch the plugin tree;
 * `invalidation` (bumped on plugin:state_changed) remounts it like a page.
 */
const PluginPanelMount = memo(function PluginPanelMount({
  plugin,
  panelId,
  invalidation,
}: {
  plugin: PluginOut
  panelId: string
  invalidation: number
}) {
  const panel = useMemo(() => ({ id: panelId, pluginId: plugin.id }), [panelId, plugin.id])
  return (
    <PluginRoute
      key={invalidation}
      pluginId={plugin.id}
      version={`${plugin.version}-${invalidation}`}
      pluginName={plugin.name}
      runtime={plugin.runtime ?? null}
      status={plugin.status}
      placement={plugin.placement}
      panel={panel}
      compact
    />
  )
})

export default PluginPanelMount
