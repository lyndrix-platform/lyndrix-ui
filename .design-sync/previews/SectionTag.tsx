import { SectionTag } from 'lyndrix-ui'

export const Default = () => (
  <div className="p-8 bg-[var(--lx-bg)] flex flex-col gap-4 items-start">
    <SectionTag>Why Lyndrix</SectionTag>
    <SectionTag>Ecosystem</SectionTag>
    <SectionTag>Simple by design</SectionTag>
  </div>
)

export const Variants = () => (
  <div className="p-8 bg-[var(--lx-bg)] flex flex-row gap-4 flex-wrap">
    <SectionTag variant="cyan">Features</SectionTag>
    <SectionTag variant="blue">Plugins</SectionTag>
    <SectionTag variant="purple">Theming</SectionTag>
  </div>
)
