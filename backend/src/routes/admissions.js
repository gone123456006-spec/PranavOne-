import { Router } from 'express'
import {
  attachRazorpayOrder,
  createAdmissionDraft,
  getAdmissionById,
  getAdmissionByOrderId,
  markAdmissionFailed,
  markAdmissionPaid,
} from '../db/admissionsStore.js'
import {
  createRazorpayOrder,
  getAdmissionPricing,
  getRazorpayKeyId,
  isRazorpayConfigured,
  verifyRazorpaySignature,
} from '../razorpay.js'

export const admissionsRouter = Router()

admissionsRouter.get('/pricing', async (_req, res, next) => {
  try {
    const pricing = await getAdmissionPricing()
    res.json({
      ...pricing,
      razorpayReady: isRazorpayConfigured(),
    })
  } catch (error) {
    next(error)
  }
})

admissionsRouter.post('/create-order', async (req, res, next) => {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(503).json({
        message:
          'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server.',
      })
    }

    const admission = await createAdmissionDraft(req.body || {})
    const order = await createRazorpayOrder({
      receipt: admission.admissionNumber || admission.id,
      notes: {
        admissionId: admission.id,
        admissionNumber: admission.admissionNumber,
        name: admission.name,
        email: admission.email,
        phone: admission.phone,
        courseMode: admission.courseMode,
      },
    })

    const updated = await attachRazorpayOrder(admission.id, order.id)
    const pricing = await getAdmissionPricing()

    return res.status(201).json({
      admission: updated,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      keyId: getRazorpayKeyId(),
      pricing,
    })
  } catch (error) {
    next(error)
  }
})

admissionsRouter.post('/verify', async (req, res, next) => {
  try {
    const orderId = String(req.body?.razorpay_order_id || '').trim()
    const paymentId = String(req.body?.razorpay_payment_id || '').trim()
    const signature = String(req.body?.razorpay_signature || '').trim()

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: 'Missing Razorpay payment details.' })
    }

    const existing = await getAdmissionByOrderId(orderId)
    if (!existing) {
      return res.status(404).json({ message: 'Admission order not found.' })
    }
    if (existing.status === 'paid') {
      return res.json({
        ok: true,
        alreadyPaid: true,
        admission: await getAdmissionById(existing._id),
      })
    }

    const valid = verifyRazorpaySignature({ orderId, paymentId, signature })
    if (!valid) {
      await markAdmissionFailed(orderId)
      return res.status(400).json({ message: 'Payment verification failed.' })
    }

    const admission = await markAdmissionPaid({ orderId, paymentId, signature })
    return res.json({ ok: true, admission })
  } catch (error) {
    next(error)
  }
})
