/** Meta Pixel PageView for SPA route changes */
export function trackMetaPageView() {
  if (typeof window === 'undefined') return
  if (typeof window.fbq !== 'function') return
  window.fbq('track', 'PageView')
}

/** Meta Pixel custom/standard event helper */
export function trackMetaEvent(name, params) {
  if (typeof window === 'undefined' || !name) return
  if (typeof window.fbq !== 'function') return
  if (params) window.fbq('track', name, params)
  else window.fbq('track', name)
}
