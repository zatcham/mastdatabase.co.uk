import { useCallback, useEffect, useRef, useState } from 'react'
import { useMap, useMapEvent } from 'react-leaflet'
import type { LinkTileCache, TileKey, UseWtrLinksResult, WtrLinkFeature, WtrLinkFeatureCollection } from './types'

const API_BASE: string =
  (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_WTR_API_URL ?? process.env.GATSBY_WTR_API_URL)) || 'http://localhost:8080'

const MIN_LINK_ZOOM = 9
const MAX_LINK_ZOOM = 14

function latLngToTileXY(lat: number, lng: number, z: number): [number, number] {
  const n = Math.pow(2, z)
  const x = Math.floor(((lng + 180) / 360) * n)
  const rad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n)
  return [x, y]
}

function tilesForBounds(south: number, north: number, west: number, east: number, z: number): Array<[number, number, number]> {
  const [xMin, yMin] = latLngToTileXY(north, west, z)
  const [xMax, yMax] = latLngToTileXY(south, east, z)
  const tiles: Array<[number, number, number]> = []
  for (let x = xMin; x <= xMax; x++) for (let y = yMin; y <= yMax; y++) tiles.push([z, x, y])
  return tiles
}

export function useWtrLinks(): UseWtrLinksResult {
  const map = useMap()
  const cache = useRef<LinkTileCache>(new Map())
  const inflight = useRef<Set<TileKey>>(new Set())

  const [links, setLinks] = useState<WtrLinkFeature[]>([])
  const [loading, setLoading] = useState(false)
  const [dataVersion, setDataVersion] = useState<string | null>(null)
  const [tooZoomedOut, setTooZoomedOut] = useState(false)

  const refreshLinks = useCallback((visibleKeys: TileKey[]) => {
    // Deduplicate by licence number — a link whose both endpoints are in the
    // viewport would otherwise appear twice (once from each endpoint's tile).
    const seen = new Set<string>()
    const all: WtrLinkFeature[] = []

    for (const key of visibleKeys) {
      const entry = cache.current.get(key)
      if (entry?.status !== 'loaded') continue
      for (const f of entry.features) {
        if (!seen.has(f.properties.licenceNumber)) {
          seen.add(f.properties.licenceNumber)
          all.push(f)
        }
      }
    }
    setLinks(all)
  }, [])

  const fetchLinks = useCallback(async () => {
    const visualZoom = map.getZoom()

    if (visualZoom < MIN_LINK_ZOOM) {
      setTooZoomedOut(true)
      setLinks([])
      return
    }
    setTooZoomedOut(false)

    const dataZoom = Math.min(visualZoom, MAX_LINK_ZOOM)
    const b = map.getBounds()
    const tiles = tilesForBounds(b.getSouth(), b.getNorth(), b.getWest(), b.getEast(), dataZoom)
    const keys = tiles.map(([z, x, y]) => `${z}/${x}/${y}` as TileKey)

    const toFetch = tiles.filter(([z, x, y]) => {
      const k = `${z}/${x}/${y}` as TileKey
      return !cache.current.has(k) && !inflight.current.has(k)
    })

    refreshLinks(keys)
    if (toFetch.length === 0) return

    setLoading(true)
    toFetch.forEach(([z, x, y]) => inflight.current.add(`${z}/${x}/${y}`))

    await Promise.all(
      toFetch.map(async ([z, x, y]) => {
        const key: TileKey = `${z}/${x}/${y}`
        try {
          const res = await fetch(`${API_BASE}/api/v1/links/${z}/${x}/${y}`)
          if (!res.ok) {
            cache.current.set(key, { status: 'error' })
            return
          }

          const data: WtrLinkFeatureCollection = await res.json()
          cache.current.set(key, { status: 'loaded', features: data.features })

          if (dataVersion === null && data.meta.dataVersion) setDataVersion(data.meta.dataVersion)
        } catch {
          cache.current.set(key, { status: 'error' })
        } finally {
          inflight.current.delete(key)
        }
      }),
    )

    setLoading(false)
    refreshLinks(keys)
  }, [map, dataVersion, refreshLinks])

  useEffect(() => {
    void fetchLinks()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useMapEvent('moveend', fetchLinks)
  useMapEvent('zoomend', fetchLinks)

  return { links, loading, dataVersion, tooZoomedOut }
}
