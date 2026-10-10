import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { trackMetaPageView } from '../lib/analytics.js'
import { trackSiteEngage, trackSitePageView } from '../lib/visitorTracking.js'

const PAGE_TITLES = {
  '/': 'Pranav One — Tally + Computer Course | 100% Placement Opportunities',
  '/terms': 'Terms & Conditions — Pranav One',
  '/terms-and-conditions': 'Terms & Conditions — Pranav One',
  '/refund-policy': 'Refund Policy & Job Assistance — Pranav One',
  '/policy': 'Refund Policy & Job Assistance — Pranav One',
  '/tredsdash': 'TredsDash — Pranav One Admin',
  '/admin': 'TredsDash — Pranav One Admin',
}

export default function AnalyticsRouteTracker() {
  const location = useLocation()
  const engagedRef = useRef(false)

  useEffect(() => {
    if (location.pathname.startsWith('/tredsdash') || location.pathname.startsWith('/admin')) {
      return undefined
    }

    const path = `${location.pathname}${location.search}`
    const title = PAGE_TITLES[location.pathname] || document.title
    trackMetaPageView()
    void trackSitePageView({ path, title })

    engagedRef.current = false
    const onScroll = () => {
      if (engagedRef.current) return
      const scrolled = window.scrollY || document.documentElement.scrollTop || 0
      const height = document.documentElement.scrollHeight - window.innerHeight
      if (height > 0 && scrolled / height >= 0.25) {
        engagedRef.current = true
        void trackSiteEngage({ path, title })
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    const timer = window.setTimeout(() => {
      if (!engagedRef.current) {
        engagedRef.current = true
        void trackSiteEngage({ path, title })
      }
    }, 12_000)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.clearTimeout(timer)
    }
  }, [location.pathname, location.search])

  return null
}
