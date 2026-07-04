import { useTranslation } from 'react-i18next'
import { ColorField } from '../controls'
import { cssVarTools } from './cssVars'
import type { GroupProps } from './common'

// The raw-console palette (--lx-terminal-bg/-fg/-accent). Engine-emits these as
// mode-invariant literals (a console reads dark in any theme), distinct from the
// theme-tracking --lx-log-*. Personalised via css_variables. Live preview uses
// the shell's `.lx-terminal` recipe.
const TERMINAL_VARS: { name: string; labelKey: string; label: string }[] = [
  { name: '--lx-terminal-bg', labelKey: 'editor.terminal.bg', label: 'Console background' },
  { name: '--lx-terminal-fg', labelKey: 'editor.terminal.fg', label: 'Console text' },
  { name: '--lx-terminal-accent', labelKey: 'editor.terminal.accent', label: 'Console accent' },
]

export default function TerminalGroup({ draft, dispatch, mode, baseCssVars }: GroupProps) {
  const { t } = useTranslation('ui')
  const css = cssVarTools(draft, dispatch, mode, baseCssVars)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] text-[var(--lx-text-muted)]">
        {t('editor.terminal.intro', {
          defaultValue:
            'The raw console palette (log viewers / shells). Saved as css_variables overrides.',
        })}
      </p>

      {/* Live console preview — inline vars so the sample tracks the draft even
          before the top-layer delta lands. */}
      <div
        className="lx-terminal text-xs"
        style={
          {
            '--lx-terminal-bg': css.value('--lx-terminal-bg'),
            '--lx-terminal-fg': css.value('--lx-terminal-fg'),
            '--lx-terminal-accent': css.value('--lx-terminal-accent'),
          } as React.CSSProperties
        }
      >
        <div>
          <span className="lx-terminal-accent">lyndrix@core</span>:~$ systemctl status vault
        </div>
        <div>● vault.service — Lyndrix secrets backend</div>
        <div>
          &nbsp;&nbsp;Active: <span className="lx-terminal-accent">active (running)</span>
        </div>
        <div>&nbsp;&nbsp;boot: vault:opened → db:connected → iam:ready</div>
      </div>

      <div className="flex flex-col gap-2.5">
        {TERMINAL_VARS.map((v) => (
          <ColorField
            key={v.name}
            label={t(v.labelKey, { defaultValue: v.label })}
            value={css.value(v.name)}
            edited={css.edited(v.name)}
            onChange={(val) => css.set(v.name, val)}
            onReset={() => css.reset(v.name)}
          />
        ))}
      </div>
    </div>
  )
}
