// src/lib/deckComposite.ts
export type ImgLayer = {
  type: 'image'
  src: string
  /** normalized position (0..1) of the anchor point within the canvas */
  nx: number
  ny: number
  /** width relative to canvas width (e.g., 0.42 = 42% of canvas width) */
  wRatio: number
  /** rotation in degrees (clockwise positive) */
  rotationDeg?: number
  /** anchor point; determines how the bitmap sits at (nx, ny) */
  anchor?: 'center' | 'leftCenter' | 'topLeft'
  /** extra opacity 0..1 */
  opacity?: number
}

export type TextLayer = {
  type: 'text'
  text: string
  nx: number
  ny: number
  font: string        // e.g. "700 64px Inter"
  fill: string        // e.g. "#ffffff"
  align?: CanvasTextAlign
  baseline?: CanvasTextBaseline
  rotationDeg?: number
  opacity?: number
}

export type Layer = ImgLayer | TextLayer

export type ComposeOpts = {
  width: number
  height: number
  background?: string // optional solid color (e.g., "#000") drawn before layers
}

/** Simple loader with cache */
const imageCache = new Map<string, Promise<HTMLImageElement>>()
export function loadImage(src: string): Promise<HTMLImageElement> {
  if (!imageCache.has(src)) {
    imageCache.set(
      src,
      new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
      })
    )
  }
  return imageCache.get(src)!
}

/** Compose layers to a dataURL */
export async function composeDeckImage(layers: Layer[], opts: ComposeOpts): Promise<string> {
  const c = document.createElement('canvas')
  c.width = opts.width
  c.height = opts.height
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('No 2D context')

  // background color (optional)
  if (opts.background) {
    ctx.fillStyle = opts.background
    ctx.fillRect(0, 0, c.width, c.height)
  }

  for (const layer of layers) {
    if (layer.type === 'image') {
      const img = await loadImage(layer.src)
      const w = Math.max(1, layer.wRatio * c.width)
      const h = (img.naturalHeight || img.height) * (w / (img.naturalWidth || img.width))
      const x = layer.nx * c.width
      const y = layer.ny * c.height
      const rot = ((layer.rotationDeg ?? 0) * Math.PI) / 180

      ctx.save()
      if (layer.opacity != null) ctx.globalAlpha = layer.opacity

      // translate to anchor point
      ctx.translate(x, y)
      if (rot) ctx.rotate(rot)

      // draw according to anchor
      switch (layer.anchor ?? 'center') {
        case 'leftCenter':
          ctx.drawImage(img, 0, -h / 2, w, h)
          break
        case 'topLeft':
          ctx.drawImage(img, 0, 0, w, h)
          break
        default:
          // 'center'
          ctx.drawImage(img, -w / 2, -h / 2, w, h)
      }
      ctx.restore()
    } else {
      // text
      ctx.save()
      if (layer.opacity != null) ctx.globalAlpha = layer.opacity
      ctx.font = layer.font
      ctx.fillStyle = layer.fill
      ctx.textAlign = layer.align ?? 'center'
      ctx.textBaseline = layer.baseline ?? 'middle'
      const rot = ((layer.rotationDeg ?? 0) * Math.PI) / 180
      const x = layer.nx * c.width
      const y = layer.ny * c.height
      ctx.translate(x, y)
      if (rot) ctx.rotate(rot)
      ctx.fillText(layer.text, 0, 0)
      ctx.restore()
    }
  }

  return c.toDataURL('image/png')
}