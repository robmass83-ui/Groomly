// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { DayPoint } from '../../lib/earnings'
import { CumulativeChart } from './CumulativeChart'

const PAD_L = 28
const VB_W = 320
const CARD_W = 640

function october(): DayPoint[] {
  return Array.from({ length: 31 }, (_, index) => ({
    day: index + 1,
    current: (index + 1) * 10,
    previous: null,
  }))
}

describe('CumulativeChart', () => {
  it('su una card più larga il dito segue la figura, non la larghezza intera', () => {
    render(<CumulativeChart points={october()} month={new Date(2026, 9, 1)} hidden={false} />)
    const chart = screen.getByRole('img', { name: 'Andamento di ottobre 2026' }).parentElement as HTMLDivElement
    const svg = chart.querySelector('svg') as SVGSVGElement
    const offsetX = (CARD_W - VB_W) / 2
    svg.getScreenCTM = () => ({
      inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: -offsetX, f: 0 }),
    }) as DOMMatrix
    svg.createSVGPoint = () => {
      const point = {
        x: 0,
        y: 0,
        matrixTransform(matrix: { a: number; b: number; c: number; d: number; e: number; f: number }) {
          return {
            x: matrix.a * point.x + matrix.c * point.y + matrix.e,
            y: matrix.b * point.x + matrix.d * point.y + matrix.f,
          }
        },
      }
      return point as SVGPoint
    }
    const pill = screen.getByText('€ 310')
    const dot = svg.querySelector('circle')
    expect(pill.parentElement).toHaveStyle({ maxWidth: '320px', aspectRatio: '320 / 118' })
    expect(pill.style.left).toBe(`${(Number(dot?.getAttribute('cx')) / VB_W) * 100}%`)

    fireEvent.pointerDown(chart, { clientX: offsetX + PAD_L, clientY: 40 })
    expect(screen.getByRole('status')).toHaveTextContent('1 ottobre')

    const plotRight = VB_W - 8
    fireEvent.pointerDown(chart, { clientX: offsetX + plotRight, clientY: 40 })
    expect(screen.getByRole('status')).toHaveTextContent('31 ottobre')
  })
})
