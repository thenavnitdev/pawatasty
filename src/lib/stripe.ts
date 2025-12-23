import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

    console.log('🔑 Initializing Stripe with key:', publishableKey ? `${publishableKey.substring(0, 20)}...` : 'MISSING');

    if (!publishableKey) {
      console.error('❌ CRITICAL: Stripe publishable key not found!');
      console.error('Please add VITE_STRIPE_PUBLISHABLE_KEY to your .env file');
      console.error('Current env vars:', Object.keys(import.meta.env).filter(k => k.includes('STRIPE')));
      return Promise.resolve(null);
    }

    if (!publishableKey.startsWith('pk_test_') && !publishableKey.startsWith('pk_live_')) {
      console.error('❌ Invalid Stripe key format. Must start with pk_test_ or pk_live_');
      return Promise.resolve(null);
    }

    console.log('✅ Loading Stripe...');
    stripePromise = loadStripe(publishableKey).then(stripe => {
      if (stripe) {
        console.log('✅ Stripe loaded successfully', stripe);
      } else {
        console.error('❌ Stripe failed to load - loadStripe returned null');
      }
      return stripe;
    }).catch(error => {
      console.error('❌ Error loading Stripe:', error);
      return null;
    });
  }

  return stripePromise;
};
