import type { SettingsSectionProps } from '../registry'
import EditableSettingsForm from '../EditableSettingsForm'

// Application-level runtime config. Fields are driven entirely by the API's
// `editable_settings` metadata — adding a setting in lyndrix-core (any of these
// categories) makes it appear here with no frontend change.
const CATEGORIES = ['Application', 'Localization', 'Theming']

export default function GeneralSection({ config, envLocked, editableSettings }: SettingsSectionProps) {
  const metas = editableSettings.filter((m) => CATEGORIES.includes(m.category))
  return <EditableSettingsForm metas={metas} config={config} envLocked={envLocked} />
}
