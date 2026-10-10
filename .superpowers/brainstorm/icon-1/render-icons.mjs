import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const root = 'D:/Groomly'
const res = path.join(root, 'android/app/src/main/res')
const fullbleed = readFileSync(path.join(root, 'src/assets/brand/groomly-icon-fullbleed.svg'))
const verticale = readFileSync(path.join(root, 'src/assets/brand/groomly-logo-verticale.svg'), 'utf8')
const orizzontale = readFileSync(path.join(root, 'src/assets/brand/groomly-logo-orizzontale.svg'), 'utf8')

function png(svg, width) {
  const rendered = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render()
  return rendered.asPng()
}

const launcher = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
const foreground = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 }

for (const [density, size] of Object.entries(launcher)) {
  const bytes = png(fullbleed, size)
  const dir = path.join(res, `mipmap-${density}`)
  writeFileSync(path.join(dir, 'ic_launcher.png'), bytes)
  writeFileSync(path.join(dir, 'ic_launcher_round.png'), bytes)
}

for (const [density, size] of Object.entries(foreground)) {
  writeFileSync(path.join(res, `mipmap-${density}`, 'ic_launcher_foreground.png'), png(fullbleed, size))
}

function place(svgText, viewBox, x, y, width, height) {
  const inner = svgText.replace(/<svg[^>]*>/, `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${viewBox}">`)
  return inner
}

function splash(file) {
  const buf = readFileSync(file)
  const width = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)
  const portrait = height >= width
  const logoW = Math.round(width * (portrait ? 0.62 : 0.72))
  const logoH = Math.round(logoW * (portrait ? 250 / 307 : 120 / 437))
  const x = Math.round((width - logoW) / 2)
  const y = Math.round((height - logoH) / 2)
  const logo = portrait
    ? place(verticale, '0 0 307 250', x, y, logoW, logoH)
    : place(orizzontale, '0 0 437 120', x, y, logoW, logoH)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#eceff4"/>${logo}</svg>`
  writeFileSync(file, png(svg, width))
}

const splashes = [
  'drawable/splash.png',
  'drawable-land-hdpi/splash.png',
  'drawable-land-mdpi/splash.png',
  'drawable-land-xhdpi/splash.png',
  'drawable-land-xxhdpi/splash.png',
  'drawable-land-xxxhdpi/splash.png',
  'drawable-port-hdpi/splash.png',
  'drawable-port-mdpi/splash.png',
  'drawable-port-xhdpi/splash.png',
  'drawable-port-xxhdpi/splash.png',
  'drawable-port-xxxhdpi/splash.png',
]
for (const name of splashes) splash(path.join(res, name))
