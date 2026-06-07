import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { useWtrTiles } from './useWtrTiles'
import { WtrPopup } from './WtrPopup'
import type { WtrFeature } from './types'

interface WtrMarkersProps {
  filterFreq?: string
}

/**
 * Fetches WTR tile data for the current viewport and renders all licences as clustered markers.
 * Optionally filtered by a frequency substring match against the raw Hz string.
 *
 * Clustering is handled by react-leaflet-cluster (which wraps Leaflet.markercluster).
 * At low zoom, hundreds of nearby licences collapse into a single cluster bubble.
 * Clicking a bubble zooms in and spiderfies overlapping points.
 *
 * This component must be mounted inside a <MapContainer>.
 */
export function WtrMarkers({ filterFreq }: WtrMarkersProps) {
  const { features, tooZoomedOut } = useWtrTiles()

  if (tooZoomedOut || features.length === 0) return null

  const visible = filterFreq
    ? features.filter(f => f.properties.frequency?.includes(filterFreq) ?? false)
    : features

  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={60}
      showCoverageOnHover={false}
    >
      {visible.map(feature => (
        <LicenceMarker key={feature.id} feature={feature} />
      ))}
    </MarkerClusterGroup>
  )
}

// Single marker

const LicenceMarker = React.memo(function LicenceMarker({ feature }: { feature: WtrFeature }) {
  const [lng, lat] = feature.geometry.coordinates

  return (
    <Marker position={[lat, lng]}>
      <Popup maxWidth={320} autoPan={false}>
        <WtrPopup licence={feature.properties} />
      </Popup>
    </Marker>
  )
})
