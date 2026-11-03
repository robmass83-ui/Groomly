import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { schedule } = vi.hoisted(() => ({ schedule: vi.fn(async () => ({ notifications: [] })) }))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: { schedule } }))

import { programmaNotifiche } from './notificheLocali'

function sorgenti(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) sorgenti(path, out)
    else if (/\.tsx?$/.test(name) && !name.includes('.test.')) out.push(path)
  }
  return out
}

describe('notifiche locali', () => {
  beforeEach(() => schedule.mockClear())

  it('ogni notifica è inesatta: Android non apre «Sveglie e promemoria»', async () => {
    await programmaNotifiche([
      { id: 1, title: 'A', body: 'a', schedule: { at: new Date(2026, 10, 3, 18), allowWhileIdle: true } },
      { id: 2, title: 'B', body: 'b', isExactNotification: true },
    ])
    expect(schedule).toHaveBeenCalledWith({
      notifications: [
        expect.objectContaining({ id: 1, isExactNotification: false }),
        expect.objectContaining({ id: 2, isExactNotification: false }),
      ],
    })
  })

  it('nessun altro punto dell’app chiama LocalNotifications.schedule', () => {
    const altri = sorgenti(join(process.cwd(), 'src'))
      .filter((file) => !file.endsWith('notificheLocali.ts'))
      .filter((file) => readFileSync(file, 'utf8').includes('LocalNotifications.schedule'))
    expect(altri).toEqual([])
  })
})
