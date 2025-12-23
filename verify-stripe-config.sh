#!/bin/bash

echo "🔍 Verifying Stripe Configuration..."
echo "======================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Check publishable key
if grep -q "VITE_STRIPE_PUBLISHABLE_KEY=" .env; then
    echo "✅ Stripe publishable key found in .env"
    PUBKEY=$(grep "VITE_STRIPE_PUBLISHABLE_KEY=" .env | cut -d '=' -f2)
    
    if [[ $PUBKEY == pk_test_* ]]; then
        echo "   📝 Using TEST mode (pk_test_...)"
    elif [[ $PUBKEY == pk_live_* ]]; then
        echo "   🚀 Using LIVE mode (pk_live_...)"
    else
        echo "   ⚠️  Invalid key format"
    fi
else
    echo "❌ VITE_STRIPE_PUBLISHABLE_KEY not found in .env"
fi

echo ""
echo "📋 Next steps:"
echo "1. Add STRIPE_SECRET_KEY to Supabase Dashboard"
echo "   → Project Settings → Edge Functions → Secrets"
echo ""
echo "2. Deploy edge functions:"
echo "   supabase functions deploy payment-methods"
echo "   supabase functions deploy subscription-payment"
echo "   supabase functions deploy rental-management"
echo ""
echo "3. Test with Stripe test card: 4242 4242 4242 4242"
echo ""

