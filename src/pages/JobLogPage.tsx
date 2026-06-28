import { useParams } from 'react-router-dom'
import JobLogViewer from '../components/iac/JobLogViewer'

/**
 * Standalone job-log page (foundational): the IaC Orchestrator UI is not yet
 * migrated to React, so this exposes the streamed viewer at /iac/jobs/:jobId/logs.
 * Embed <JobLogViewer/> directly once a React job list lands.
 */
export default function JobLogPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const id = Number(jobId)

  if (!Number.isFinite(id)) {
    return <div className="p-6 text-sm text-[var(--lx-state-down)]">Invalid job id.</div>
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-lg font-semibold mb-3 text-[var(--lx-text)]">Job #{id} — Logs</h1>
      <JobLogViewer jobId={id} height={Math.max(400, window.innerHeight - 220)} />
    </div>
  )
}
