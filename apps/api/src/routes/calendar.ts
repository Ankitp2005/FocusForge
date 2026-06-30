import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getAuthUrl, exchangeCodeForTokens, fetchCalendarEvents } from '../services/googleCalendar';
import { prisma } from '../config/database';
import { env } from '../config/env';

const router = Router();

// ─── GET /api/v1/calendar/status ─────────────────────────────────────────────
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const integration = await prisma.calendarIntegration.findFirst({
      where: { userId: req.user!.id, provider: 'google' },
    });

    res.json({
      success: true,
      data: {
        connected: !!integration,
        syncEnabled: integration?.syncEnabled ?? false,
        lastSyncedAt: integration?.lastSyncedAt ?? null,
        email: integration?.accountEmail ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/v1/calendar/events ─────────────────────────────────────────────
router.get('/events', authenticate, async (req, res, next) => {
  try {
    const integration = await prisma.calendarIntegration.findFirst({
      where: { userId: req.user!.id, provider: 'google' },
    });

    if (!integration) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const events = await fetchCalendarEvents(integration.accessToken, integration.refreshToken);
    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/v1/calendar/connect ───────────────────────────────────────────
router.post('/connect', authenticate, (req, res) => {
  // Generate auth URL with state=userId to track who initiated
  const url = getAuthUrl(req.user!.id);
  res.json({
    success: true,
    data: { url },
  });
});

// ─── GET /api/v1/calendar/callback ───────────────────────────────────────────
// This is hit by Google redirect. We don't use the authenticate middleware here 
// because it's a browser redirect, not an API call with Bearer token.
router.get('/callback', async (req, res, next) => {
  try {
    const { code, state: userId, error } = req.query;

    if (error) {
      return res.redirect(`${env.APP_URL}/settings?error=calendar_oauth_failed`);
    }

    if (!code || !userId || typeof code !== 'string' || typeof userId !== 'string') {
      return res.redirect(`${env.APP_URL}/settings?error=invalid_oauth_request`);
    }

    const { tokens, email } = await exchangeCodeForTokens(code);

    await prisma.calendarIntegration.upsert({
      where: {
        userId_provider_accountEmail: {
          userId,
          provider: 'google',
          accountEmail: email,
        },
      },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token ?? undefined,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        syncEnabled: true,
      },
      create: {
        userId,
        provider: 'google',
        accountEmail: email,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    res.redirect(`${env.APP_URL}/calendar?success=calendar_connected`);
  } catch (error) {
    console.error('OAuth Callback Error:', error);
    res.redirect(`${env.APP_URL}/settings?error=calendar_oauth_failed`);
  }
});

// ─── DELETE /api/v1/calendar/disconnect ──────────────────────────────────────
router.delete('/disconnect', authenticate, async (req, res, next) => {
  try {
    await prisma.calendarIntegration.deleteMany({
      where: { userId: req.user!.id, provider: 'google' },
    });

    res.json({
      success: true,
      message: 'Calendar disconnected successfully',
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/v1/calendar/sync ──────────────────────────────────────────────
router.post('/sync', authenticate, async (req, res, next) => {
  try {
    const integration = await prisma.calendarIntegration.findFirst({
      where: { userId: req.user!.id, provider: 'google' },
    });

    if (!integration) {
      return res.status(400).json({
        success: false,
        error: { code: 'NOT_CONNECTED', message: 'Calendar not connected' },
      });
    }

    // For manual sync testing, we fetch right now to verify it works
    const events = await fetchCalendarEvents(integration.accessToken, integration.refreshToken);

    // Update lastSyncedAt
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: { lastSyncedAt: new Date() },
    });

    res.json({
      success: true,
      data: {
        message: 'Sync completed',
        eventsFetched: events.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
