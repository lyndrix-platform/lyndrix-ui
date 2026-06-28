import type { SettingsSectionProps } from '../registry'
import EditableSettingsForm from '../EditableSettingsForm'

// Plugin reconciliation config. Driven by the API's `editable_settings`
// metadata (category "Plugins") — no hardcoded field list or env-var names.
export default function PluginsConfigSection({ config, envLocked, editableSettings }: SettingsSectionProps) {
  const metas = editableSettings.filter((m) => m.category === 'Plugins')
  return <EditableSettingsForm metas={metas} config={config} envLocked={envLocked} />
}
