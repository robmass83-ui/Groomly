import { Header } from '../components/layout/Header'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <ShellFrame>
      <Header title={title} />
      <p style={{ color: 'var(--tx3)', fontSize: TYPE.base, padding: '0 12px' }}>In arrivo</p>
    </ShellFrame>
  )
}
