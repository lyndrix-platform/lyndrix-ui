# scripts/

## `setup-cloud-workspace.sh`

Reconstructs the full Lyndrix multi-repo workspace inside a
**Claude-Code-on-the-web** session. Such a session is cloned from a single repo
(`lyndrix-ui`); this script clones the sibling repos (`lyndrix-core`, the plugin
repos, the collection, the homepage) next to it so the session sees the same
layout we work against locally.

It is **idempotent** — repos that already exist are skipped — so it is a no-op
when run in the local workspace.

### Wire it into the cloud environment (one-time)

In **Environment settings → Setup script** (runs once as root, result is
filesystem-cached) paste:

```bash
bash "$(git rev-parse --show-toplevel)/scripts/setup-cloud-workspace.sh"
```

Preconditions:

- **Network access** set to *Trusted* or higher (the script reaches GitHub).
- The session's GitHub credentials grant **read** on the sibling repos — automatic
  when the GitHub App is installed across the `lyndrix-platform` org.

### Run it manually

```bash
bash scripts/setup-cloud-workspace.sh
```

### Configuration (optional env vars)

| Var | Default | Purpose |
|---|---|---|
| `ORG` | `lyndrix-platform` | GitHub org/owner |
| `BASE_URL` | `https://github.com/$ORG` | Clone base; set `git@github.com:$ORG` for SSH |
| `DEPTH` | _(unset)_ | Shallow-clone depth, e.g. `DEPTH=1`, for speed |
| `WORKSPACE` | parent of this repo | Where siblings are cloned |

### Notes

- The repo list is the **verified** set of `lyndrix-platform` repos. `lyndrix-dev`
  is intentionally absent — it is the workspace *container* directory, not a repo.
- `lyndrix-core` develops on the `dev` branch; `git clone` checks out the remote
  default. If needed: `git -C ../lyndrix-core checkout dev`.
