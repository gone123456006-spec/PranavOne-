import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiUrl } from '../lib/api.js'
import AdmissionCongratulations from './AdmissionReceipt.jsx'

const COURSE_MODES = [
  { id: 'online', label: 'Online' },
  { id: 'offline', label: 'Offline' },
]

function CheckIcon({ className = 'pill-check' }) {
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
      </svg>
    </span>
  )
}

function FieldIcon({ filled, children }) {
  if (filled) return <CheckIcon className="pill-check" />
  return (
    <span className="pill-icon" aria-hidden="true">
      {children}
    </span>
  )
}

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay)
      return
    }
    const existing = document.querySelector('script[data-razorpay="1"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Razorpay), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay.')), {
        once: true,
      })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.dataset.razorpay = '1'
    script.onload = () => resolve(window.Razorpay)
    script.onerror = () => reject(new Error('Failed to load Razorpay.'))
    document.body.appendChild(script)
  })
}

export default function AdmissionForm({ onClose, variant = 'modal' }) {
  const isPage = variant === 'page'
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [courseMode, setCourseMode] = useState('online')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [paid, setPaid] = useState(null)
  const [pricing, setPricing] = useState({
    amountLabel: '₹8,000',
    originalAmountLabel: '₹12,000',
    amountRupees: 8000,
    originalAmountRupees: 12000,
  })

  useEffect(() => {
    let active = true
    fetch(apiUrl('/api/admissions/pricing'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) {
          setPricing((prev) => ({
            ...prev,
            amountLabel: data.amountLabel || prev.amountLabel,
            originalAmountLabel: data.originalAmountLabel || prev.originalAmountLabel,
            amountRupees: data.amountRupees || prev.amountRupees,
            originalAmountRupees: data.originalAmountRupees || prev.originalAmountRupees,
          }))
        }
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!onClose) return undefined
    function onKey(event) {
      if (event.key === 'Escape' && status !== 'loading') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, status])

  async function handlePayNow(event) {
    event.preventDefault()
    setMessage('')

    if (!name.trim() || name.trim().length < 2) {
      setStatus('error')
      setMessage('Please enter your full name.')
      return
    }
    if (phone.length !== 10) {
      setStatus('error')
      setMessage('Please enter a valid 10-digit mobile number.')
      return
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus('error')
      setMessage('Please enter a valid Gmail / email address.')
      return
    }
    if (!courseMode) {
      setStatus('error')
      setMessage('Please choose Online or Offline.')
      return
    }
    if (!consent) {
      setStatus('error')
      setMessage('Please accept the Terms & Conditions to continue.')
      return
    }

    setStatus('loading')
    try {
      const orderRes = await fetch(apiUrl('/api/admissions/create-order'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone,
          email: email.trim(),
          courseMode,
        }),
      })
      const orderData = await orderRes.json().catch(() => ({}))
      if (!orderRes.ok) {
        throw new Error(orderData.message || 'Could not start payment.')
      }

      const Razorpay = await loadRazorpayScript()
      if (!Razorpay) throw new Error('Razorpay failed to load.')

      await new Promise((resolve, reject) => {
        const checkout = new Razorpay({
          key: orderData.keyId,
          amount: orderData.order.amount,
          currency: orderData.order.currency || 'INR',
          name: 'Pranav One',
          description: 'Tally + Computer Course Admission',
          order_id: orderData.order.id,
          prefill: {
            name: name.trim(),
            email: email.trim(),
            contact: phone,
          },
          notes: {
            admissionId: orderData.admission?.id,
            courseMode,
          },
          theme: { color: '#1f7a4d' },
          handler: async (response) => {
            try {
              const verifyRes = await fetch(apiUrl('/api/admissions/verify'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(response),
              })
              const verifyData = await verifyRes.json().catch(() => ({}))
              if (!verifyRes.ok) {
                throw new Error(verifyData.message || 'Payment verification failed.')
              }
              setPaid(verifyData.admission)
              setStatus('success')
              setMessage('Payment successful. Your admission is confirmed.')
              resolve()
            } catch (err) {
              setStatus('error')
              setMessage(err.message || 'Payment verification failed.')
              reject(err)
            }
          },
          modal: {
            ondismiss: () => {
              setStatus('idle')
              setMessage('Payment cancelled. You can try again when ready.')
              resolve()
            },
          },
        })
        checkout.on('payment.failed', (response) => {
          setStatus('error')
          setMessage(response?.error?.description || 'Payment failed. Please try again.')
          reject(new Error(response?.error?.description || 'Payment failed'))
        })
        checkout.open()
      })
    } catch (error) {
      setStatus('error')
      setMessage(error.message || 'Something went wrong. Please try again.')
    }
  }

  const card = (
    <div className="join-card">
      {status === 'success' && paid ? null : (
        <>
          <h2 id="admission-form-title">Get Admission</h2>
          <p className="join-sub">
            Enter your name, mobile number, Gmail and course mode.
          </p>

          <form className="join-form" onSubmit={handlePayNow} noValidate autoComplete="on">
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
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
              />
              <FieldIcon filled={phone.trim().length > 0}>
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M6.62 10.79a15.15 15.15 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.4 21 3 13.6 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" />
                </svg>
              </FieldIcon>
            </label>

            <label className="pill-field">
              <span className="sr-only">Gmail Id</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="Gmail Id"
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

            <fieldset className="admission-mode admission-mode--join">
              <legend>Course mode</legend>
              <div className="admission-mode-options">
                {COURSE_MODES.map((mode) => (
                  <label
                    key={mode.id}
                    className={`admission-mode-option ${courseMode === mode.id ? 'is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="courseMode"
                      value={mode.id}
                      checked={courseMode === mode.id}
                      onChange={() => setCourseMode(mode.id)}
                    />
                    {mode.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <section className="admission-course-card" aria-label="Course description and details">
              <h3>About this course</h3>
              <p>
                Build job-ready accounting and computer skills with a structured programme designed
                for beginners and working professionals. Learn TallyPrime, GST workflows, and
                essential office tools through practical, real-world examples — then get support as
                you move into employment.
              </p>
              <ul>
                <li>
                  <strong>What you&apos;ll learn:</strong> TallyPrime &amp; GST, computer
                  fundamentals, MS Word, Excel, PowerPoint, and day-to-day business accounting.
                </li>
                <li>
                  <strong>How you&apos;ll learn:</strong> Live practical training with hands-on
                  projects and doubt support.
                </li>
                <li>
                  <strong>Duration:</strong> 3 months
                </li>
                <li>
                  <strong>Career support:</strong> 100% job assistance
                </li>
                <li className="admission-fee-row">
                  <strong>Course fee:</strong>
                  <span className="admission-fee-original">{pricing.originalAmountLabel}</span>
                  <span className="admission-fee-offer">{pricing.amountLabel}</span>
                </li>
              </ul>
            </section>

            {status === 'error' && message ? (
              <p className="form-error" role="alert">
                {message}
              </p>
            ) : null}
            {status === 'idle' && message ? (
              <p className="join-sub" role="status" style={{ marginBottom: 0 }}>
                {message}
              </p>
            ) : null}

            <button className="btn-trial" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Please wait…' : `Pay Now • ${pricing.amountLabel}`}
            </button>

            <label className="consent consent--compact">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                I agree to the{' '}
                <Link className="form-terms-link" to="/terms" target="_blank" rel="noreferrer">
                  Terms &amp; Conditions
                </Link>
              </span>
            </label>
          </form>
        </>
      )}
    </div>
  )

  if (isPage) return (
    <>
      {card}
      {status === 'success' && paid ? (
        <AdmissionCongratulations paid={paid} onClose={onClose} />
      ) : null}
    </>
  )

  return (
    <>
      {status === 'success' && paid ? (
        <AdmissionCongratulations paid={paid} onClose={onClose} />
      ) : (
        <div
          className="popup-overlay join-form-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && status !== 'loading') onClose?.()
          }}
        >
          <div
            className="join-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admission-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="join-form-close"
              aria-label="Close form"
              onClick={() => status !== 'loading' && onClose?.()}
            >
              ×
            </button>
            {card}
          </div>
        </div>
      )}
    </>
  )
}
