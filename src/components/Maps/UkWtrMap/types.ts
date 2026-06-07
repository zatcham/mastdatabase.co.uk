// WTR licence data

export interface WtrProperties {
  licenceNumber: string
  sector: string | null
  class: string | null
  licensee: string | null
  frequency: string | null
  ngr: string | null
  stationType: string | null
  productCode: string | null
  productDescription: string | null
  licenceIssueDate: string | null
  channelWidth: string | null
  heightAsl: string | null
  antennaAzimuth: number | null
  antennaErp: string | null
  antennaErpUnit: string | null
  antennaErpType: string | null
  antennaType: string | null
  antennaGain: number | null
  antennaDirection: string | null
  status: string | null
}

export interface WtrFeature {
  type: 'Feature'
  id: number
  geometry: {
    type: 'Point'
    coordinates: [lng: number, lat: number] // GeoJSON order: [longitude, latitude]
  }
  properties: WtrProperties
}

export interface TileMeta {
  tileZ: number
  tileX: number
  tileY: number
  count: number
  dataVersion: string
}

export interface WtrFeatureCollection {
  type: 'FeatureCollection'
  features: WtrFeature[]
  meta: TileMeta
}

// Tile cache
// Unique string key for a tile: "z/x/y"
export type TileKey = `${number}/${number}/${number}`

export type TileState = { status: 'loading' } | { status: 'loaded'; features: WtrFeature[] } | { status: 'error' }

export type TileCache = Map<TileKey, TileState>

// P2P link (LineString) types

export interface WtrLinkProperties {
  licenceNumber: string
  licensee: string | null
  sector: string | null
  productDescription: string | null
}

export interface WtrLinkFeature {
  type: 'Feature'
  geometry: {
    type: 'LineString'
    /** [[lngA, latA], [lngB, latB]] — GeoJSON order */
    coordinates: [[number, number], [number, number]]
  }
  properties: WtrLinkProperties
}

export interface WtrLinkFeatureCollection {
  type: 'FeatureCollection'
  features: WtrLinkFeature[]
  meta: TileMeta
}

// Link tile cache types
export type LinkTileState =
  | { status: 'loading' }
  | { status: 'loaded'; features: WtrLinkFeature[] }
  | { status: 'error' }

export type LinkTileCache = Map<TileKey, LinkTileState>

// Hook return types
export interface UseWtrTilesResult {
  features: WtrFeature[]
  loading: boolean
  dataVersion: string | null
  tooZoomedOut: boolean
}

export interface UseWtrLinksResult {
  links: WtrLinkFeature[]
  loading: boolean
  dataVersion: string | null
  tooZoomedOut: boolean
}
