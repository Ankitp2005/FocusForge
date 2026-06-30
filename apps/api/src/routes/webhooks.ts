import express, { Router } from 'express';
import { stripe } from '../services/stripe';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { calculatePriorityScore } from '../utils/priority';
import { emitToUser } from '../config/websocket';

const router = Router();

// ─── POST /api/v1/webhooks/stripe ───────────────────────────────────────────
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    if (!stripe) {
      // Mock mode: no actual stripe instance, but if a webhook somehow fired, just ignore
      return res.status(200).send('Mock mode active. Ignored.');
    }

    if (!signature) {
      return res.status(400).send('Missing signature');
    }

    event = stripe.webhooks.constructEvent(
      req.body, // This is raw because of express.raw()
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id;
        if (userId && session.subscription) {
          const subscriptionId = session.subscription as string;
          const customerId = session.customer as string;

          await prisma.user.update({
            where: { id: userId },
            data: { plan: 'PRO' },
          });

          await prisma.subscription.upsert({
            where: { userId },
            update: {
              status: 'ACTIVE',
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: customerId,
              plan: 'PRO',
            },
            create: {
              userId,
              status: 'ACTIVE',
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: customerId,
              plan: 'PRO',
            },
          });
          logger.info(`User ${userId} upgraded to PRO via checkout completion.`);
        }
        break;
      }
      
      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        
        const localSub = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId }
        });

        if (localSub) {
          const isActive = subscription.status === 'active' || subscription.status === 'trialing';
          
          await prisma.subscription.update({
            where: { id: localSub.id },
            data: { status: isActive ? 'ACTIVE' : 'CANCELLED' },
          });

          await prisma.user.update({
            where: { id: localSub.userId },
            data: { plan: isActive ? 'PRO' : 'FREE' },
          });
          logger.info(`Subscription updated for user ${localSub.userId}. Status: ${subscription.status}`);
        }
        break;
      }

      default:
        logger.info(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Error handling webhook event', error);
    res.status(500).send('Webhook handler failed');
  }
});

// ─── POST /api/v1/webhooks/google-calendar ────────────────────────────────────
router.post('/google-calendar', async (req, res, next) => {
  const channelId = req.headers['x-goog-channel-id'];
  const resourceId = req.headers['x-goog-resource-id'];
  const resourceState = req.headers['x-goog-resource-state'];

  logger.info(`Received Google Calendar webhook. Channel: ${channelId}, State: ${resourceState}`);

  if (resourceState === 'sync') {
    return res.status(200).send('Sync acknowledged');
  }

  try {
    const integration = await prisma.calendarIntegration.findFirst({
      where: {
        syncEnabled: true,
      },
      include: { user: true },
    });

    if (!integration) {
      return res.status(200).send('No active integration found');
    }

    const { fetchCalendarEvents } = require('../services/googleCalendar');
    const events = await fetchCalendarEvents(integration.accessToken, integration.refreshToken);

    for (const event of events) {
      if (!event.id) continue;

      const startTime = event.start?.dateTime || event.start?.date;
      if (!startTime) continue;

      const title = event.summary || 'Google Calendar Event';
      const description = event.description || '';

      const existingTask = await prisma.task.findFirst({
        where: { userId: integration.userId, calendarEventId: event.id },
      });

      if (existingTask) {
        const newDueDate = new Date(startTime);
        if (existingTask.title !== title || existingTask.dueDate?.getTime() !== newDueDate.getTime()) {
          const newScore = calculatePriorityScore(existingTask.priority, newDueDate, existingTask.createdAt);
          await prisma.task.update({
            where: { id: existingTask.id },
            data: {
              title,
              description: description || existingTask.description,
              dueDate: newDueDate,
              priorityScore: newScore,
            },
          });
          emitToUser(integration.userId, 'TASK_UPDATED', { type: 'update', taskId: existingTask.id });
        }
      } else {
        const dueDate = new Date(startTime);
        const priorityScore = calculatePriorityScore('MEDIUM', dueDate, new Date());
        const newTask = await prisma.task.create({
          data: {
            userId: integration.userId,
            title,
            description,
            dueDate,
            calendarEventId: event.id,
            status: 'PENDING',
            priority: 'MEDIUM',
            priorityScore,
          },
        });
        emitToUser(integration.userId, 'TASK_UPDATED', { type: 'create', taskId: newTask.id });
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error handling Google Calendar webhook', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
