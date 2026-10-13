import { Fragment, type ReactNode } from 'react'

export function breakAfterPlus(text: string): ReactNode {
  const parts = text.split('+')
  return parts.map((part, index) => (
    <Fragment key={index}>
      {part}
      {index < parts.length - 1 ? <>+<wbr /></> : null}
    </Fragment>
  ))
}
