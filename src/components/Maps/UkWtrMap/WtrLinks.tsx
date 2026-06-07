import React, { useCallback, useState } from 'react'
import { Polyline, Popup, useMap } from 'react-leaflet'
import { useWtrLinks } from './useWtrLinks'
import type { WtrLinkFeature, WtrLinkProperties } from './types'

/**
 * Renders P2P fixed links as Leaflet Polylines.
 *
 * Each line connects two distinct geographic sites that share a licence number in the WTR.
 * Clicking a line opens a popup with licence details and buttons to fly to either endpoint.
 * The selected link turns green while its popup is open.
 */
export function WtrLinks() {
  const { links } = useWtrLinks()
  const [selectedLicNo, setSelectedLicNo] = useState<string | null>(null)

  const handleOpen = useCallback((licNo: string) => setSelectedLicNo(licNo), [])
  const handleClose = useCallback(() => setSelectedLicNo(null), [])

  if (links.length === 0) return null

  return (
    <>
      {links.map(link => (
        <LinkLine
          key={link.properties.licenceNumber}
          link={link}
          selected={link.properties.licenceNumber === selectedLicNo}
          onOpen={handleOpen}
          onClose={handleClose}
        />
      ))}
    </>
  )
}

// Single link line

const orangeOptions = { color: '#e05c00', weight: 2, opacity: 0.75 }
const greenOptions = { color: '#16a34a', weight: 3, opacity: 0.95 }

interface LinkLineProps {
  link: WtrLinkFeature
  selected: boolean
  onOpen: (licNo: string) => void
  onClose: () => void
}

const LinkLine = React.memo(
  function LinkLine({ link, selected, onOpen, onClose }: LinkLineProps) {
    const [[lngA, latA], [lngB, latB]] = link.geometry.coordinates
    const licNo = link.properties.licenceNumber

    return (
      <Polyline
        positions={[[latA, lngA], [latB, lngB]]}
        pathOptions={selected ? greenOptions : orangeOptions}
        eventHandlers={{
          popupopen: () => onOpen(licNo),
          popupclose: onClose,
        }}
      >
        <Popup maxWidth={280} autoPan={false}>
          <LinkPopup props={link.properties} coords={link.geometry.coordinates} />
        </Popup>
      </Polyline>
    )
  },
  (prev, next) => prev.selected === next.selected && prev.link === next.link,
)

// Link popup

interface LinkPopupProps {
  props: WtrLinkProperties
  coords: [[number, number], [number, number]]
}

function LinkPopup({ props, coords }: LinkPopupProps) {
  const map = useMap()
  const [[lngA, latA], [lngB, latB]] = coords

  return (
    <div className="wtr-popup">
      <p className="wtr-popup__licensee">{props.licensee ?? <em>Unknown licensee</em>}</p>
      <dl className="wtr-popup__details">
        <dt className="wtr-popup__label">Licence</dt>
        <dd className="wtr-popup__value wtr-popup__value--mono">{props.licenceNumber}</dd>

        {props.sector && (
          <>
            <dt className="wtr-popup__label">Sector</dt>
            <dd className="wtr-popup__value">{props.sector}</dd>
          </>
        )}
        {props.productDescription && (
          <>
            <dt className="wtr-popup__label">Product</dt>
            <dd className="wtr-popup__value">{props.productDescription}</dd>
          </>
        )}
      </dl>

      <span className="wtr-popup__badge wtr-popup__badge--link">P2P Fixed Link</span>

      <div className="wtr-popup__jump-buttons">
        <button className="wtr-popup__jump-btn" onClick={() => map.flyTo([latA, lngA], 15)}>
          Jump to site A
        </button>
        <button className="wtr-popup__jump-btn" onClick={() => map.flyTo([latB, lngB], 15)}>
          Jump to site B
        </button>
      </div>
    </div>
  )
}
