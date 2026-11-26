// Génère les icônes PNG de l'application (ballon jaune sur fond bleu nuit).
// Pour utiliser le logo du club à la place, remplace simplement les fichiers de public/icons.
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync, crc32 } from 'node:zlib'

const BLUE = [21, 36, 80]
const YELLOW = [255, 207, 51]

function pixel(x, y) {
  // coordonnées normalisées autour du centre
  const dx = x - 0.5
  const dy = y - 0.5
  const r = Math.hypot(dx, dy)
  if (r > 0.34) return BLUE
  const line = 0.016
  const side = (cx) => Math.abs(Math.hypot(dx - cx, dy) - 0.33) < line
  if (Math.abs(dx) < line || Math.abs(dy) < line || side(0.46) || side(-0.46)) return BLUE
  return YELLOW
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data])
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  const ss = 3 // lissage des bords
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sum = [0, 0, 0]
      for (let i = 0; i < ss; i++) {
        for (let j = 0; j < ss; j++) {
          pixel((x + (i + 0.5) / ss) / size, (y + (j + 0.5) / ss) / size).forEach((v, k) => (sum[k] += v))
        }
      }
      const o = y * (size * 3 + 1) + 1 + x * 3
      sum.forEach((v, k) => (raw[o + k] = Math.round(v / (ss * ss))))
    }
  }
  const head = Buffer.alloc(13)
  head.writeUInt32BE(size, 0)
  head.writeUInt32BE(size, 4)
  head[8] = 8
  head[9] = 2
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', head),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/icons', { recursive: true })
for (const [name, size] of [['icon-192', 192], ['icon-512', 512], ['apple-touch-icon', 180]]) {
  writeFileSync(`public/icons/${name}.png`, png(size))
}
console.log('Icônes écrites dans public/icons')
