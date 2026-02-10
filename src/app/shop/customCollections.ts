// src/app/shop/customCollections.ts

import type { CustomCollectionKey } from './products'

export type VariantKey = 'illustrated' | 'pixel'

const R2_BASE =
  process.env.NEXT_PUBLIC_MOONBIRDS_BG_BASE ||
  'https://pub-64564156afab49558e441af999f4c356.r2.dev'

const MYTHICS_CONTRACT = '0xC0FFee8FF7e5497C2d6F7684859709225Fcc5Be8'
const MYTHICS_BASE = `https://proof-nft-image.imgix.net/${MYTHICS_CONTRACT}`


const GLYDERS_ILLU_BASE = process.env.NEXT_PUBLIC_GLYDERS_ILLU_BASE!
const GLYDERS_PIXEL_BASE = process.env.NEXT_PUBLIC_GLYDERS_PIXEL_BG_BASE!

const TRENCHERS_PIXEL_BASE = process.env.NEXT_PUBLIC_TRENCHERS_PIXEL_BG_BASE!
const TRENCHERS_ILLUSTRATED_BASE = process.env.NEXT_PUBLIC_TRENCHERS_ILLU_BG_BASE!


const ODDITIES_PIXEL_BASE =
  process.env.NEXT_PUBLIC_ODDITIES_PIXEL_BASE!

export const CUSTOM_COLLECTIONS: Record<
  CustomCollectionKey,
  {
    supportsVariantToggle: boolean
    defaultVariant: VariantKey
    defaultPreviewToken: string
    isValidToken: (n: number) => boolean
    buildUrl: (n: number, variant: VariantKey) => string
  }
> = {
  moonbirds: {
    supportsVariantToggle: true,
    defaultVariant: 'illustrated',
    defaultPreviewToken: '8209',
    isValidToken: (n) => n >= 0 && n <= 9999,
    buildUrl: (n, variant) => {
      const folder = variant === 'pixel' ? 'moonbirds-pixel-bg' : 'moonbirds-illustrated-bg'
      return `${R2_BASE}/${folder}/${n}.png`
    },
  },
    oddities: {
    supportsVariantToggle: false,
    defaultVariant: 'pixel',
    defaultPreviewToken: '8209',
    isValidToken: (n) => n >= 0 && n <= 9775,
      buildUrl: (n) => `${ODDITIES_PIXEL_BASE}/${n}`,
  },
  
  mythics: {
    supportsVariantToggle: false,
    defaultVariant: 'illustrated',
    defaultPreviewToken: '8743',
    isValidToken: (n) => n >= 0 && n <= 9775,
    buildUrl: (n) => `${MYTHICS_BASE}/${n}`,
  },

  // trenchers: {
  //   supportsVariantToggle: false,
  //   defaultVariant: 'pixel',
  //   defaultPreviewToken: '1962',
  //   isValidToken: (n) => n >= 0 && n <= 2222,
  //     buildUrl: (n) => `${TRENCHERS_PIXEL_BASE}/${n}.png`,
  // },

  //VARIATION LISTING - ONLY ILLU WORKS
trenchers: {
  supportsVariantToggle: true,
  defaultVariant: 'pixel',
  defaultPreviewToken: '1962',
  isValidToken: (n) => n >= 0 && n <= 9999,
  buildUrl: (n, variant) => {
    const ext = variant === 'pixel' ? 'png' : 'jpg'
    const base =
      variant === 'pixel'
        ? TRENCHERS_PIXEL_BASE
        : TRENCHERS_ILLUSTRATED_BASE

    return `${base}/${n}.${ext}`
  },
},


glyders: {
  supportsVariantToggle: true,
  defaultVariant: 'pixel',
  defaultPreviewToken: '925', // pick a token you KNOW exists in your Glyders CDN
  isValidToken: (n) => n >= 1 && n <= 3333, // adjust if Glyders range differs
  buildUrl: (n, variant) => {
    const base =
      variant === 'pixel'
        ? GLYDERS_PIXEL_BASE
        : GLYDERS_ILLU_BASE

    return `${base}/${n}.png`
  },
},
}

export function buildCustomTokenUrl(
  tokenId: string,
  collection: CustomCollectionKey,
  variant?: VariantKey
) {
  const n = Number(tokenId)
  if (!Number.isFinite(n)) return ''

  const cfg = CUSTOM_COLLECTIONS[collection]
  if (!cfg.isValidToken(n)) return ''

  const v = cfg.supportsVariantToggle ? (variant ?? cfg.defaultVariant) : cfg.defaultVariant
  return cfg.buildUrl(n, v)
}