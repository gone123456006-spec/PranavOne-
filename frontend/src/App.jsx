import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Briefcase,
  Calculator,
  CaretLeft,
  CaretRight,
  Desktop,
} from '@phosphor-icons/react'
import { useAuth, getAccessToken } from './context/AuthContext.jsx'
import { apiUrl } from './lib/api.js'
import './App.css'

const WHATSAPP_SUPPORT_PHONE = '919153832948'
const WHATSAPP_CHANNEL_URL =
  'https://whatsapp.com/channel/0029Vb8bHENHQbRzGerkML0N'

const EVENT_SPEAKER = {
  role: 'Chartered Accountant | Ex-Deloitte | Founder, Pranav One',
  photo: '/images/event-speaker.jpg',
}

const PAST_EVENTS = [
  {
    lead: 'MS Excel for Accountants:',
    rest: 'Formulas, Pivot Tables & MIS Reports',
  },
  {
    lead: 'GST Billing in TallyPrime:',
    rest: 'E-Invoice, Returns & Reconciliation',
  },
  {
    lead: 'TallyPrime from Scratch:',
    rest: 'Ledgers, Vouchers & Reports',
  },
  {
    lead: 'Banking in TallyPrime:',
    rest: 'BRS, TDS & Year-End Closing',
  },
  {
    lead: 'Inventory & Payroll in TallyPrime:',
    rest: 'Stock, Godowns & Salary Processing',
  },
  {
    lead: 'Computer Basics for Beginners:',
    rest: 'Windows, Files, Internet & Email',
  },
]

// `src` = self-hosted MP4 in frontend/public/videos (plays inline on this site).
// Without `src`, the Instagram reel embed is shown instead.
const STUDENT_VIDEOS = [
  { reel: 'DNDGFoWKneq', src: '/videos/student-1.mp4', poster: '/videos/student-1.jpg' },
  { reel: 'DM7gS9qq_h3', src: '/videos/student-2.mp4', poster: '/videos/student-2.jpg' },
  { reel: 'DMcWuWLKcme', src: '/videos/student-3.mp4', poster: '/videos/student-3.jpg' },
]

function StudentVideo({ video, index }) {
  const ref = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(!video.src)
  const title = `Student testimonial ${index + 1}`

  if (failed) {
    return (
      <div className="testimonial-video testimonial-video--embed">
        <iframe
          src={`https://www.instagram.com/reel/${video.reel}/embed`}
          title={title}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <div className="testimonial-video">
      <video
        ref={ref}
        src={video.src}
        poster={video.poster}
        preload="metadata"
        playsInline
        controls={playing}
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onPlay={() => setPlaying(true)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
        aria-label={title}
      />
      {!playing ? (
        <button
          type="button"
          className="testimonial-play"
          aria-label={`Play ${title.toLowerCase()}`}
          onClick={() => ref.current?.play()}
        >
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18a1 1 0 0 0 0-1.69L9.54 5.98A.99.99 0 0 0 8 6.82z" />
          </svg>
        </button>
      ) : null}
    </div>
  )
}

// [feature, Pranav One, YouTube, Other Platforms]
const COMPARE_ROWS = [
  ['Affordable', true, true, false],
  ['Live doubt solving', true, false, false],
  ['1:1 mentorship', true, false, false],
  ['Practical Tally projects', true, false, false],
  ['Certification', true, false, true],
  ['Lifetime access', true, true, false],
  ['100% placement opportunities', true, false, false],
]

function CompareMark({ yes }) {
  return (
    <span
      className={`compare-mark ${yes ? 'compare-mark--yes' : 'compare-mark--no'}`}
      role="img"
      aria-label={yes ? 'Yes' : 'No'}
    >
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        {yes ? (
          <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
        ) : (
          <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        )}
      </svg>
    </span>
  )
}

function CheckIcon({ className = 'review-check' }) {
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
      </svg>
    </span>
  )
}

/** Yellow Join now → Biz green Available Now for active subscribers only. */
function JoinCtaButton({
  subscriptionActive,
  onClick,
  className = '',
  withArrow = true,
}) {
  const label = subscriptionActive
    ? 'Available Now'
    : withArrow
      ? 'Join now >'
      : 'Join now'
  const classes = [className, subscriptionActive ? 'is-subscribed-cta' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classes} type="button" onClick={onClick}>
      {label}
    </button>
  )
}

function WhatsAppIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M16.004 2.667c-7.36 0-13.333 5.973-13.333 13.333 0 2.347.64 4.64 1.84 6.64L2.67 29.333l6.88-1.787a13.27 13.27 0 0 0 6.453 1.654c7.36 0 13.333-5.973 13.333-13.333S23.364 2.667 16.004 2.667zm0 24.373a11.05 11.05 0 0 1-5.627-1.547l-.4-.24-4.08 1.067 1.093-3.973-.267-.427a11.04 11.04 0 0 1-1.707-5.92c0-6.107 4.973-11.08 11.08-11.08 6.107 0 11.08 4.973 11.08 11.08-.093 6.107-4.973 11.04-11.172 11.04zm6.08-8.293c-.333-.173-1.973-.973-2.28-1.093-.307-.107-.533-.16-.76.173-.227.333-.88 1.093-1.08 1.32-.2.227-.4.253-.733.08-.333-.173-1.413-.52-2.693-1.667-1-.893-1.667-1.987-1.867-2.32-.2-.333-.021-.513.147-.68.147-.147.333-.387.493-.58.16-.2.213-.333.333-.56.107-.227.053-.427-.027-.6-.08-.173-.76-1.827-1.04-2.507-.267-.64-.547-.56-.76-.56h-.653c-.227 0-.6.08-.92.4-.307.333-1.2 1.173-1.2 2.867s1.227 3.32 1.4 3.547c.173.227 2.4 3.667 5.813 5.147 2.16.933 3.013.8 3.56.747.547-.053 1.973-.8 2.253-1.573.28-.773.28-1.44.2-1.573-.08-.147-.307-.227-.64-.4z"
      />
    </svg>
  )
}

function WhatsAppFloat() {
  const [open, setOpen] = useState(false)
  const phone = WHATSAPP_SUPPORT_PHONE
  const message =
    'Hi Pranav One, I would like to know more about the course.'
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`

  return (
    <div className={`wa-float ${open ? 'is-open' : ''}`}>
      {open ? (
        <div className="wa-float-panel" role="dialog" aria-label="WhatsApp support">
          <div className="wa-float-panel-head">
            <span className="wa-float-avatar" aria-hidden="true">
              <WhatsAppIcon />
            </span>
            <div>
              <strong>Pranav One Support</strong>
              <p>Typically replies within minutes</p>
            </div>
            <button
              type="button"
              className="wa-float-close"
              aria-label="Close WhatsApp chat"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="wa-float-bubble">
            <p>Welcome to Pranav One.</p>
            <p>How can I help you?</p>
          </div>
          <a
            className="wa-float-cta"
            href={href}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
          >
            <WhatsAppIcon />
            Chat on WhatsApp
          </a>
        </div>
      ) : null}

      <button
        type="button"
        className="wa-float-btn"
        aria-label={open ? 'Close WhatsApp support' : 'Open WhatsApp support'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <span className="wa-float-x">×</span> : <WhatsAppIcon />}
      </button>
    </div>
  )
}

function ChannelQrFloat() {
  const [open, setOpen] = useState(false)
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(WHATSAPP_CHANNEL_URL)}`

  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="qr-float">
      <button
        type="button"
        className="qr-float-btn"
        aria-label="Open WhatsApp channel QR code"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm12-2h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 2h2v2h-2v-2zm4 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v2h-2v-2zm-6 0h2v2h-2v-2z"
          />
        </svg>
      </button>

      {open ? (
        <div
          className="qr-channel-screen"
          role="dialog"
          aria-modal="true"
          aria-label="Pranav One WhatsApp channel QR"
        >
          <button
            type="button"
            className="qr-channel-close"
            aria-label="Close QR screen"
            onClick={() => setOpen(false)}
          >
            ×
          </button>

          <div className="qr-channel-card">
            <div className="qr-channel-logo-tab">
              <img src="/images/pranavone-logo-green.png" alt="Pranav One" />
            </div>
            <h2>Pranav One Tally + Computer Course</h2>
            <p className="qr-channel-sub">WhatsApp channel</p>
            <div className="qr-channel-code-wrap">
              <img
                className="qr-channel-code"
                src={qrSrc}
                alt="QR code for Pranav One WhatsApp channel"
                width={280}
                height={280}
              />
              <span className="qr-channel-wa-badge" aria-hidden="true">
                <WhatsAppIcon />
              </span>
            </div>
            <a
              className="qr-channel-open"
              href={WHATSAPP_CHANNEL_URL}
              target="_blank"
              rel="noreferrer"
            >
              Open channel
            </a>
          </div>

          <p className="qr-channel-hint">
            Scan this QR code using the camera to view or follow this channel.
          </p>
        </div>
      ) : null}
    </div>
  )
}

const FAQ_ITEMS = [
  {
    q: 'What is Tally?',
    a: 'Tally (TallyPrime) is India’s most widely used accounting software. Businesses use it for bookkeeping, billing, inventory, GST, payroll and financial reports, which is why Tally skills are in demand across offices, shops and CA firms.',
  },
  {
    q: 'What will I learn in the Tally + Computer Course?',
    a: 'You will learn computer fundamentals, MS Word, MS Excel, PowerPoint, internet and email, followed by TallyPrime: company creation, ledgers, vouchers, inventory, GST billing, payroll, bank reconciliation and financial reports.',
  },
  {
    q: 'Do I need any prior computer knowledge?',
    a: 'No. The course starts from the basics of using a computer, so complete beginners can join. Each topic is taught step by step with practical exercises.',
  },
  {
    q: 'Who can join this course?',
    a: 'Students (10th, 12th, graduates), job seekers, working professionals and small business owners who want to manage accounts or build a career in accounting and office work.',
  },
  {
    q: 'What does 100% Placement Opportunities mean?',
    a: 'Every student who completes the course gets placement support: resume preparation, interview practice and opportunities to interview with our hiring partners for roles such as Accountant, Tally Operator, Data Entry Operator and Office Assistant.',
  },
  {
    q: 'Will I get a certificate?',
    a: 'Yes. You will receive a course completion certificate after successfully finishing the course and its assessments.',
  },
  {
    q: 'Is the training practical?',
    a: 'Yes. The course focuses on hands-on practice with real business examples — creating invoices, recording transactions, filing GST data and preparing reports exactly as done in an office.',
  },
  {
    q: 'Is GST covered in the course?',
    a: 'Yes. You will learn GST setup in TallyPrime, GST invoicing, tax ledgers and generating GST reports used for return filing.',
  },
  {
    q: 'What jobs can I get after the course?',
    a: 'Common roles include Accountant, Junior Accountant, Tally Operator, Billing Executive, Data Entry Operator, Accounts Assistant and Back Office Executive in companies, shops and CA firms.',
  },
  {
    q: 'How do I join?',
    a: 'Click “Join Now”, sign up with your name, Gmail and mobile number, and attend the live session. Our team will contact you with course details and the next batch schedule.',
  },
]


function FieldIcon({ filled, children }) {
  if (filled) {
    return <CheckIcon className="pill-check" />
  }

  return (
    <span className="pill-icon" aria-hidden="true">
      {children}
    </span>
  )
}

export default function App() {
  const navigate = useNavigate()
  const { user, signingIn, signInWithDetails, signOut, refreshProfile } =
    useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const eventsRowRef = useRef(null)

  function scrollEvents(direction) {
    const row = eventsRowRef.current
    if (!row) return
    const card = row.querySelector('.event-card')
    const step = card ? card.offsetWidth + 24 : row.clientWidth
    row.scrollBy({ left: direction * step, behavior: 'smooth' })
  }
  const [consent, setConsent] = useState(true)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(null)
  const [subscriptionActive, setSubscriptionActive] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [joinStep, setJoinStep] = useState('details')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showAllFaqs, setShowAllFaqs] = useState(false)
  const siteHeaderRef = useRef(null)
  const [profileMenuTop, setProfileMenuTop] = useState(118)

  async function refreshSubscription() {
    try {
      const token = await getAccessToken()
      if (!token) {
        setSubscriptionActive(false)
        return false
      }

      const [subRes, profileRes] = await Promise.all([
        fetch(apiUrl('/api/auth/subscription'), {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        }),
        fetch(apiUrl('/api/profile/me'), {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        }),
      ])

      if (!subRes.ok) {
        setSubscriptionActive(false)
        return false
      }

      const subData = await subRes.json()
      const subscription = subData.subscription || null
      const paid =
        subscription?.status === 'active' && subscription?.plan === 'lifetime'

      if (!paid) {
        setSubscriptionActive(false)
        return false
      }

      let profile = null
      if (profileRes.ok) {
        const data = await profileRes.json()
        profile = data.profile || null
      }

      const paidName = profile?.name || name || user?.name || ''
      const paidEmail = profile?.email || email || user?.email || ''
      const paidPhone = profile?.phone || phone || user?.phone || ''

      setSubscriptionActive(true)
      setSubmitted({
        name: paidName,
        email: paidEmail,
        phone: paidPhone,
        subscriptionType: subscription?.plan || 'lifetime',
      })
      if (paidName) setName(paidName)
      if (paidEmail) setEmail(paidEmail)
      if (paidPhone) setPhone(String(paidPhone).replace(/\D/g, '').slice(-10))
      return true
    } catch {
      return false
    }
  }

  function openPaidLinksPopup() {
    setJoinStep('success')
    setStatus('success')
    setMessage(
      'Subscription: Active. Use the link below to join the live session.',
    )
    setShowJoinForm(true)
  }

  function finishAuthAndHidePopup({ paid, activeUser, digits }) {
    const lockedEmail = (activeUser?.email || email).trim()
    const lockedName = (activeUser?.name || name).trim()
    if (lockedEmail) setEmail(lockedEmail)
    if (lockedName) setName(lockedName)
    if (activeUser?.phone) {
      setPhone(String(activeUser.phone).replace(/\D/g, '').slice(-10))
    }

    if (paid) {
      setSubscriptionActive(true)
      setSubmitted({
        name: lockedName || name || '',
        email: lockedEmail,
        phone: digits || activeUser?.phone || phone || '',
        subscriptionType: 'lifetime',
      })
    }

    // Auth done → return to main screen (hide Sign In / Sign Up popup)
    setShowJoinForm(false)
    setJoinStep('details')
    setStatus('idle')
    setMessage('')
    void refreshProfile()
    void refreshSubscription()
  }

  useEffect(() => {
    if (!user) {
      setSubscriptionActive(false)
      setSubmitted(null)
      return undefined
    }

    let cancelled = false

    const syncPaidState = async () => {
      if (cancelled) return
      // Use subscription already on the user when present; otherwise one quick check
      const existing = user?.subscription
      if (
        existing?.status === 'active' &&
        existing?.plan === 'lifetime'
      ) {
        setSubscriptionActive(true)
        return
      }
      await refreshSubscription()
    }

    void syncPaidState()
    return () => {
      cancelled = true
    }
  }, [user?.uid])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('bv_reopen_join_form')
      if (!raw) return
      sessionStorage.removeItem('bv_reopen_join_form')
      if (raw !== '1') {
        const draft = JSON.parse(raw)
        if (typeof draft.name === 'string') setName(draft.name)
        if (typeof draft.email === 'string') setEmail(draft.email)
        if (typeof draft.phone === 'string') setPhone(draft.phone)
        if (typeof draft.location === 'string') setLocation(draft.location)
        if (typeof draft.consent === 'boolean') setConsent(draft.consent)
        if (typeof draft.joinStep === 'string') setJoinStep(draft.joinStep)
      }
      setStatus('idle')
      setSubmitted(null)
      setShowJoinForm(true)
    } catch {
      sessionStorage.removeItem('bv_reopen_join_form')
      setShowJoinForm(true)
    }
  }, [])

  // After Sign In / success popup is shown, auto-hide and return to main screen
  useEffect(() => {
    if (!showJoinForm || joinStep !== 'success') return undefined
    const timer = window.setTimeout(() => {
      setShowJoinForm(false)
      setJoinStep('details')
      setStatus('idle')
      setMessage('')
    }, 4000)
    return () => window.clearTimeout(timer)
  }, [showJoinForm, joinStep])

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email)
    }
    if (user?.name) {
      setName(user.name)
    }
  }, [user])

  useEffect(() => {
    if (!showJoinForm) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [showJoinForm])

  useEffect(() => {
    if (!showProfileMenu) return undefined

    function handlePointerDown(event) {
      if (!event.target.closest('.nav-profile-wrap')) {
        setShowProfileMenu(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setShowProfileMenu(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showProfileMenu])

  useEffect(() => {
    if (!user) setShowProfileMenu(false)
  }, [user])

  useEffect(() => {
    if (!showProfileMenu) return undefined

    function placeProfileMenu() {
      const header = siteHeaderRef.current
      if (!header) return
      const bottom = header.getBoundingClientRect().bottom
      setProfileMenuTop(Math.ceil(bottom + 10))
    }

    placeProfileMenu()
    window.addEventListener('resize', placeProfileMenu)
    window.addEventListener('scroll', placeProfileMenu, { passive: true })
    return () => {
      window.removeEventListener('resize', placeProfileMenu)
      window.removeEventListener('scroll', placeProfileMenu)
    }
  }, [showProfileMenu])

  async function openJoinForm(event) {
    if (event) event.preventDefault()
    setShowProfileMenu(false)
    setMessage('')

    if (user) {
      const paid = subscriptionActive || (await refreshSubscription())
      if (paid) setSubscriptionActive(true)
      return
    }

    setJoinStep('details')
    setStatus('idle')
    setSubmitted(null)
    setShowJoinForm(true)
  }

  async function openSignInForm(event) {
    if (event) event.preventDefault()
    setShowProfileMenu(false)
    setMessage('')

    if (user) {
      const paid = subscriptionActive || (await refreshSubscription())
      if (paid) setSubscriptionActive(true)
      return
    }

    // Always open Sign Up first; user can switch via “Sign In” link
    setJoinStep('details')
    setStatus('idle')
    setSubmitted(null)
    setShowJoinForm(true)
  }

  function openTermsFromForm(event) {
    event.preventDefault()
    try {
      sessionStorage.setItem(
        'bv_reopen_join_form',
        JSON.stringify({
          name,
          email,
          phone,
          location,
          consent,
          joinStep,
        }),
      )
    } catch {
      sessionStorage.setItem('bv_reopen_join_form', '1')
    }
    navigate('/terms')
  }

  function closeJoinForm() {
    setShowJoinForm(false)
    setJoinStep(subscriptionActive ? 'success' : 'details')
    setStatus(subscriptionActive ? 'success' : 'idle')
    setMessage('')
  }

  async function handleDetailsNext(event) {
    event.preventDefault()
    if (subscriptionActive) {
      openPaidLinksPopup()
      return
    }
    setStatus('loading')
    setMessage('')

    if (!name.trim()) {
      setStatus('error')
      setMessage('Please enter your name.')
      return
    }

    const digits = phone.replace(/\D/g, '')
    if (digits.length !== 10) {
      setStatus('error')
      setMessage('Please enter a valid 10-digit mobile number.')
      return
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus('error')
      setMessage('Please enter a valid Gmail account.')
      return
    }

    if (!location.trim()) {
      setStatus('error')
      setMessage('Please enter your location.')
      return
    }

    if (!consent) {
      setStatus('error')
      setMessage('Please accept the contact authorisation to continue.')
      return
    }

    try {
      let activeUser = user
      if (!activeUser) {
        setMessage('Submitting…')
        activeUser = await signInWithDetails({
          name: name.trim(),
          email: email.trim(),
          phone: digits,
          location: location.trim(),
        })
      }

      const paid =
        activeUser.subscription?.status === 'active' &&
        activeUser.subscription?.plan === 'lifetime'

      finishAuthAndHidePopup({ paid, activeUser, digits })
    } catch (err) {
      setStatus('error')
      setMessage(
        err.message || 'Could not continue. Please try again.',
      )
    }
  }

  function formatPhone(value) {
    if (!value) return '—'
    const digits = value.replace(/\D/g, '')
    if (digits.length === 10) {
      return `+91 ${digits.slice(0, 5)}-${digits.slice(5)}`
    }
    return `+91 ${value}`
  }

  return (
    <div className="page">
      <div className="site-header" ref={siteHeaderRef}>
        <div className="top-bar">
          <div className="top-bar-marquee">
            <div className="top-bar-track">
              {[0, 1].map((copy) => (
                <p
                  key={copy}
                  className="top-bar-text"
                  aria-hidden={copy === 1 ? true : undefined}
                >
                  <strong>Tally Course · 100% Placement</strong>
                  <span className="top-bar-sep" aria-hidden="true">
                    |
                  </span>
                  <span className="top-bar-badge">Hurry up!</span>
                  New batch starting from{' '}
                  <strong>19 October</strong>
                  <span className="top-bar-sep" aria-hidden="true">
                    |
                  </span>
                  <button
                    className="top-bar-link"
                    type="button"
                    tabIndex={copy === 1 ? -1 : undefined}
                    onClick={openJoinForm}
                  >
                    {subscriptionActive ? 'Available Now' : 'Join now'}
                  </button>
                </p>
              ))}
            </div>
          </div>
        </div>

        <header className="nav">
          <a className="nav-brand" href="#top">
            <img
              className="brand-logo brand-logo--nav"
              src="/images/pranavone-logo-green.png"
              alt="Pranav One"
            />
          </a>

          <div className="nav-actions">
            {!user ? (
              <button
                className="nav-signin"
                type="button"
                onClick={openSignInForm}
                disabled={signingIn}
              >
                {signingIn ? 'Please wait…' : 'Get Started'}
                <svg
                  className="nav-signin-chevron"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            ) : null}

            <div className="nav-profile-wrap">
              <button
                className="nav-link nav-profile"
                type="button"
                onClick={() => {
                  if (!user) {
                    void openSignInForm()
                    return
                  }
                  setShowProfileMenu((open) => !open)
                }}
                aria-label={user ? 'Open profile menu' : 'Profile'}
                aria-expanded={user ? showProfileMenu : undefined}
                aria-haspopup={user ? 'menu' : undefined}
                title={user ? user.name || user.email : 'Sign in with your details'}
              >
                {user?.picture ? (
                  <img
                    className="nav-user-avatar"
                    src={user.picture}
                    alt=""
                  />
                ) : (
                  <span className="nav-profile-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </span>
                )}
              </button>

              {user && showProfileMenu ? (
                <div
                  className="profile-menu"
                  role="menu"
                  aria-label="Profile menu"
                  style={{ '--profile-menu-top': `${profileMenuTop}px` }}
                >
                  <button
                    type="button"
                    className="profile-menu-close"
                    aria-label="Close profile menu"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    ×
                  </button>
                  <div className="profile-menu-header">
                    {user.picture ? (
                      <img
                        className="profile-menu-avatar"
                        src={user.picture}
                        alt=""
                      />
                    ) : (
                      <span className="profile-menu-avatar profile-menu-avatar-fallback">
                        {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="profile-menu-meta">
                      <strong className="profile-menu-name">
                        {user.name || 'User'}
                      </strong>
                      <span className="profile-menu-email">
                        {user.email || '—'}
                      </span>
                      {subscriptionActive ? (
                        <span className="profile-subscription-active">
                          Subscription: Active
                        </span>
                      ) : (
                        <span className="profile-subscription-inactive">
                          No active subscription
                        </span>
                      )}
                    </div>
                  </div>

                  {subscriptionActive ? (
                    <a
                      className="profile-menu-item profile-menu-link"
                      href={WHATSAPP_CHANNEL_URL}
                      target="_blank"
                      rel="noreferrer"
                      role="menuitem"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      WhatsApp channel
                    </a>
                  ) : (
                    <button
                      className="profile-menu-item"
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowProfileMenu(false)
                        void openJoinForm()
                      }}
                    >
                      View Profile
                    </button>
                  )}
                  <button
                    className="profile-menu-item"
                    type="button"
                    role="menuitem"
                    onClick={async () => {
                      setShowProfileMenu(false)
                      await signOut()
                    }}
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
      </div>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <h1 id="hero-title">
              <span className="hero-title-line">Learn Tally + Computer.</span>{' '}
              <span className="hero-title-line">Get Placed.</span>
            </h1>

            <p className="hero-support">
              Master TallyPrime, GST and essential computer skills with 100%
              placement opportunities.
            </p>

            <div className="hero-points-wrap">
              <svg
                className="hero-sketch-arrow hero-sketch-arrow-left"
                viewBox="0 0 200 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                overflow="visible"
              >
                <path
                  d="M14 34 C 10 64, 32 90, 64 80 C 98 68, 94 36, 68 40 C 46 44, 52 78, 92 88 C 124 96, 150 88, 168 74"
                  stroke="#1f2937"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M158 58 L186 74 L156 90"
                  stroke="#1f2937"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <div className="hero-points-grid">
                <article className="hero-point-card">
                  <span className="hero-point-check" aria-hidden="true" />
                  <div>
                    <strong>TallyPrime + GST</strong>
                    <p>Accounting, billing and GST in Tally.</p>
                  </div>
                </article>
                <article className="hero-point-card">
                  <span className="hero-point-check" aria-hidden="true" />
                  <div>
                    <strong>Computer Skills</strong>
                    <p>MS Word, Excel, PowerPoint &amp; internet.</p>
                  </div>
                </article>
                <article className="hero-point-card">
                  <span className="hero-point-check" aria-hidden="true" />
                  <div>
                    <strong>Practical Training</strong>
                    <p>Hands-on work with real business examples.</p>
                  </div>
                </article>
                <article className="hero-point-card">
                  <span className="hero-point-check" aria-hidden="true" />
                  <div>
                    <strong>100% Placement Opportunities</strong>
                    <p>Resume, interview prep and job referrals.</p>
                  </div>
                </article>
              </div>
            </div>

            <JoinCtaButton
              className="hero-cta"
              subscriptionActive={subscriptionActive}
              onClick={openJoinForm}
            />

            <ul className="hero-stats" aria-label="Course highlights">
              <li className="hero-stat">
                <span className="hero-stat-icon" aria-hidden="true">
                  <Calculator weight="fill" />
                </span>
                <span className="hero-stat-text">
                  <strong>TallyPrime &amp; GST</strong>
                  <small>Professional Accounting</small>
                </span>
              </li>
              <li className="hero-stat">
                <span className="hero-stat-icon" aria-hidden="true">
                  <Desktop weight="fill" />
                </span>
                <span className="hero-stat-text">
                  <strong>Computer Fundamentals</strong>
                  <small>MS Office &amp; Internet</small>
                </span>
              </li>
              <li className="hero-stat">
                <span className="hero-stat-icon" aria-hidden="true">
                  <Briefcase weight="fill" />
                </span>
                <span className="hero-stat-text">
                  <strong>100% Placement</strong>
                  <small>Job Assistance</small>
                </span>
              </li>
            </ul>
          </div>
        </section>

        <section
          className="section compare-section"
          id="compare"
          aria-labelledby="compare-title"
        >
          <p className="compare-eyebrow">Why Pranav One</p>
          <h2 id="compare-title">Compare &amp; Choose the Right Course</h2>

          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th scope="col">Features</th>
                  <th scope="col" className="compare-brand-col">
                    <img src="/images/pranavone-logo-green.png" alt="Pranav One" />
                  </th>
                  <th scope="col">YouTube</th>
                  <th scope="col">Other Platforms</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map(([feature, ...cells]) => (
                  <tr key={feature}>
                    <th scope="row">{feature}</th>
                    {cells.map((yes, i) => (
                      <td
                        key={i}
                        className={i === 0 ? 'compare-brand-col' : undefined}
                      >
                        <CompareMark yes={yes} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="compare-actions">
            <JoinCtaButton
              className="hero-cta"
              subscriptionActive={subscriptionActive}
              onClick={openJoinForm}
            />
          </div>
        </section>

        <section
          className="section testimonials-section"
          id="testimonials"
          aria-labelledby="testimonials-title"
        >
          <div className="testimonials-banner">
            <header className="testimonials-header">
              <p className="testimonials-eyebrow">Student Stories</p>
              <h2 id="testimonials-title">What Our Students Say</h2>
              <p className="testimonials-sub">
                Real learners sharing how the Tally + Computer Course helped them
                build skills and get placed.
              </p>
            </header>

            <div className="testimonials-grid">
              {STUDENT_VIDEOS.map((video, i) => (
                <figure className="testimonial-card" key={video.reel}>
                  <StudentVideo video={video} index={i} />
                </figure>
              ))}
            </div>

            <div className="testimonials-actions">
              <JoinCtaButton
                className="spot-cta"
                subscriptionActive={subscriptionActive}
                onClick={openJoinForm}
              />
            </div>
          </div>
        </section>

        <section
          className="section events-section"
          id="past-events"
          aria-labelledby="events-title"
        >
          <h2 id="events-title" className="events-title">Past Events</h2>

          <div className="events-slider">
            <button
              type="button"
              className="events-nav-btn events-nav-btn--prev"
              aria-label="Previous events"
              onClick={() => scrollEvents(-1)}
            >
              <CaretLeft weight="bold" />
            </button>
            <button
              type="button"
              className="events-nav-btn events-nav-btn--next"
              aria-label="Next events"
              onClick={() => scrollEvents(1)}
            >
              <CaretRight weight="bold" />
            </button>

          <div className="events-grid" ref={eventsRowRef}>
            {PAST_EVENTS.map((event) => (
              <article className="event-card" key={event.lead}>
                <div className="event-banner">
                  <p className="event-banner-title">
                    Masterclass: <span>{event.lead} {event.rest}</span>
                  </p>
                  <img
                    className="event-banner-photo"
                    src={EVENT_SPEAKER.photo}
                    alt=""
                    loading="lazy"
                  />
                </div>

                <div className="event-body">
                  <h3>
                    Masterclass: {event.lead} {event.rest}
                  </h3>
                  <p className="event-speaker-role">{EVENT_SPEAKER.role}</p>

                  <button
                    type="button"
                    className="event-watch"
                    onClick={openJoinForm}
                  >
                    Watch Now
                  </button>
                </div>
              </article>
            ))}
            </div>
          </div>
        </section>

        <section className="section treds-section" id="treds" aria-labelledby="treds-title">
          <div className="treds-banner">
            <header className="treds-header">
              <h2 id="treds-title">From Learner to Job-Ready via Pranav One</h2>
              <p className="treds-subtitle">
                From basic computer skills to a placed professional.
              </p>
            </header>

            <div className="treds-flow">
              <article className="treds-card treds-card--input" aria-label="Input: Learn">
                <span className="treds-badge treds-badge--input">INPUT</span>
                <div className="treds-card-title">
                  <h3>Learn</h3>
                </div>
                <ul className="treds-list">
                  <li>Computer Basics &amp; MS Office</li>
                  <li>TallyPrime Accounting</li>
                  <li>GST, Inventory &amp; Payroll</li>
                  <li>Live Practical Projects</li>
                </ul>
              </article>

              <div className="treds-hub" aria-hidden="true">
                <div className="treds-hub-line treds-hub-line--left">
                  <span className="treds-hub-dash" />
                  <svg className="treds-hub-arrow" viewBox="0 0 24 24" focusable="false">
                    <path d="M5.5 4.2 Q10.2 12 5.5 19.8 L19.2 12 Z" />
                  </svg>
                </div>
                <div className="treds-hub-core">
                  <p className="treds-hub-label">Pranav One</p>
                  <span className="treds-hub-circle">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path
                        d="M4 19h16M6 19V9l6-4 6 4v10"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <path d="M10 19v-5h4v5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <p className="treds-hub-strong">Practical • Certified • Job-Ready</p>
                  <p className="treds-hub-meta">Training | Certificate | Placement</p>
                </div>
                <div className="treds-hub-line treds-hub-line--right">
                  <span className="treds-hub-dash" />
                  <svg className="treds-hub-arrow" viewBox="0 0 24 24" focusable="false">
                    <path d="M5.5 4.2 Q10.2 12 5.5 19.8 L19.2 12 Z" />
                  </svg>
                </div>
              </div>

              <article className="treds-card treds-card--output" aria-label="Output: Placement">
                <span className="treds-badge treds-badge--output">OUTPUT</span>
                <div className="treds-card-title">
                  <h3>Placement</h3>
                </div>
                <ul className="treds-list treds-list--output">
                  <li>Course Certificate</li>
                  <li>Resume &amp; Interview Prep</li>
                  <li>Interviews With Hiring Partners</li>
                  <li>100% Placement Opportunities</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="section treds-summary-section" aria-labelledby="webinar-objectives-title">
          <h2 id="webinar-objectives-title" className="treds-summary-title">
            Course Objectives
          </h2>
          <blockquote className="treds-quote">
            <span className="treds-quote-mark treds-quote-mark--open" aria-hidden="true">
              “
            </span>
            <p className="treds-lead">
              <span className="treds-lead-line">
                Master computer basics &amp; MS Office,
              </span>
              <span className="treds-lead-line">
                learn TallyPrime accounting with GST,
              </span>
              <span className="treds-lead-line">
                practise on real business examples, earn a certificate
              </span>
              <span className="treds-lead-line">
                and get 100% placement opportunities for a job-ready career.
              </span>
            </p>
            <p className="treds-lead treds-lead--mobile">
              Master computer basics &amp; MS Office, learn TallyPrime
              accounting with GST, practise on real business examples, earn a
              certificate and get 100% placement opportunities for a job-ready
              career.
            </p>
            <span className="treds-quote-mark treds-quote-mark--close" aria-hidden="true">
              ”
            </span>
          </blockquote>

          <JoinCtaButton
            className="hero-cta treds-summary-cta"
            subscriptionActive={subscriptionActive}
            onClick={openJoinForm}
          />
        </section>

        <section className="section faq-section" id="faq" aria-labelledby="faq-title">
          <h2 id="faq-title" className="faq-title">
            <span className="faq-title-main">FAQs — Tally</span>
            <span className="faq-title-sep">, </span>
            <span className="faq-title-sub">
              Computer Course &amp; Placement
            </span>
          </h2>

          <div className="faq-list">
            {(showAllFaqs ? FAQ_ITEMS : FAQ_ITEMS.slice(0, 5)).map((item) => (
              <article className="faq-item" key={item.q}>
                <h3 className="faq-question">{item.q}</h3>
                <p className="faq-answer">{item.a}</p>
              </article>
            ))}
          </div>

          <button
            className="faq-more"
            type="button"
            onClick={() => setShowAllFaqs((open) => !open)}
          >
            {showAllFaqs ? 'Show less' : 'more...'}
          </button>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand-block">
              <a className="footer-brand" href="#top">
                <img
                  className="brand-logo brand-logo--footer"
                  src="/images/pranavone-logo-green.png"
                  alt="Pranav One"
                />
              </a>
              <p className="footer-tagline">
                Tally + Computer Course with 100% placement opportunities.
              </p>
            </div>
          </div>

          <div className="footer-bottom">
            <nav className="footer-links" aria-label="Policies">
              <Link to="/refund-policy">Refund Policy</Link>
              <Link to="/refund-policy#job-assistance">100% Job Assistance</Link>
              <Link to="/terms">Terms &amp; Conditions</Link>
            </nav>
            <p className="footer-copy">
              © {new Date().getFullYear()} Pranav One. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {showJoinForm && (
        <div
          className="popup-overlay join-form-overlay"
          role="presentation"
          onClick={closeJoinForm}
        >
          <div
            className="join-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="join-form-close"
              aria-label="Close form"
              onClick={closeJoinForm}
            >
              ×
            </button>

            <div className="join-card">
              {joinStep === 'success' && submitted ? (
                <div className="review-panel" role="status">
                  <h2 id="join-form-title">You’re in</h2>
                  {subscriptionActive ? (
                    <p className="subscription-active-banner">
                      Subscription: Active
                    </p>
                  ) : null}
                  <p className="join-sub">
                    {message || 'Now you are in for the Tally + Computer Course session.'}
                  </p>

                  <p className="join-sub">
                    Your seat is confirmed. Our team will contact you on
                    WhatsApp with the batch details.
                  </p>

                  <a
                    className="btn-trial btn-whatsapp-channel"
                    href={WHATSAPP_CHANNEL_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <WhatsAppIcon />
                    Join WhatsApp channel
                  </a>
                </div>
              ) : (
                <>
                  <h2 id="join-form-title">
                    Get Started
                  </h2>
                  <p className="join-sub">
                    Enter your name, mobile number, Gmail and location.
                  </p>

                  <form
                    className="join-form"
                    onSubmit={handleDetailsNext}
                    noValidate
                    autoComplete="on"
                  >
                    <label className="pill-field">
                      <span className="sr-only">Name</span>
                      <input
                        type="text"
                        name="name"
                        autoComplete="name"
                        placeholder="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                      <FieldIcon filled={name.trim().length > 0}>
                        <svg viewBox="0 0 24 24" focusable="false">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </FieldIcon>
                    </label>

                    <label className="pill-field pill-phone">
                      <span className="phone-label">Mobile</span>
                      <span className="phone-prefix" aria-hidden="true">
                        <span className="flag" />
                        +91
                      </span>
                      <input
                        type="tel"
                        name="phone"
                        autoComplete="tel"
                        inputMode="numeric"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        placeholder="Mobile number"
                        value={phone}
                        onChange={(e) => {
                          const digits = e.target.value
                            .replace(/\D/g, '')
                            .slice(0, 10)
                          setPhone(digits)
                        }}
                        required
                      />
                      <FieldIcon filled={phone.trim().length > 0}>
                        <svg viewBox="0 0 24 24" focusable="false">
                          <path d="M6.62 10.79a15.15 15.15 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.4 21 3 13.6 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" />
                        </svg>
                      </FieldIcon>
                    </label>

                    <label className="pill-field">
                      <span className="sr-only">Gmail account</span>
                      <input
                        type="email"
                        name="email"
                        autoComplete="email"
                        placeholder="Gmail account"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <FieldIcon filled={email.trim().length > 0}>
                        <svg viewBox="0 0 24 24" focusable="false">
                          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
                        </svg>
                      </FieldIcon>
                    </label>

                    <label className="pill-field">
                      <span className="sr-only">Location</span>
                      <input
                        type="text"
                        name="location"
                        autoComplete="address-level2"
                        placeholder="Location"
                        maxLength={120}
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        required
                      />
                      <FieldIcon filled={location.trim().length > 0}>
                        <svg viewBox="0 0 24 24" focusable="false">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                        </svg>
                      </FieldIcon>
                    </label>

                    {status === 'error' && message ? (
                      <p className="form-error" role="alert">
                        {message}
                      </p>
                    ) : null}

                    <button
                      className="btn-trial"
                      type="submit"
                      disabled={status === 'loading' || signingIn}
                    >
                      {status === 'loading' || signingIn
                        ? 'Please wait…'
                        : 'Submit'}
                    </button>

                    <label className="consent consent--compact">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      <span>
                        I authorise Pranav One to contact me via
                        Email/SMS/WhatsApp/Call (even if on DND/NDNC).
                      </span>
                    </label>

                    <div className="form-links-row form-links-row--bottom">
                      <a
                        className="form-terms-link"
                        href="/terms"
                        onClick={openTermsFromForm}
                      >
                        Terms &amp; Conditions
                      </a>
                    </div>
                  </form>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {subscriptionActive ? <ChannelQrFloat /> : null}
      <WhatsAppFloat />
    </div>
  )
}
