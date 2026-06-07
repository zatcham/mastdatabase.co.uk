import React from 'react'
import { useWtrTiles } from './useWtrTiles'

export function WtrStatusBar() {
  const { loading, tooZoomedOut, dataVersion } = useWtrTiles()

  return (
    <div className="wtr-status-bar">
      {tooZoomedOut && <span className="wtr-status-bar__message wtr-status-bar__message--warn">Zoom in to load licence data</span>}

      {!tooZoomedOut && loading && (
        <span className="wtr-status-bar__message wtr-status-bar__message--loading">
          <span className="wtr-status-bar__spinner" aria-hidden />
          Loading licences…
        </span>
      )}

      {dataVersion && <span className="wtr-status-bar__version">Data: {formatVersion(dataVersion)}</span>}
    </div>
  )
}

function formatVersion(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}
