import Stripe from 'stripe';
import { env } from '../config/env';

const isMockMode = !env.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY.startsWith('mock_');

export const stripe = isMockMode ? null : new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20', // Latest stable
});

export const createCheckoutSession = async (userId: string, email: string, planId: string) => {
  if (isMockMode) {
    // Return a fake URL that automatically simulates success
    return `${env.APP_URL}/settings?success=checkout_completed&mock_session=true`;
  }

  const session = await stripe!.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: email,
    client_reference_id: userId,
    line_items: [
      {
        price: planId, // The Stripe Price ID for PREMIUM
        quantity: 1,
      },
    ],
    success_url: `${env.APP_URL}/settings?success=checkout_completed`,
    cancel_url: `${env.APP_URL}/settings?canceled=true`,
  });

  return session.url;
};

export const createPortalSession = async (customerId: string) => {
  if (isMockMode) {
    return `${env.APP_URL}/settings?success=portal_completed&mock_session=true`;
  }

  const session = await stripe!.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.APP_URL}/settings`,
  });

  return session.url;
};
