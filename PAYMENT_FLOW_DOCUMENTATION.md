# Payment Flow Documentation

## Overview

This document explains the three distinct payment flows in the system. Each flow has different charging logic based on the context.

---

## 1. Adding Payment Method (Validation Only)

**When:** User adds a new payment method to their account (without making a purchase)

**Charge:** **€0.01 validation fee**

**Purpose:** Verify the payment method is valid and can process charges

**Implementation:** `supabase/functions/payment-methods/index.ts` (lines 1203-1265)

**Flow:**
1. User adds a card or SEPA payment method
2. System charges **€0.01** to validate the payment method
3. If successful, payment method is saved as "active"
4. If failed, payment method is deleted and error returned

**Metadata:**
- `type`: `payment_method_validation`
- Description: "Payment method validation charge (€0.01)"

---

## 2. Subscription Payments (Silver/Gold Plans)

**When:** User subscribes to Silver or Gold membership plan

**Charge:** **Full package price upfront immediately**

**Examples:**
- Silver Monthly: €9.99 charged immediately
- Gold Monthly: €19.99 charged immediately
- Silver Annual: €99 charged immediately
- Gold Annual: €199 charged immediately

**Implementation:** `supabase/functions/subscription-payment/index.ts` (lines 118-129)

**Flow:**
1. User selects a subscription plan (Silver/Gold, Monthly/Annual)
2. System creates PaymentIntent for **full subscription amount**
3. User completes payment
4. System verifies payment succeeded
5. User membership is updated to Silver/Gold tier
6. Subscription period starts (1 month or 1 year)

**Metadata:**
- `type`: `subscription_payment`
- Description: "{Plan} subscription - {frequency} - Full payment upfront"

**Benefits:**
- Silver: 1 free rental per day
- Gold: Unlimited free rentals

---

## 3. Flex Plan Rentals (Pay-As-You-Go)

**When:** Flex plan user rents a power bank

**Charges:** **Two-part payment system**

### Part 1: Upfront Validation Fee
**Amount:** **€1.00** (charged at rental start)

**Covers:** First 30 minutes of usage

**Implementation:** `supabase/functions/rental-management/index.ts` (lines 189-243)

**Metadata:**
- `type`: `flex_rental_validation`
- Description: "Flex Plan - €1.00 rental fee (includes first 30 minutes)"

### Part 2: Usage Fee
**Amount:** Variable (charged at rental end, only if usage exceeds 30 minutes)

**Calculation:**
- Total rental time calculated
- Subtract 30 minutes (already covered by €1.00 validation)
- Charge for remaining time based on usage rate
- Apply daily cap if applicable

**Implementation:** `supabase/functions/rental-management/index.ts` (lines 340-397)

**Example Scenarios:**

| Rental Duration | Validation Fee | Usage Fee | Total Charged |
|----------------|----------------|-----------|---------------|
| 20 minutes | €1.00 | €0.00 | **€1.00** |
| 30 minutes | €1.00 | €0.00 | **€1.00** |
| 45 minutes | €1.00 | €0.50* | **€1.50** |
| 60 minutes | €1.00 | €1.00* | **€2.00** |
| 90 minutes | €1.00 | €2.00* | **€3.00** |

*Assuming €1.00 per 30-minute interval for usage beyond first 30 minutes

**Metadata:**
- `type`: `flex_rental_usage`
- Description: "Flex Plan - Additional usage: {X} minutes beyond included 30 minutes"

---

## Silver/Gold Free Rentals

**When:** Silver/Gold member uses their daily free rental

**Charge:** **€0.00** (completely free)

**Validation:**
- No upfront charge
- No usage charge at end
- Free rental flag tracked in database
- Resets daily at midnight

**Note:** Silver gets 1 free rental per day, Gold gets unlimited free rentals

---

## Summary Table

| Scenario | Upfront Charge | End Charge | Total |
|----------|----------------|------------|-------|
| **Adding Payment Method** | €0.01 | - | **€0.01** |
| **Silver/Gold Subscription** | Full price | - | **Full price** |
| **Flex Rental (≤30 min)** | €1.00 | €0.00 | **€1.00** |
| **Flex Rental (>30 min)** | €1.00 | Variable | **€1.00 + usage** |
| **Silver/Gold Free Rental** | €0.00 | €0.00 | **€0.00** |

---

## Stripe Payment Intent Metadata Types

For tracking and reconciliation, each payment has a distinct metadata type:

1. `payment_method_validation` - Adding payment method (€0.01)
2. `subscription_payment` - Subscription purchase (full amount)
3. `flex_rental_validation` - Flex rental start (€1.00)
4. `flex_rental_usage` - Flex rental additional usage (variable)

---

## Testing Stripe Webhooks

To handle payment events, you'll need to set up the `stripe-webhook` edge function to handle events like:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `setup_intent.succeeded`

See `supabase/functions/stripe-webhook/index.ts` for webhook handling.
