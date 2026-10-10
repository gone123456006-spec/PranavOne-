import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './TermsConditions.css'

const WHATSAPP_SUPPORT_PHONE = '919153832948'

export default function RefundPolicy() {
  const navigate = useNavigate()
  const { hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash])

  function handleClose() {
    const idx = window.history.state?.idx
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1)
      return
    }
    navigate('/')
  }

  const waHref = `https://wa.me/${WHATSAPP_SUPPORT_PHONE}?text=${encodeURIComponent(
    'Hi Pranav One, I have a question about the Refund Policy / Job Assistance.',
  )}`

  return (
    <div className="terms-page">
      <header className="terms-top">
        <button
          className="terms-close"
          type="button"
          aria-label="Close"
          onClick={handleClose}
        >
          ×
        </button>
      </header>

      <main className="terms-main">
        <h1>Refund Policy &amp; 100% Job Assistance</h1>
        <p className="terms-effective">Effective Date: 10-10-2026</p>

        <p>
          Hi! Thank you for choosing Pranav One for your Tally + Computer
          course. Before you join, please read this page once. We have kept it
          simple and clear, so you know exactly what to expect from us and what
          we expect from you.
        </p>

        <div className="policy-summary">
          <p className="policy-summary-title">In simple words</p>
          <ul>
            <li>
              All fees paid to Pranav One are <strong>non-refundable</strong>.
            </li>
            <li>
              We give <strong>100% Job Assistance</strong> to every eligible
              student until they get placed.
            </li>
            <li>
              Job Assistance means full support to get a job. It is{' '}
              <strong>not a job guarantee</strong>. The final hiring decision is
              always taken by the company.
            </li>
            <li>
              <strong>Terms &amp; Conditions apply.</strong> Please read the
              details below.
            </li>
          </ul>
        </div>

        <h2 id="no-refund">1. No Refund Policy</h2>
        <p>
          Once you pay for a course at Pranav One, the payment is final. We do
          not offer refunds, full or partial, for any reason once your seat is
          booked.
        </p>
        <p>This applies to:</p>
        <ul>
          <li>Registration fee, seat booking amount or token amount</li>
          <li>Full course fee paid at once</li>
          <li>Instalments or EMI payments already made</li>
          <li>Study material, practice files and certificate charges</li>
        </ul>

        <h2>2. Why We Don’t Give Refunds</h2>
        <p>
          When you join, we reserve a seat for you in a limited batch, assign a
          trainer, share study material and start your placement support. Seats
          in a batch are limited, so a seat you leave usually cannot be filled
          by another student. That is why every payment is non-refundable.
        </p>

        <h2>3. Situations Where Refunds Are Not Given</h2>
        <p>No refund is given in cases like these:</p>
        <ul>
          <li>You change your mind after joining</li>
          <li>You miss classes or stop attending in the middle of the course</li>
          <li>You find the course difficult or too easy</li>
          <li>You get a job, shift to another city or join another institute</li>
          <li>Personal, family, health or exam-related reasons</li>
          <li>Problems with your own internet, phone or laptop</li>
          <li>
            Your admission is cancelled because of misconduct or breaking
            institute rules
          </li>
        </ul>

        <h2>4. Batch Transfer (Instead of Refund)</h2>
        <p>
          We understand that life can be unpredictable. If you cannot continue
          with your current batch, you can request a{' '}
          <strong>one-time free transfer</strong> to an upcoming batch.
        </p>
        <ul>
          <li>Send your request on WhatsApp before the course is 50% complete.</li>
          <li>The transfer depends on seat availability in the next batch.</li>
          <li>The transfer must be used within 3 months of the request.</li>
          <li>Your seat cannot be transferred to another person.</li>
        </ul>

        <h2>5. If Pranav One Cancels a Batch</h2>
        <p>
          If we cancel or postpone a batch for any reason, you will be moved to
          the next available batch at no extra cost. If we are unable to start
          the course at all, the amount you paid will be returned in full to
          your original payment method within 7–10 working days.
        </p>

        <h2 id="job-assistance">6. 100% Job Assistance: What It Means</h2>
        <p>
          Our goal is simple: to help you get a job in accounts, billing or
          office work. “100% Job Assistance” means that{' '}
          <strong>every eligible student</strong> gets our full placement
          support, and we keep helping you until you get placed.
        </p>
        <p>
          We prepare you, connect you with employers and arrange interviews.
          You still need to clear the interview, because the company decides
          whom to hire.
        </p>

        <h2>7. What You Get in Job Assistance</h2>
        <ul>
          <li>
            <strong>Resume building:</strong> we help you create a professional
            resume that highlights your Tally, GST and computer skills.
          </li>
          <li>
            <strong>Interview preparation:</strong> mock interviews, common
            accounting questions and practical Tally tests, just like real
            interviews.
          </li>
          <li>
            <strong>Communication &amp; confidence:</strong> how to introduce
            yourself, how to talk to HR and how to dress and behave in an
            interview.
          </li>
          <li>
            <strong>Interview calls:</strong> we share your profile with our
            partner companies, CA firms, shops, traders and businesses that are
            hiring.
          </li>
          <li>
            <strong>Job alerts on WhatsApp:</strong> regular updates about
            openings for roles like Accountant, Tally Operator, Billing
            Executive, Data Entry Operator and Office Assistant.
          </li>
          <li>
            <strong>Support after the course:</strong> placement help continues
            after your classes end, until you get placed, as long as you meet
            the conditions below.
          </li>
        </ul>

        <h2>8. Who Is Eligible for Job Assistance</h2>
        <p>To get job assistance, you need to:</p>
        <ul>
          <li>Pay the full course fee</li>
          <li>Attend at least 80% of the classes</li>
          <li>Complete all assignments and practical work</li>
          <li>Pass the final course assessment</li>
          <li>Attend the resume and interview preparation sessions</li>
          <li>Share correct details and keep your mobile number active</li>
        </ul>

        <h2>9. When Job Assistance Stops</h2>
        <p>We may stop job assistance if:</p>
        <ul>
          <li>You skip interviews that were arranged for you without informing us</li>
          <li>You turn down 3 suitable job offers or interview opportunities</li>
          <li>You don’t reply to our calls or WhatsApp messages for 30 days</li>
          <li>You behave badly with an employer, trainer or another student</li>
          <li>You share false information in your resume or documents</li>
          <li>You already got a job through Pranav One or on your own</li>
        </ul>

        <h2>10. Please Note</h2>
        <ul>
          <li>
            Salary, job role, job location and working hours are decided by the
            employer, not by Pranav One.
          </li>
          <li>
            The number of interviews and the time it takes to get placed depend
            on your skills, interview performance, location preference and the
            job market.
          </li>
          <li>
            Pranav One does not charge students any extra fee for placement
            support.
          </li>
          <li>
            Not getting a job does not make you eligible for a refund of the
            course fee.
          </li>
        </ul>

        <h2>11. Terms &amp; Conditions Apply</h2>
        <ul>
          <li>
            By paying any fee, you confirm that you have read and agreed to
            this policy.
          </li>
          <li>
            Pranav One may update this policy from time to time. The latest
            version will always be available on this page.
          </li>
          <li>
            Course content, batch timings and trainers may change to improve
            the course.
          </li>
          <li>
            Any dispute will be handled under the laws of India, in the courts
            of the city where the Pranav One institute is located.
          </li>
        </ul>

        <h2>12. Need Help?</h2>
        <p>
          If you have any questions about fees, batch transfer or job
          assistance, just message us on WhatsApp. Our team usually replies
          within a few hours on working days.
        </p>
        <a
          className="policy-wa-btn"
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          Chat with us on WhatsApp
        </a>

        <p className="terms-closing">
          By joining a Pranav One course, you agree to this Refund Policy and
          the 100% Job Assistance terms. Terms &amp; Conditions apply.
        </p>
      </main>
    </div>
  )
}
