# Powerbank Rental Pricing Guide

## Overview

All customers can rent powerbanks with a pay-as-you-go pricing model. This applies to **Flex, Silver, and Gold** tier users.

---

## Pricing Structure

### Base Rate
- **€1.00 per 30 minutes**
- Duration automatically rounds up to the nearest 30-minute block

### Daily Cap
- **Maximum €5.00 per 24-hour period**
- Once the daily cap is reached, no additional charges apply
- A "day" is counted as 24 hours from the rental start time

### Examples

| Duration | Blocks | Regular Price | Capped Price | Customer Pays |
|----------|--------|---------------|--------------|---------------|
| 15 min   | 1      | €1.00         | €1.00        | €1.00         |
| 30 min   | 1      | €1.00         | €1.00        | €1.00         |
| 45 min   | 2      | €2.00         | €2.00        | €2.00         |
| 60 min   | 2      | €2.00         | €2.00        | €2.00         |
| 90 min   | 3      | €3.00         | €3.00        | €3.00         |
| 2 hours  | 4      | €4.00         | €4.00        | €4.00         |
| 3 hours  | 6      | €6.00         | €5.00        | **€5.00** ✅  |
| 6 hours  | 12     | €12.00        | €5.00        | **€5.00** ✅  |
| 12 hours | 24     | €24.00        | €5.00        | **€5.00** ✅  |
| 24 hours | 48     | €48.00        | €5.00        | **€5.00** ✅  |

---

## Payment Flow

### 1. Rental Start
**Immediate Charge: €1.00**
- This covers the first 30 minutes of usage
- Payment is processed instantly before powerbank is unlocked
- If payment fails, rental cannot start

### 2. During Rental
- No additional charges while rental is active
- User can keep powerbank as long as needed
- Timer starts from the moment powerbank is unlocked

### 3. Rental End (Return)
**Additional Charge: Variable**
- System calculates total duration in minutes
- Rounds up to nearest 30-minute block
- Applies daily cap if duration exceeds 2.5 hours
- Charges difference between €1.00 already paid and total amount
- If duration ≤ 30 minutes: **No additional charge**

### Payment Examples

**Scenario A: 20-minute rental**
- Start: €1.00 charged (covers first 30 min)
- End: €0.00 charged (within included time)
- **Total: €1.00**

**Scenario B: 45-minute rental**
- Start: €1.00 charged (covers first 30 min)
- End: €1.00 charged (1 additional block)
- **Total: €2.00**

**Scenario C: 5-hour rental**
- Start: €1.00 charged
- End: €4.00 charged (€5.00 cap - €1.00 already paid)
- **Total: €5.00** (daily cap reached)

**Scenario D: 26-hour rental**
- Start: €1.00 charged
- End: €9.00 charged (2 days × €5.00 - €1.00 already paid)
- **Total: €10.00** (2 × daily cap)

---

## Late Return Penalty

### 5-Day Rule
If powerbank is **not returned within 5 days**, it is considered **purchased** by the customer.

### Penalty Breakdown
- **5 days rental fee:** €25.00 (5 days × €5.00 daily cap)
- **Purchase penalty:** €25.00 (powerbank replacement cost)
- **Total penalty:** **€50.00**

### Timeline
| Day | Action | Charge |
|-----|--------|--------|
| Day 1 | Rental active | €5.00 (daily cap) |
| Day 2 | Rental active | €5.00 (daily cap) |
| Day 3 | Rental active | €5.00 (daily cap) |
| Day 4 | Rental active | €5.00 (daily cap) |
| Day 5 | Rental active | €5.00 (daily cap) |
| Day 6+ | **Penalty Applied** | **€50.00** (€25 rental + €25 penalty) |

### When Penalty Applies
- Powerbank not returned after 5 full days (120 hours)
- Automatic charge to payment method on file
- Rental status changed to "purchased"
- Customer keeps the powerbank

---

## Stripe Payment Metadata

All rental charges include metadata for tracking:

### Rental Start (€1.00)
```json
{
  "type": "flex_rental_validation",
  "user_id": "user-uuid",
  "powerbank_id": "pb-123",
  "station_id": "station-456"
}
```

### Rental End - Normal Usage
```json
{
  "type": "flex_rental_usage",
  "user_id": "user-uuid",
  "rental_id": "rental-789",
  "duration_minutes": "45",
  "is_late_penalty": "false",
  "is_purchase": "false"
}
```

### Rental End - Late Penalty
```json
{
  "type": "flex_rental_penalty",
  "user_id": "user-uuid",
  "rental_id": "rental-789",
  "duration_minutes": "7200",
  "is_late_penalty": "true",
  "is_purchase": "true"
}
```

---

## Subscriber Benefits

### Silver & Gold Tiers
While Silver and Gold subscribers receive other benefits (free membership features, discounts on deals, etc.), **powerbank rentals are charged the same for all users**.

**Why?**
- Powerbanks have a physical cost (wear, replacement)
- Daily cap ensures fair pricing for heavy users
- €5.00/day is already a heavily discounted rate

**Exception:**
Future subscription updates may include free rental minutes or discounts. Check current membership benefits for details.

---

## API Endpoints

### Start Rental
**POST** `/functions/v1/rental-management/start`

Request:
```json
{
  "powerbankId": "pb-123",
  "stationId": "station-456",
  "paymentMethodId": "pm_xxx" // optional, uses primary if not provided
}
```

Response:
```json
{
  "success": true,
  "rental": {
    "id": "rental-789",
    "validationFeeCharged": true,
    "validationAmount": 1.00,
    "includedMinutes": 30,
    "pricing": {
      "ratePerHalfHour": "€1.00",
      "dailyCap": "€5.00",
      "dailyCapHours": 24,
      "latePenaltyDays": 5,
      "latePenaltyAmount": "€50.00 (€25 rental + €25 purchase penalty)"
    }
  }
}
```

### End Rental
**POST** `/functions/v1/rental-management/end`

Request:
```json
{
  "rentalId": "rental-789",
  "returnStationId": "station-999"
}
```

Response (Normal):
```json
{
  "success": true,
  "rental": {
    "durationMinutes": 45,
    "validationFeePaid": 1.00,
    "additionalCharge": 1.00,
    "totalCharge": 2.00,
    "isLatePenalty": false,
    "isPurchase": false,
    "breakdown": {
      "blocks": 2,
      "ratePerBlock": 1.00,
      "cappedAtDaily": false,
      "dailyCap": 5.00
    }
  }
}
```

Response (Late Penalty):
```json
{
  "success": true,
  "rental": {
    "durationMinutes": 7200,
    "validationFeePaid": 1.00,
    "additionalCharge": 49.00,
    "totalCharge": 50.00,
    "isLatePenalty": true,
    "isPurchase": true,
    "breakdown": {
      "rentalDays": 5,
      "rentalFee": 25.00,
      "purchasePenalty": 25.00,
      "total": 50.00,
      "note": "Powerbank not returned within 5 days - considered purchased"
    }
  }
}
```

---

## Testing

### Test Scenarios

1. **Quick Return (< 30 min)**
   - Start rental → Return within 30 minutes
   - Verify only €1.00 charged

2. **Standard Return (45 min)**
   - Start rental → Return after 45 minutes
   - Verify €2.00 total (€1.00 + €1.00)

3. **Daily Cap Test (3 hours)**
   - Start rental → Return after 3 hours
   - Verify €5.00 total (capped)

4. **Multi-Day Test (26 hours)**
   - Start rental → Return after 26 hours
   - Verify €10.00 total (2 × daily cap)

5. **Late Penalty Test (6 days)**
   - Start rental → Don't return for 6 days
   - Verify €50.00 penalty charged

### Stripe Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

---

## FAQ

**Q: Why am I charged €1.00 immediately?**
A: The €1.00 upfront fee covers your first 30 minutes and validates your payment method.

**Q: What if I return it in 20 minutes?**
A: You only pay the €1.00 validation fee. No additional charges.

**Q: Is there a maximum rental time?**
A: You can rent for as long as you need, but after 5 days, the powerbank is considered purchased (€50.00 penalty).

**Q: Do Gold members get free rentals?**
A: Currently, all users pay the same rental rates. Check your membership benefits for any updates.

**Q: What happens if my payment fails?**
A: The rental cannot start without a successful €1.00 validation charge. Please update your payment method.

**Q: Can I dispute a late penalty?**
A: Contact support if you believe the penalty was applied in error. Include your rental ID and explanation.

---

## Summary

- **€1.00 per 30 minutes** (rounded up)
- **€5.00 daily cap** (per 24-hour period)
- **€50.00 penalty** for not returning within 5 days
- Applies to **all users** (Flex, Silver, Gold)
- Charges appear immediately in Stripe Dashboard
- All charges include metadata for easy tracking
