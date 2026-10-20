import { useEffect, useState } from 'react'

const PRANAV_ONE = {
  name: 'Pranav One Institute',
  tagline: 'Your Career Starts Here',
  address: 'Pranav One, Computer Training Centre',
  street: 'Near Main Market, Dewas Road',
  city: 'Ujjain, Madhya Pradesh – 456010',
  phone: '+91 98765 43210',
  email: 'info@pranavone.in',
  website: 'www.pranavone.in',
}

const COURSE = {
  name: 'TallyPrime & Computer Course',
  duration: '3 Months',
  modules: 'TallyPrime, GST & Accounting, MS Word, Excel, PowerPoint',
  placement: '100% Job Assistance',
  fee: '₹8,000',
  mode_online: 'Live Online Classes',
  mode_offline: 'In-Centre Classroom',
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—'
  try {
    return new Date(isoStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return isoStr
  }
}

function formatDateOnly(isoStr) {
  if (!isoStr) return '—'
  try {
    return new Date(isoStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return isoStr
  }
}

function buildReceiptHtml(paid) {
  const admNo = paid?.admissionNumber || 'ADM-CONFIRMED'
  const modeLabel =
    paid?.courseMode === 'offline' ? COURSE.mode_offline : COURSE.mode_online
  const paidDate = formatDateTime(paid?.paidAt || paid?.createdAt)
  const receiptDate = formatDateOnly(paid?.paidAt || paid?.createdAt)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Admission Receipt · ${admNo} · Pranav One</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{font-family:'Inter',Arial,sans-serif;background:#fff;color:#0f172a;font-size:14px}
    body{padding:0;margin:0}
    .receipt{max-width:660px;margin:0 auto;padding:36px 36px 48px}
    .receipt-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-bottom:18px;border-bottom:3px solid #1f7a4d;margin-bottom:20px}
    .rh-left{}
    .rh-logo{font-size:24px;font-weight:900;color:#1f7a4d;letter-spacing:-0.02em}
    .rh-tag{font-size:11px;color:#64748b;margin-top:3px;font-style:italic}
    .rh-address{text-align:right;font-size:11px;color:#64748b;line-height:1.7}
    .rh-address strong{display:block;color:#0f172a;font-weight:700;font-size:12px}
    .rh-doc-type{font-size:11px;color:#94a3b8;margin-top:8px;text-transform:uppercase;letter-spacing:0.06em}

    .receipt-banner{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:14px;padding:18px 22px;margin-bottom:20px;display:flex;align-items:center;gap:16px}
    .rb-check{width:48px;height:48px;border-radius:50%;background:#16a34a;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .rb-check svg{width:26px;height:26px;fill:#fff}
    .rb-text h2{font-size:18px;font-weight:800;color:#166534}
    .rb-text p{font-size:12px;color:#15803d;margin-top:3px;line-height:1.5}

    .adm-number-block{background:linear-gradient(135deg,#1f7a4d,#15803d);border-radius:14px;padding:18px 22px;margin-bottom:22px;display:flex;align-items:center;justify-content:space-between}
    .anb-left{}
    .anb-label{font-size:10px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:#86efac}
    .anb-num{font-size:30px;font-weight:900;color:#fff;font-family:ui-monospace,Menlo,Monaco,Consolas,monospace;letter-spacing:0.05em;margin-top:4px}
    .anb-right{text-align:right}
    .anb-date-label{font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#86efac}
    .anb-date{font-size:14px;color:#fff;font-weight:600;margin-top:4px}

    .section{margin-bottom:20px}
    .section-title{font-size:10px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:#64748b;padding-bottom:8px;border-bottom:1px solid #e2e8f0;margin-bottom:14px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 24px}
    .field{}
    .field.full{grid-column:1/-1}
    .field-label{font-size:10px;text-transform:uppercase;letter-spacing:0.04em;color:#94a3b8;font-weight:600}
    .field-value{font-size:14px;font-weight:600;color:#0f172a;margin-top:3px}
    .field-value.green{color:#15803d;font-size:17px;font-weight:800}
    .field-value.mono{font-family:ui-monospace,Menlo,Monaco,Consolas,monospace;font-size:12px;word-break:break-all}

    .course-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px}
    .course-name{font-size:16px;font-weight:800;color:#1f7a4d;margin-bottom:12px}
    .course-row{display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:7px 0;border-bottom:1px solid #f1f5f9}
    .course-row:last-child{border-bottom:none}
    .course-row span{color:#475569}
    .course-row strong{color:#0f172a;text-align:right;max-width:60%}

    .note-box{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin:18px 0}
    .note-box p{font-size:12px;color:#92400e;line-height:1.7}
    .note-box strong{font-weight:700}

    .receipt-footer{margin-top:24px;padding-top:18px;border-top:1px dashed #cbd5e1;display:flex;justify-content:space-between;align-items:flex-end;gap:20px}
    .rf-left{font-size:11px;color:#94a3b8;line-height:1.8}
    .rf-left strong{color:#475569;font-weight:600;font-size:12px}
    .rf-stamp{text-align:right}
    .rf-stamp-inner{display:inline-block;padding:6px 16px;border:2px solid #16a34a;border-radius:6px;color:#166534;font-weight:700;font-size:12px;transform:rotate(-3deg);display:inline-block}
    .rf-auth{font-size:10px;color:#94a3b8;margin-top:6px;display:block;text-align:right}

    @media print{
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    }
  </style>
</head>
<body>
<div class="receipt">
  <div class="receipt-header">
    <div class="rh-left">
      <div class="rh-logo">Pranav One</div>
      <div class="rh-tag">${PRANAV_ONE.tagline}</div>
      <div class="rh-doc-type">Official Payment Receipt</div>
    </div>
    <div class="rh-address">
      <strong>${PRANAV_ONE.address}</strong>
      ${PRANAV_ONE.street}<br/>
      ${PRANAV_ONE.city}<br/>
      ${PRANAV_ONE.phone}<br/>
      ${PRANAV_ONE.email}<br/>
      ${PRANAV_ONE.website}
    </div>
  </div>

  <div class="receipt-banner">
    <div class="rb-check">
      <svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
    </div>
    <div class="rb-text">
      <h2>🎉 Congratulations! Admission Confirmed</h2>
      <p>Payment received successfully. Your seat at Pranav One Institute has been officially reserved, ${paid?.name || 'Student'}.</p>
    </div>
  </div>

  <div class="adm-number-block">
    <div class="anb-left">
      <div class="anb-label">Official Admission Number</div>
      <div class="anb-num">${admNo}</div>
    </div>
    <div class="anb-right">
      <div class="anb-date-label">Admission Date</div>
      <div class="anb-date">${receiptDate}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Candidate Information</div>
    <div class="grid">
      <div class="field">
        <div class="field-label">Full Name</div>
        <div class="field-value">${paid?.name || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">Mobile Number</div>
        <div class="field-value">+91 ${paid?.phone || '—'}</div>
      </div>
      <div class="field full">
        <div class="field-label">Email / Gmail ID</div>
        <div class="field-value">${paid?.email || '—'}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Course Enrollment Details</div>
    <div class="course-box">
      <div class="course-name">${COURSE.name}</div>
      <div class="course-row"><span>Learning Mode</span><strong>${modeLabel}</strong></div>
      <div class="course-row"><span>Course Duration</span><strong>${COURSE.duration}</strong></div>
      <div class="course-row"><span>Modules Covered</span><strong>${COURSE.modules}</strong></div>
      <div class="course-row"><span>Placement Assistance</span><strong>${COURSE.placement}</strong></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Payment Details</div>
    <div class="grid">
      <div class="field">
        <div class="field-label">Amount Paid</div>
        <div class="field-value green">${paid?.amountLabel || COURSE.fee}</div>
      </div>
      <div class="field">
        <div class="field-label">Payment Gateway</div>
        <div class="field-value">Razorpay (Online)</div>
      </div>
      <div class="field full">
        <div class="field-label">Razorpay Payment ID</div>
        <div class="field-value mono">${paid?.razorpayPaymentId || '—'}</div>
      </div>
      <div class="field full">
        <div class="field-label">Payment Date &amp; Time</div>
        <div class="field-value">${paidDate}</div>
      </div>
    </div>
  </div>

  <div class="note-box">
    <p><strong>📞 Next Steps:</strong> Our team will call/WhatsApp you within <strong>24 hours</strong> on your registered mobile number to share your batch schedule, class link (for online), and orientation details. Please keep this receipt for your records.</p>
  </div>

  <div class="receipt-footer">
    <div class="rf-left">
      <strong>${PRANAV_ONE.name}</strong><br/>
      ${PRANAV_ONE.address}<br/>
      ${PRANAV_ONE.street}<br/>
      ${PRANAV_ONE.city}<br/>
      ${PRANAV_ONE.phone} | ${PRANAV_ONE.email}
    </div>
    <div class="rf-stamp">
      <div class="rf-stamp-inner">PAID ✓</div>
      <span class="rf-auth">Authorised Receipt</span>
    </div>
  </div>
</div>
<script>
  window.addEventListener('load', function() {
    setTimeout(function() { window.print() }, 500)
  })
</script>
</body>
</html>`
}

// ─── Confetti piece ──────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#1f7a4d', '#16a34a', '#facc15', '#f97316', '#3b82f6', '#a855f7', '#ec4899', '#06b6d4']

export default function AdmissionCongratulations({ paid, onClose }) {
  const [copied, setCopied] = useState(false)
  const [confetti, setConfetti] = useState(true)

  const admNo = paid?.admissionNumber || 'ADM-CONFIRMED'
  const modeLabel =
    paid?.courseMode === 'offline' ? COURSE.mode_offline : COURSE.mode_online

  useEffect(() => {
    const t = setTimeout(() => setConfetti(false), 4000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  function copyAdmNo() {
    void navigator.clipboard?.writeText(admNo)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function downloadReceipt() {
    const html = buildReceiptHtml(paid)
    const win = window.open('', '_blank', 'width=760,height=960')
    if (!win) {
      alert('Please allow pop-ups to download/print the receipt.')
      return
    }
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="adm-congrats-overlay">
      {/* Confetti */}
      {confetti && (
        <div className="adm-confetti-wrap" aria-hidden="true">
          {Array.from({ length: 36 }, (_, i) => (
            <span
              key={i}
              className="adm-confetti-bit"
              style={{
                left: `${(i / 36) * 100 + (Math.random() - 0.5) * 8}%`,
                animationDelay: `${(i % 12) * 0.1}s`,
                animationDuration: `${1.8 + (i % 7) * 0.3}s`,
                background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                width: `${8 + (i % 5) * 3}px`,
                height: `${8 + (i % 4) * 3}px`,
                borderRadius: i % 3 === 0 ? '50%' : '2px',
              }}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <div className="adm-congrats-modal" role="dialog" aria-modal="true" aria-label="Admission Confirmed">
        <button type="button" className="adm-congrats-close-btn" onClick={onClose} aria-label="Close">
          ×
        </button>

        {/* ── CONGRATULATIONS HEADER ── */}
        <div className="adm-congrats-head">
          <div className="adm-congrats-emoji">🎉</div>
          <h2 className="adm-congrats-title">Congratulations!</h2>
          <p className="adm-congrats-sub">
            Your admission is <span className="adm-green-bold">confirmed</span>,{' '}
            <span className="adm-name-highlight">{paid?.name?.split(' ')[0] || 'Student'}</span>!<br />
            Your seat at <strong>Pranav One Institute</strong> is officially reserved.
          </p>
        </div>

        {/* ── ADMISSION NUMBER ── */}
        <div className="adm-number-block">
          <div>
            <div className="adm-number-label">Official Admission Number</div>
            <div className="adm-number-value">{admNo}</div>
          </div>
          <button type="button" className="adm-copy-btn" onClick={copyAdmNo}>
            {copied
              ? <><span className="adm-copy-check">✓</span> Copied!</>
              : <>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                  Copy
                </>
            }
          </button>
        </div>

        {/* ── RECEIPT CARD ── */}
        <div className="adm-receipt-card">
          {/* Institute badge */}
          <div className="adm-inst-badge">
            <div className="adm-inst-logo">Pranav One</div>
            <div className="adm-inst-stamp">PAID ✓</div>
          </div>

          {/* Candidate details */}
          <div className="adm-receipt-section">
            <div className="adm-receipt-sec-title">Candidate Details</div>
            <div className="adm-receipt-grid">
              <div className="adm-rf">
                <span className="adm-rf-label">Full Name</span>
                <strong className="adm-rf-value">{paid?.name}</strong>
              </div>
              <div className="adm-rf">
                <span className="adm-rf-label">Mobile No.</span>
                <strong className="adm-rf-value">+91 {paid?.phone}</strong>
              </div>
              <div className="adm-rf adm-rf--full">
                <span className="adm-rf-label">Email / Gmail</span>
                <strong className="adm-rf-value">{paid?.email}</strong>
              </div>
            </div>
          </div>

          {/* Course details */}
          <div className="adm-receipt-section">
            <div className="adm-receipt-sec-title">Course Enrolled</div>
            <div className="adm-course-rows">
              <div className="adm-course-row">
                <span>Course Name</span>
                <strong>TallyPrime &amp; Computer Course</strong>
              </div>
              <div className="adm-course-row">
                <span>Learning Mode</span>
                <strong>{modeLabel}</strong>
              </div>
              <div className="adm-course-row">
                <span>Duration</span>
                <strong>3 Months</strong>
              </div>
              <div className="adm-course-row">
                <span>Modules</span>
                <strong>TallyPrime, GST, MS Word, Excel, PowerPoint</strong>
              </div>
              <div className="adm-course-row">
                <span>Placement Support</span>
                <strong>100% Job Assistance</strong>
              </div>
            </div>
          </div>

          {/* Payment details */}
          <div className="adm-receipt-section">
            <div className="adm-receipt-sec-title">Payment Information</div>
            <div className="adm-receipt-grid">
              <div className="adm-rf">
                <span className="adm-rf-label">Amount Paid</span>
                <strong className="adm-rf-value adm-rf-amount">{paid?.amountLabel || '₹8,000'}</strong>
              </div>
              <div className="adm-rf">
                <span className="adm-rf-label">Payment Via</span>
                <strong className="adm-rf-value">Razorpay (Online)</strong>
              </div>
              {paid?.razorpayPaymentId && (
                <div className="adm-rf adm-rf--full">
                  <span className="adm-rf-label">Payment ID (Razorpay)</span>
                  <strong className="adm-rf-value adm-rf-mono">{paid.razorpayPaymentId}</strong>
                </div>
              )}
              {paid?.paidAt && (
                <div className="adm-rf adm-rf--full">
                  <span className="adm-rf-label">Payment Date &amp; Time</span>
                  <strong className="adm-rf-value">{formatDateTime(paid.paidAt)}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="adm-address-block">
            <span className="adm-address-pin">📍</span>
            <div>
              <div className="adm-address-name">Pranav One Institute</div>
              <div className="adm-address-line">{PRANAV_ONE.address}</div>
              <div className="adm-address-line">{PRANAV_ONE.street}</div>
              <div className="adm-address-line">{PRANAV_ONE.city}</div>
              <div className="adm-address-line">
                📞 {PRANAV_ONE.phone} &nbsp;·&nbsp; ✉ {PRANAV_ONE.email}
              </div>
              <div className="adm-address-line">🌐 {PRANAV_ONE.website}</div>
            </div>
          </div>
        </div>

        {/* Next steps */}
        <div className="adm-next-steps">
          <span aria-hidden="true">📞</span>
          <p>
            Our team will contact you within <strong>24 hours</strong> on your mobile to share batch schedule, class link, and orientation details.
          </p>
        </div>

        {/* Action buttons */}
        <div className="adm-action-row">
          <button type="button" className="adm-btn-download" onClick={downloadReceipt}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zm-8 2V5h2v6h1.17L12 13.17 9.83 11H11zm-6 7h14v2H5z"/>
            </svg>
            Download Receipt
          </button>
          <button type="button" className="adm-btn-done" onClick={onClose}>
            Done
          </button>
        </div>

        <p className="adm-save-reminder">
          Please save your Admission No: <strong>{admNo}</strong>
        </p>
      </div>
    </div>
  )
}
