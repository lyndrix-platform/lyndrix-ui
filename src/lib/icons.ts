import {
  Activity,
  Bell,
  Box,
  Cable,
  GitBranch,
  Globe,
  LayoutDashboard,
  Megaphone,
  Network,
  Puzzle,
  Rocket,
  Server,
  type LucideIcon,
} from 'lucide-react'

// Maps manifest.icon strings (Material Icons names used in plugin manifests)
// to Lucide icons. Unmapped names fall back to Puzzle.
const iconMap: Record<string, LucideIcon> = {
  // Material Icons names (actual values from /api/plugins)
  cable: Cable,
  campaign: Megaphone,
  dashboard: LayoutDashboard,
  dns: Server,
  extension: Puzzle,
  hub: Network,
  monitor_heart: Activity,
  notifications_active: Bell,
  rocket_launch: Rocket,
  view_in_ar: Box,

  // Additional aliases for convenience
  server: Server,
  activity: Activity,
  monitoring: Activity,
  docker: Box,
  container: Box,
  bell: Bell,
  discord: Bell,
  notification: Bell,
  git: GitBranch,
  layers: GitBranch,
  iac: GitBranch,
  orchestrator: GitBranch,
  public: Globe,
}

export function getPluginIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return Puzzle
  return iconMap[iconName.toLowerCase()] ?? Puzzle
}
