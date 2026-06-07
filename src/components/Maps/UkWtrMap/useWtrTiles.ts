import { useCallback, useEffect, useRef, useState } from 'react'
import { useMap, useMapEvent } from 'react-leaflet'
import type { TileCache, TileKey, UseWtrTilesResult, WtrFeature, WtrFeatureCollection } from './types'

// Config
/**
 * The base URL of the WTR tile API.
 * Set GATSBY_WTR_API_URL (Gatsby) in the env. Falls back to localhost for local development.
 */
const API_BASE: string =
  (typeof process !== 'undefined' && (process.env.GATSBY_WTR_API_URL)) || 'http://localhost:8080'

/**
 * Tile zoom level used for data fetching.
 * This is independent of the map's visual zoom, we clamp it so that at very high zoom we don't request thousands of tiny empty tiles, and at very low zoom we don't request a tile covering half the world.
 *
 * z=12 gives a good trade-off: ~16 tiles cover the UK at once, each returning a manageable number of licences.
 */
const MIN_TILE_ZOOM = 9
const MAX_TILE_ZOOM = 14

// Tile maths
function latLngToTileXY(lat: number, lng: number, z: number): [x: number, y: number] {
  const n = Math.pow(2, z)
  const x = Math.floor(((lng + 180) / 360) * n)
  const rad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n)
  return [x, y]
}

/**
 * Returns all XYZ tile coords at zoom `z` that cover the given bounding box.
 * At the selected zoom, a typical UK viewport yields 9–25 tiles.
 */
function tilesForBounds(south: number, north: number, west: number, east: number, z: number): Array<[z: number, x: number, y: number]> {
  // y=0 is north; y increases southward
  const [xMin, yMin] = latLngToTileXY(north, west, z)
  const [xMax, yMax] = latLngToTileXY(south, east, z)
  const tiles: Array<[number, number, number]> = []
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      tiles.push([z, x, y])
    }
  }
  return tiles
}

// Hook

export function useWtrTiles(): UseWtrTilesResult {
  const map = useMap()

  /**
   * Persists across renders. We use a ref so that the cache survives map move without causing re-renders itself. Tiles are keyed by "z/x/y".
   */
  const cache = useRef<TileCache>(new Map())

  /** In-flight requests — deduplicate concurrent fetches for the same tile. */
  const inflight = useRef<Set<TileKey>>(new Set())

  const [features, setFeatures] = useState<WtrFeature[]>([])
  const [loading, setLoading] = useState(false)
  const [dataVersion, setDataVersion] = useState<string | null>(null)
  const [tooZoomedOut, setTooZoomedOut] = useState(false)

  // Visible features
  /** Recomputes the rendered feature list from currently visible tile keys. */
  const refreshFeatures = useCallback((visibleKeys: TileKey[]) => {
    const seen = new Map<number, WtrFeature>()
    for (const key of visibleKeys) {
      const entry = cache.current.get(key)
      if (entry?.status === 'loaded') {
        for (const f of entry.features) {
          if (!seen.has(f.id)) seen.set(f.id, f)
        }
      }
    }
    setFeatures(Array.from(seen.values()))
  }, [])

  // Fetch logic

  const fetchTiles = useCallback(async () => {
    const visualZoom = map.getZoom()

    if (visualZoom < MIN_TILE_ZOOM) {
      setTooZoomedOut(true)
      setFeatures([])
      return
    }
    setTooZoomedOut(false)

    // Clamp data fetch zoom, prevents requesting impossibly many tiny tiles
    const dataZoom = Math.min(visualZoom, MAX_TILE_ZOOM)

    const b = map.getBounds()
    const tiles = tilesForBounds(b.getSouth(), b.getNorth(), b.getWest(), b.getEast(), dataZoom)
    const keys = tiles.map(([z, x, y]) => `${z}/${x}/${y}` as TileKey)

    const toFetch = tiles.filter(([z, x, y]) => {
      const k = `${z}/${x}/${y}` as TileKey
      return !cache.current.has(k) && !inflight.current.has(k)
    })

    // Re-render with what we already have before the async fetch
    refreshFeatures(keys)

    if (toFetch.length === 0) return

    setLoading(true)

    // Mark all as in fight before dispatching to prevent duplicate requests
    toFetch.forEach(([z, x, y]) => {
      inflight.current.add(`${z}/${x}/${y}` as TileKey)
    })

    await Promise.all(
      toFetch.map(async ([z, x, y]) => {
        const key: TileKey = `${z}/${x}/${y}`
        try {
          const res = await fetch(`${API_BASE}/api/v1/tiles/${z}/${x}/${y}`)

          if (!res.ok) {
            cache.current.set(key, { status: 'error' })
            return
          }

          const data: WtrFeatureCollection = await res.json()
          cache.current.set(key, { status: 'loaded', features: data.features })

          // Capture the data version from the first successful response
          if (dataVersion === null && data.meta.dataVersion) {
            setDataVersion(data.meta.dataVersion)
          }
        } catch {
          // Network failure, mark as error but don't re-throw; the map stays interactive with whatever tiles we already have.
          cache.current.set(key, { status: 'error' })
        } finally {
          inflight.current.delete(key)
        }
      }),
    )

    setLoading(false)
    refreshFeatures(keys)
  }, [map, dataVersion, refreshFeatures])

  // Map events
  // Initial load
  useEffect(() => {
    void fetchTiles()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useMapEvent('moveend', fetchTiles)
  useMapEvent('zoomend', fetchTiles)

  return { features, loading, dataVersion, tooZoomedOut }
}
