export type FitMode = 'cover' | 'contain' | 'stretch'

export interface DeckSide {
  imageUrl: string | null
  gripId?: string | null
  fit: FitMode
  rotationDeg: number
  scale: number
  offset: { x: number; y: number }
  flipX: boolean
  flipY: boolean
}

export interface DeckDesignV1 {
  v: 1
  deckModel: 'deck-v1'
  collection: 'moonbirds'
  style: 'illustrated' | 'pixel' | 'oddity'
  tokenId: string | null
  top: DeckSide
  bottom: DeckSide
}