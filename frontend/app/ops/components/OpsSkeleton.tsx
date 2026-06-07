'use client'

export function OpsSkeleton({ className }: { className?: string }) {
  return <span className={['ops-skeleton', className].filter(Boolean).join(' ')} aria-hidden />
}

export function OpsKpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="ops-kpi-grid" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="ops-panel ops-panel--pad-md">
          <OpsSkeleton className="ops-skeleton--label" />
          <OpsSkeleton className="ops-skeleton--value" />
        </div>
      ))}
    </div>
  )
}

export function OpsTableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="ops-table-wrap" aria-busy="true" aria-label="Loading">
      <table className="ops-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}>
                <OpsSkeleton className="ops-skeleton--cell" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <OpsSkeleton className="ops-skeleton--cell" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function OpsPageSkeleton() {
  return (
    <div className="ops-page-skeleton">
      <OpsSkeleton className="ops-skeleton--title" />
      <OpsSkeleton className="ops-skeleton--lead" />
      <OpsKpiSkeleton count={4} />
    </div>
  )
}

export function OpsCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="ops-stack ops-stack--lg" aria-busy="true" aria-label="Loading">
      <OpsSkeleton className="ops-skeleton--title" />
      <OpsSkeleton className="ops-skeleton--lead" />
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="ops-panel ops-panel--pad-md">
          <OpsSkeleton className="ops-skeleton--label" />
          <OpsSkeleton className="ops-skeleton--cell" />
          <OpsSkeleton className="ops-skeleton--cell" />
        </div>
      ))}
    </div>
  )
}
