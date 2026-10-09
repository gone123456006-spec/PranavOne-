import nodemailer from 'nodemailer'

function getSmtpConfig() {
  const host = String(
    process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  ).trim()
  const user = String(
    process.env.SMTP_USER ||
      process.env.BREVO_SMTP_LOGIN ||
      process.env.GMAIL_USER ||
      '',
  ).trim()
  const pass = String(
    process.env.SMTP_PASS ||
      process.env.SMTP_PASSWORD ||
      process.env.BREVO_SMTP_KEY ||
      process.env.GMAIL_APP_PASSWORD ||
      '',
  )
    .replace(/\s+/g, '')
    .trim()
  const from = String(
    process.env.SMTP_FROM ||
      process.env.SMTP_FROM_EMAIL ||
      process.env.EMAIL_FROM ||
      '',
  ).trim()
  const port = Number(process.env.SMTP_PORT || 587)
  const secure =
    String(process.env.SMTP_SECURE || (port === 465 ? 'true' : 'false'))
      .toLowerCase() === 'true'
  const senderName = String(
    process.env.SMTP_SENDER_NAME ||
      process.env.SMTP_FROM_NAME ||
      'BizVyapar',
  ).trim()

  // From must be a Brevo-verified sender (often your Gmail). Login is separate.
  if (!user || !pass || !from) {
    return null
  }

  const provider = /brevo|sendinblue/i.test(host) ? 'brevo' : 'smtp'

  return { host, user, pass, from, port, secure, senderName, provider }
}

export function isEmailConfigured() {
  return Boolean(getSmtpConfig())
}

export function getEmailConfigStatus() {
  const smtp = getSmtpConfig()

  if (!smtp) {
    return {
      configured: false,
      reason:
        'Missing SMTP_USER / SMTP_PASS / SMTP_FROM (Brevo SMTP login + SMTP key + verified sender)',
    }
  }

  return {
    configured: true,
    mode: smtp.provider === 'brevo' ? 'brevo-smtp' : 'smtp',
    senderEmail: smtp.from,
    senderName: smtp.senderName,
    host: smtp.host,
    port: smtp.port,
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Prefer a real join link; never send the placeholder Meet URL. */
export function resolveWebinarLink(link) {
  const value = String(link || process.env.WEBINAR_LINK || '').trim()
  if (!value || /your-webinar-link|example\.com|localhost/i.test(value)) {
    return 'https://www.bizvyapar.in'
  }
  return value
}

function buildReminderContent({ name, kind, webinarLink, workshopAt }) {
  const safeName = name || 'there'
  const link = resolveWebinarLink(webinarLink)
  const dateLabel = workshopAt.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const timeLabel = '5:00 PM (GMT +5:30) Calcutta, Chennai, Mumbai, New Delhi'
  const isDayBefore = kind === 't24h'
  const headline = isDayBefore
    ? 'Reminder: BizVyapar workshop is tomorrow!'
    : 'We are about to start — join now!'
  const body = isDayBefore
    ? 'This is your 24-hour reminder. Please keep this email handy and join on time tomorrow.'
    : 'In about 30 minutes, your BizVyapar live workshop will begin. Please proceed to the webinar room now.'

  const text = [
    headline,
    '',
    `Hi ${safeName},`,
    body,
    '',
    dateLabel,
    timeLabel,
    link ? `Join Webinar: ${link}` : '',
    '',
    'Support contact number: 9153832948',
    'See you at the webinar!',
    'Team BizVyapar',
  ]
    .filter(Boolean)
    .join('\n')

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.55;color:#111827;max-width:640px;margin:0 auto;padding:8px 4px">
      <h1 style="margin:0 0 12px;font-size:24px;color:#111827">${escapeHtml(headline)}</h1>
      <p style="margin:0 0 10px">Hi ${escapeHtml(safeName)},</p>
      <p style="margin:0 0 14px">${escapeHtml(body)}</p>
      <p style="margin:0 0 4px;font-weight:700;color:#ea580c">${escapeHtml(dateLabel)}</p>
      <p style="margin:0 0 16px;font-weight:700;color:#ea580c">${escapeHtml(timeLabel)}</p>
      ${
        link
          ? `<p style="margin:0 0 14px">
               <a href="${escapeHtml(link)}" style="display:inline-block;background:#ffde03;color:#111;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px">
                 Join Webinar
               </a>
             </p>`
          : ''
      }
      <p style="margin:0 0 12px;font-size:14px"><strong>Support contact number:</strong> 9153832948</p>
      <p style="margin:0">See you at the webinar!<br/>Team BizVyapar</p>
    </div>
  `

  return {
    subject: isDayBefore
      ? 'Reminder: BizVyapar workshop tomorrow at 5:00 PM'
      : 'Starting soon: join BizVyapar webinar now',
    text,
    html,
    safeName,
  }
}

let cachedTransporter = null
let cachedTransporterKey = ''

function getTransporter(config) {
  const key = `${config.host}|${config.port}|${config.user}|${config.secure}`
  if (cachedTransporter && cachedTransporterKey === key) {
    return cachedTransporter
  }
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure && config.port === 587,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 20_000,
  })
  cachedTransporterKey = key
  return cachedTransporter
}

async function sendMail({ to, name, subject, text, html }) {
  const recipient = String(to || '').trim().toLowerCase()
  if (!recipient) {
    const error = new Error('Missing recipient email.')
    error.status = 400
    throw error
  }

  const config = getSmtpConfig()
  if (!config) {
    const error = new Error(
      'Email is not configured. Add Brevo SMTP_USER, SMTP_PASS, and SMTP_FROM on the server.',
    )
    error.status = 503
    throw error
  }

  const safeName = name || 'there'
  const transporter = getTransporter(config)

  try {
    const info = await transporter.sendMail({
      from: `"${config.senderName}" <${config.from}>`,
      to: `"${safeName}" <${recipient}>`,
      subject,
      text,
      html,
    })

    console.log(`[email] sent via ${config.provider}-smtp`, {
      to: recipient,
      subject,
      host: config.host,
      messageId: info.messageId || null,
    })

    return { mode: `${config.provider}-smtp`, messageId: info.messageId || null }
  } catch (error) {
    // Reset pool and retry once (common on Render cold start / Brevo blip)
    cachedTransporter = null
    cachedTransporterKey = ''
    const retry = getTransporter(config)
    const info = await retry.sendMail({
      from: `"${config.senderName}" <${config.from}>`,
      to: `"${safeName}" <${recipient}>`,
      subject,
      text,
      html,
    })
    console.log(`[email] sent via ${config.provider}-smtp (retry)`, {
      to: recipient,
      subject,
      messageId: info.messageId || null,
      firstError: error.message,
    })
    return { mode: `${config.provider}-smtp`, messageId: info.messageId || null }
  }
}

export async function sendWorkshopReminderEmail({
  to,
  name,
  kind,
  webinarLink,
  workshopAt,
}) {
  const { subject, text, html, safeName } = buildReminderContent({
    name,
    kind,
    webinarLink,
    workshopAt,
  })
  return sendMail({ to, name: safeName, subject, text, html })
}
