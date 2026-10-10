function maxValue(series, keys) {
  let max = 1
  for (const row of series || []) {
    for (const key of keys) {
      max = Math.max(max, Number(row[key]) || 0)
    }
  }
  return max
}

export function SparkBars({ series = [], keys = ['uniqueVisitors'], labels = {} }) {
  const peak = maxValue(series, keys)
  return (
    <div className="td-chart" role="img" aria-label="Trend chart">
      {series.map((row) => (
        <div className="td-chart-col" key={row.day}>
          <div className="td-chart-bars">
            {keys.map((key) => (
              <span
                key={key}
                className={`td-bar td-bar--${key}`}
                style={{ height: `${Math.max(4, ((Number(row[key]) || 0) / peak) * 100)}%` }}
                title={`${labels[key] || key}: ${row[key] || 0}`}
              />
            ))}
          </div>
          <span className="td-chart-label">{String(row.day).slice(5)}</span>
        </div>
      ))}
    </div>
  )
}

export function StatCards({ items = [] }) {
  return (
    <section className="td-stats">
      {items.map((item) => (
        <article className="td-stat" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.hint ? <em>{item.hint}</em> : null}
        </article>
      ))}
    </section>
  )
}

function columnLetter(index) {
  let label = ''
  let n = index
  do {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return label
}

/** Spreadsheet column letters (A, B, C…) shown above a table's header row. */
export function SheetLetters({ count, stickyFirst = true }) {
  return (
    <tr className="td-sheet-letters" aria-hidden="true">
      <th className="td-sheet-rownum" />
      {Array.from({ length: count }, (_, i) => (
        <th key={i} className={stickyFirst && i === 0 ? 'td-sheet-sticky' : undefined}>
          {columnLetter(i)}
        </th>
      ))}
    </tr>
  )
}

function csvCell(value) {
  const text = value == null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Downloads rows as a CSV file that opens directly in Excel. */
export function downloadCsv(filename, columns, rows) {
  const lines = [
    columns.map((c) => csvCell(c.label)).join(','),
    ...rows.map((row) => columns.map((c) => csvCell(c.value(row))).join(',')),
  ]
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="td-pagination">
      <button
        type="button"
        className="td-btn td-btn--ghost"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Prev
      </button>
      <span>
        Page {page} / {totalPages}
      </span>
      <button
        type="button"
        className="td-btn td-btn--ghost"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </div>
  )
}
