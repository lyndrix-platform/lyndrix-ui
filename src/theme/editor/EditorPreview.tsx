// The full curated preview canvas, framed as a mini-app surface. The blocks now
// live in ./previews so the SAME rendering backs the desktop side panel, the
// desktop "Full" view, and the mobile inline preview (see GroupPreview). This
// stays a thin wrapper for the historical default-export contract.
import { FullPreview, PreviewCanvas } from './previews'

export default function EditorPreview() {
  return (
    <PreviewCanvas>
      <FullPreview />
    </PreviewCanvas>
  )
}
