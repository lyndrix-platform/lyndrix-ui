// The object placed on `window.__lyndrix_ui` so federated plugin bundles can
// consume the host's UI primitives + generic form + utilities without bundling
// their own copies (mirrors the existing `window.__lyndrix_react` pattern).
// Plugins render into the host DOM, so the host's CSS (.lx-* classes) and
// --lx-* vars are already present — these components render correctly with no
// CSS shipped by the plugin.
import {
  Card,
  Field,
  SectionTitle,
  SaveButton,
  StatusMsg,
  EnvBadge,
  EnvHint,
  inputCls,
} from '../pages/settings/shared'
import SettingsForm from '../components/SettingsForm'
import { toast } from './toast'
import { getPluginIcon } from './icons'

export const sharedUi = {
  // Contract version of the exposed surface (independent of any package version).
  __version: '1.0.0',
  // Primitives
  Card,
  Field,
  SectionTitle,
  SaveButton,
  StatusMsg,
  EnvBadge,
  EnvHint,
  inputCls,
  // Generic, metadata-driven form (inject submitFn / t)
  SettingsForm,
  // Utilities
  toast,
  getPluginIcon,
}

export default sharedUi
