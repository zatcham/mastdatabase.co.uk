/**
 * WtrMap.tsx
 * Ofcom Wireless Telegraphy Register map.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { MapContainer, ScaleControl, TileLayer, useMap, useMapEvent } from 'react-leaflet'
import { GeolocationMarker } from '@leaflet/GeolocationMarker'
import GeolocationButton from '@leaflet/GeolocationButton'
import MapCustomButtonsContainer from '@leaflet/MapCustomButtonsContainer'
import MapCustomButton from '@leaflet/MapCustomButton'
import useFixLeafletAssets from '@hooks/useFixLeafletAssets'
import { useUserLocation } from '@hooks/useUserLocation'
import useForceRender from '@hooks/useForceRerender'
import { useErrorBoundary } from 'react-use-error-boundary'
import Section from '@components/Design/Section'
import ButtonLink from '@components/Links/ButtonLink'
import { WtrMarkers } from './WtrMarkers'
import { WtrLinks } from './WtrLinks'
import { WtrStatusBar } from './WtrStatusBar'
import type { Map } from 'leaflet'

import 'leaflet/dist/leaflet.css'
// import 'react-leaflet-cluster/lib/assets/MarkerCluster.css'
// import 'react-leaflet-cluster/lib/assets/MarkerCluster.Default.css'
import './UkWtrMap.less'

// Map

const WtrMap = React.forwardRef<Map>(function WtrMap(_, ref) {
  useFixLeafletAssets()
  const [error] = useErrorBoundary()
  const [filterFreq, setFilterFreq] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)

  if (error) {
    console.error('[WtrMap] Unhandled render error:', error)
    return (
      <Section darker>
        <p className="text-speak-up">We ran into an error while trying to display the WTR map.</p>
        <p className="text-speak">
          <ButtonLink onClick={() => window.location.reload()}>Reloading the page</ButtonLink> should fix this. If the problem persists, the
          Ofcom API may be temporarily unavailable.
        </p>
      </Section>
    )
  }

  return (
    <MapContainer
      // CSS variable lets you override height from the parent without !important
      style={
        {
          '--map-height': '75vh',
          height: 'var(--map-height)',
        } as React.CSSProperties
      }
      center={[54.5, -3.5]}
      zoom={7}
      attributionControl={false}
      ref={ref}
    >
      {/* Base map (OpenStreetMap + attribution) */}
      <WtrBaseMap />

      {/* P2P link lines — rendered before markers so lines sit below pins */}
      <WtrLinks />

      {/* User's geolocation */}
      <GeolocationMarker />

      {/* WTR data layer — fetches tiles, renders clustered markers */}
      <WtrMarkers filterFreq={filterFreq} />

      {/* Loading / zoom hint / data version overlay */}
      <WtrStatusBar />

      {/* Scale bar */}
      <ScaleControl imperial metric />

      {/* Custom toolbar */}
      <WtrControlButtons
        filterOpen={filterOpen}
        filterFreq={filterFreq}
        onFilterToggle={() => setFilterOpen(o => !o)}
        onFilterFreqChange={setFilterFreq}
      />
    </MapContainer>
  )
})

export default WtrMap

// Base map

function WtrBaseMap() {
  return (
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Ofcom WTR data &copy; Ofcom (OGL)'
      maxZoom={19}
    />
  )
}

// Custom toolbar + filter panel

interface WtrControlButtonsProps {
  filterOpen: boolean
  filterFreq: string
  onFilterToggle: () => void
  onFilterFreqChange: (v: string) => void
}

/**
 * Matches the StreetworksMap CustomControlButtons pattern.
 * Filter state is lifted to WtrMap so WtrMarkers can consume it.
 */
function WtrControlButtons({ filterOpen, filterFreq, onFilterToggle, onFilterFreqChange }: WtrControlButtonsProps) {
  const map = useMap()
  const forceRender = useForceRender()
  const geolocation = useUserLocation()
  const panelRef = useRef<HTMLDivElement>(null)

  const location: [number, number] | null = geolocation ? [geolocation.latitude, geolocation.longitude] : null
  const isCentred = location ? map.getCenter().equals(location, 0.00001) : false

  useMapEvent(
    'move',
    useCallback(() => {
      if (!location) return
      if (map.getCenter().equals(location, 0.00001) !== isCentred) forceRender()
    }, [location, map, forceRender, isCentred]),
  )

  useMapEvent('enterFullscreen', forceRender)
  useMapEvent('exitFullscreen', forceRender)

  // Prevent map scroll/click from propagating through the filter panel
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet')
    L.DomEvent.disableScrollPropagation(panel)
    L.DomEvent.disableClickPropagation(panel)
  }, [filterOpen])

  return (
    <>
      {filterOpen && (
        <div ref={panelRef} className="wtr-filter-panel">
          <div className="wtr-filter-panel__header">
            <span className="wtr-filter-panel__title">Filter licences</span>
            <button className="wtr-filter-panel__close" onClick={onFilterToggle} aria-label="Close filter panel">✕</button>
          </div>
          <label className="wtr-filter-panel__label" htmlFor="wtr-freq-filter">Frequency (Hz)</label>
          <input
            id="wtr-freq-filter"
            className="wtr-filter-panel__input"
            type="text"
            placeholder="e.g. 72375000000"
            value={filterFreq}
            onChange={e => onFilterFreqChange(e.target.value)}
          />
          <p className="wtr-filter-panel__hint">Enter any part of the raw Hz value</p>
          {filterFreq && (
            <button className="wtr-filter-panel__clear" onClick={() => onFilterFreqChange('')}>
              Clear
            </button>
          )}
        </div>
      )}

      <MapCustomButtonsContainer>
        <MapCustomButton aria-label="Filter licences" onClick={onFilterToggle}>
          {/* Filter icon */}
          <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M14,12V19.88C14.04,20.18 13.94,20.5 13.71,20.71C13.32,21.1 12.69,21.1 12.3,20.71L10.29,18.7C10.06,18.47 9.96,18.16 10,17.87V12H9.97L4.21,4.62C3.87,4.19 3.95,3.56 4.38,3.22C4.57,3.08 4.78,3 5,3V3H19V3C19.22,3 19.43,3.08 19.62,3.22C20.05,3.56 20.13,4.19 19.79,4.62L14.03,12H14Z"
            />
          </svg>
        </MapCustomButton>

        <GeolocationButton />
      </MapCustomButtonsContainer>
    </>
  )
}
