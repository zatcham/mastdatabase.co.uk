import React from 'react'
import type { WtrProperties } from './types'

interface WtrPopupProps {
  licence: WtrProperties
}

/**
 * Renders the Leaflet popup content for a single WTR licence.
 * Intentionally compact, the popup is small and shouldn't need scrolling.
 */
export function WtrPopup({ licence }: WtrPopupProps) {
  const erpDisplay = [licence.antennaErp, licence.antennaErpUnit, licence.antennaErpType]
    .filter(Boolean)
    .join(' ') || null

  return (
    <div className="wtr-popup">
      <p className="wtr-popup__licensee">
        {licence.licensee ?? <em>Unknown licensee</em>}
      </p>

      <dl className="wtr-popup__details">
        <Row label="Licence no."   value={licence.licenceNumber} />
        <Row label="Status"        value={licence.status} />
        <Row label="Issued"        value={licence.licenceIssueDate} />
        <Row label="Product"       value={licence.productDescription} />
        <Row label="Product code"  value={licence.productCode} />
        <Row label="Sector"        value={licence.sector} />
        <Row label="Class"         value={licence.class} />
        <Row label="Station type"  value={licence.stationType} />
        <Row label="Frequency"     value={formatHz(licence.frequency)} />
        <Row label="Channel width" value={formatHz(licence.channelWidth)} />
        <Row label="Height ASL"    value={formatM(licence.heightAsl)} />
        <Row label="Antenna type"  value={licence.antennaType} />
        <Row label="Azimuth"       value={formatDeg(licence.antennaAzimuth)} />
        <Row label="Direction"     value={licence.antennaDirection} />
        <Row label="Gain"          value={licence.antennaGain != null ? `${licence.antennaGain} dBd` : null} />
        <Row label="ERP"           value={erpDisplay} />
        <Row label="NGR"           value={licence.ngr} mono />
      </dl>

      <a
        className="wtr-popup__wtr-link"
        href={wtrSearchUrl(licence.licenceNumber)}
        target="_blank"
        rel="noopener noreferrer"
      >
        View on Ofcom WTR ↗
      </a>
    </div>
  )
}

// Helpers

function Row({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  if (!value) return null
  return (
    <>
      <dt className="wtr-popup__label">{label}</dt>
      <dd className={`wtr-popup__value${mono ? ' wtr-popup__value--mono' : ''}`}>{value}</dd>
    </>
  )
}

function formatHz(hz: string | null | undefined): string | null {
  if (!hz) return null
  const n = parseFloat(hz)
  if (isNaN(n)) return hz
  if (n >= 1e9) return `${(n / 1e9).toFixed(3)} GHz`
  if (n >= 1e6) return `${(n / 1e6).toFixed(3)} MHz`
  if (n >= 1e3) return `${(n / 1e3).toFixed(3)} kHz`
  return `${n} Hz`
}

function formatM(val: string | null | undefined): string | null {
  if (!val) return null
  const n = parseFloat(val)
  if (!isNaN(n)) return `${n} m`
  return val
}

function formatDeg(val: number | null | undefined): string | null {
  if (val == null) return null
  return `${val}°`
}

/**
 * Deep-links to the Ofcom Spectrum Information Portal pre-filtered to this licence number.
 * The portal may not always accept these links — if it breaks, remove or update this URL.
 */
function wtrSearchUrl(licenceNumber: string): string {
  return `https://www.ofcom.org.uk/spectrum/frequencies/spectrum-information-portal?licenceNumber=${encodeURIComponent(licenceNumber)}`
}
