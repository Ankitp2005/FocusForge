import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';
import { createCheckoutSession, createPortalSession } from '../services/stripe';

const router = Router();

// ─── POST /api/v1/subscriptions/checkout ─────────────────────────────────────
router.post('/checkout', authenticate, async (req, res, next) => {
  try {
    const { planId } = req.body; // e.g., 'price_premium_monthly'

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { subscription: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    if (user.subscription?.status === 'ACTIVE') {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Already subscribed' } });
    }

    // Since mock mode doesn't hit Stripe, if we don't have a planId we just default to a mock ID
    const priceId = planId || 'mock_price_pro';
    
    const url = await createCheckoutSession(user.id, user.email, priceId);

    // If mock mode returns a direct success URL, we can optionally just upgrade the user right here
    // for local testing convenience, since the webhook won't fire for mock urls.
    if (url?.includes('mock_session=true')) {
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: 'PRO' }
      });
      await prisma.subscription.upsert({
        where: { userId: user.id },
        update: { status: 'ACTIVE', stripeSubscriptionId: 'mock_sub_123', stripeCustomerId: 'mock_cus_123', plan: 'PRO' },
        create: { userId: user.id, status: 'ACTIVE', stripeSubscriptionId: 'mock_sub_123', stripeCustomerId: 'mock_cus_123', plan: 'PRO' }
      });
    }

    res.json({
      success: true,
      data: { url },
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/v1/subscriptions/portal ───────────────────────────────────────
router.post('/portal', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { subscription: true }
    });

    if (!user?.subscription?.stripeCustomerId) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'No active Stripe customer found' } });
    }

    const url = await createPortalSession(user.subscription.stripeCustomerId);

    // If mock mode returns a mock URL, simulate portal management
    if (url?.includes('mock_session=true')) {
       // Just downgrade for mock testing purposes
       await prisma.user.update({
         where: { id: user.id },
         data: { plan: 'FREE' }
       });
       await prisma.subscription.update({
         where: { userId: user.id },
         data: { status: 'CANCELLED' }
       });
    }

    res.json({
      success: true,
      data: { url },
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/v1/subscriptions/plans ─────────────────────────────────────────
router.get('/plans', authenticate, async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        plans: [
          { id: 'free', name: 'FREE', price: 0, interval: 'month' },
          { id: 'price_pro_monthly', name: 'PRO', price: 10, interval: 'month' }
        ]
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
