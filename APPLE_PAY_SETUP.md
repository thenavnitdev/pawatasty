# Apple Pay Setup Guide

## Why Apple Pay Doesn't Work (But Google Pay Does)

Apple Pay has stricter requirements than Google Pay:

| Requirement | Apple Pay | Google Pay |
|------------|-----------|-----------|
| Domain Verification | **Required** | Not required |
| HTTPS | **Strict** (entire site) | Lenient |
| Works on localhost | **No** | Yes |
| Browser Support | Safari only | Chrome, Edge, etc. |
| Setup Complexity | High | Low |

## Current Status

✅ **Google Pay**: Working in development and production
⚠️ **Apple Pay**: Requires production setup (see below)

## Quick Start

### Development Environment

Apple Pay will **NOT** work on `localhost` or `http://` domains. You will see an informational message:

> "Apple Pay requires HTTPS and domain verification. Only Google Pay may be available in development."

**Options for local testing:**
1. Use Google Pay for wallet testing
2. Use regular card input for testing
3. Use ngrok tunnel (advanced - see below)
4. Test Apple Pay only in staging/production

### Production Setup (Required for Apple Pay)

Follow these steps to enable Apple Pay in production:

## Step-by-Step Production Setup

### 1. Deploy to HTTPS Domain

Apple Pay requires a production HTTPS domain. Ensure:

- ✅ Site is accessible via HTTPS
- ✅ Valid SSL certificate (not self-signed)
- ✅ No mixed content warnings
- ✅ Force redirect from HTTP to HTTPS

**Verify:** Visit your site and check for the lock icon 🔒 in the browser address bar.

### 2. Register Domain in Stripe Dashboard

#### 2a. Navigate to Stripe Dashboard

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Go to **Settings** → **Payment Methods**
3. Scroll to **Apple Pay**
4. Click **Add domain**

#### 2b. Register Your Domains

Register each domain/subdomain separately:

- `yourdomain.com`
- `www.yourdomain.com`
- `app.yourdomain.com` (if applicable)
- `staging.yourdomain.com` (for staging environment)

**Important:** Each subdomain requires separate registration!

### 3. Domain Verification File

The verification file is already included in this project at:

```
public/.well-known/apple-developer-merchantid-domain-association
```

This file is automatically served when you deploy.

**Verify it's accessible:**

```bash
curl https://yourdomain.com/.well-known/apple-developer-merchantid-domain-association
```

Should return a long hex string starting with `7B227073704964223A...`

### 4. Complete Verification in Stripe

1. Return to Stripe Dashboard → Payment Methods → Apple Pay
2. Click **Verify** next to your domain
3. Wait for verification (usually instant)
4. Status should show **"Verified"** ✅

### 5. Test Apple Pay

Test on actual Apple devices (required):

#### iPhone Testing:
1. Open Safari (not Chrome!)
2. Visit your site: `https://yourdomain.com`
3. Go to payment method selection
4. Apple Pay button should appear
5. Tap Apple Pay button
6. Complete test transaction

#### Mac Testing:
1. Open Safari (not Chrome!)
2. Visit your site: `https://yourdomain.com`
3. Go to payment method selection
4. Apple Pay button should appear
5. Click Apple Pay button
6. Use Touch ID or password to complete

### 6. Verify Payment Method Saves

After successful Apple Pay transaction:

1. Check payment methods list
2. New method should show as type: `applepay`
3. Verify it can be selected for future payments

---

## Troubleshooting

### Apple Pay Button Doesn't Appear

**Check these items:**

1. ✅ Running on HTTPS (not HTTP)
2. ✅ Using Safari on Apple device
3. ✅ Domain registered in Stripe Dashboard
4. ✅ Domain verification shows "Verified"
5. ✅ Verification file is accessible
6. ✅ User has Apple Pay set up in Wallet

**Debug steps:**

Open browser console and look for:
```javascript
PaymentRequest.canMakePayment result: { applePay: false, googlePay: true }
```

If `applePay: false`:
- Domain not verified
- Not on HTTPS
- Not using Safari
- Wallet not configured

### Apple Pay Button Appears But Fails

**Check:**

1. Stripe publishable key is correct
2. Backend accepts `applepay` payment type
3. Customer has card in Apple Wallet
4. Network requests succeed (check Network tab)

**Console logs to check:**

```javascript
// Should see these logs:
Payment Request payment method created: pm_xxxxx
Device detection - isAppleDevice: true
Saving payment method as type: applepay
Payment method saved successfully
```

### Domain Verification Fails

**Common issues:**

1. **File not accessible**
   - Verify: `curl https://yourdomain.com/.well-known/apple-developer-merchantid-domain-association`
   - Should return content, not 404

2. **Wrong file content**
   - Don't modify the verification file
   - Use exact file from this project or Stripe Dashboard

3. **Server redirects .well-known URLs**
   - Ensure no authentication required
   - Disable redirects for `.well-known` directory

4. **SSL certificate issues**
   - Certificate must be valid (not expired)
   - No mixed content warnings

5. **Need to wait**
   - Sometimes takes a few minutes
   - Retry verification after 5 minutes

### Information Messages

You may see these informational messages (not errors):

**Development (localhost):**
> "Apple Pay requires HTTPS and domain verification. Only Google Pay may be available in development."

**This is expected!** Apple Pay only works in production.

**Production without domain verification:**
> "No digital wallets (Apple Pay / Google Pay) are available on this device or browser."

**Action needed:** Complete domain verification in Stripe Dashboard.

---

## Advanced: Testing Apple Pay Locally

For advanced users who need to test Apple Pay locally:

### Option 1: Use ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start your dev server
npm run dev

# In another terminal, create HTTPS tunnel
ngrok http 5173

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

Then:
1. Register the ngrok domain in Stripe Dashboard (test mode)
2. Download verification file from Stripe
3. Place in `public/.well-known/` directory
4. Restart dev server
5. Visit ngrok URL in Safari on iPhone
6. Test Apple Pay

**Note:** ngrok domains change each restart (unless you have a paid plan)

### Option 2: Local HTTPS with mkcert

```bash
# Install mkcert
brew install mkcert

# Create local CA
mkcert -install

# Create certificate for localhost
mkcert localhost 127.0.0.1

# Update vite.config.ts to use HTTPS
# (Add server.https config with cert files)
```

**Note:** Still won't work without domain verification, but useful for testing HTTPS features.

---

## Environment-Specific Configuration

### Development (localhost)
- ❌ Apple Pay: Not available (expected)
- ✅ Google Pay: Available in Chrome
- ✅ Card Input: Available

### Staging (HTTPS domain)
- ⚠️ Apple Pay: Available after domain verification
- ✅ Google Pay: Available
- ✅ Card Input: Available

**Setup for staging:**
1. Register staging domain in Stripe **test mode**
2. Complete verification
3. Test with test Apple Pay cards

### Production (HTTPS domain)
- ✅ Apple Pay: Available after domain verification
- ✅ Google Pay: Available
- ✅ Card Input: Available

**Setup for production:**
1. Register production domain in Stripe **live mode**
2. Complete verification
3. Real Apple Pay transactions

---

## Verification Checklist

Use this checklist before deploying:

### Pre-Deployment
- [ ] Site runs on HTTPS
- [ ] SSL certificate is valid
- [ ] No mixed content warnings
- [ ] Verification file in `public/.well-known/`
- [ ] Production domain registered in Stripe Dashboard
- [ ] Staging domain registered (if using staging)

### Deployment
- [ ] Verification file deployed and accessible
- [ ] Can access: `https://yourdomain.com/.well-known/apple-developer-merchantid-domain-association`
- [ ] File returns correct content (hex string)
- [ ] No 404 or authentication errors

### Post-Deployment
- [ ] Domain verified in Stripe Dashboard (shows "Verified")
- [ ] Tested on iPhone with Safari
- [ ] Tested on Mac with Safari
- [ ] Apple Pay button appears
- [ ] Can complete test transaction
- [ ] Payment method saves as `applepay` type
- [ ] Can use saved Apple Pay method

---

## Technical Details

### What's Different About Apple Pay?

**Apple Pay uses:**
1. Domain verification via file hosting
2. Apple's secure servers for validation
3. Strict HTTPS requirements
4. Safari-specific APIs

**Google Pay uses:**
1. Browser-based Payment Request API
2. Google's servers (no domain verification)
3. Works on HTTP in development
4. Cross-browser support

### How Domain Verification Works

1. You request to register a domain in Stripe
2. Stripe provides a verification file
3. You host the file at `/.well-known/apple-developer-merchantid-domain-association`
4. Stripe calls Apple's servers to verify
5. Apple fetches the file from your domain
6. Apple confirms the domain belongs to you
7. Stripe marks domain as verified
8. Apple Pay becomes available on that domain

### Security Requirements

Apple Pay requires:
- Valid SSL certificate
- HTTPS for entire site (not just payment pages)
- No mixed content (all resources HTTPS)
- Domain must be publicly accessible
- Verification file publicly accessible (no auth)

---

## Support

### If Apple Pay Still Doesn't Work

1. **Check browser console** for error messages
2. **Check Stripe Dashboard** logs for API errors
3. **Verify domain verification** status in Stripe
4. **Test on different Apple device** if available
5. **Contact Stripe Support** with domain verification issues

### Console Logs for Support

When reporting issues, include these console logs:

```javascript
// These logs help diagnose issues:
PaymentRequest.canMakePayment result: {...}
Available digital wallets: [...]
Device detection - isAppleDevice: true/false
User Agent: Mozilla/5.0...
```

### Useful Resources

- [Stripe Apple Pay Documentation](https://docs.stripe.com/apple-pay)
- [Stripe Payment Methods Registration](https://docs.stripe.com/payments/payment-methods/pmd-registration)
- [Apple Pay Domain Verification](https://support.stripe.com/questions/enable-apple-pay-on-your-stripe-account)

---

## Summary

**Development:**
- Use Google Pay or card input
- Apple Pay will show informational message

**Production:**
1. Deploy to HTTPS domain
2. Register domain in Stripe Dashboard
3. Complete verification (file is already in project)
4. Test on Apple device with Safari
5. Apple Pay will work! 🎉

**Key Difference:**
- **Google Pay:** Works immediately, no setup
- **Apple Pay:** Requires production HTTPS domain + verification

---

**Last Updated:** December 2024
**Status:** Ready for production deployment
