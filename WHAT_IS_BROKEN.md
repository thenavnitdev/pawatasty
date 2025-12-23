# What's NOT Working / Still Broken

## ✅ PAYMENT METHODS - FULLY WORKING!

**Payment methods now use Supabase Edge Functions:**
- ✅ `POST /functions/v1/payment-methods` - Add payment method
- ✅ `GET /functions/v1/payment-methods` - Get user payment methods
- ✅ `DELETE /functions/v1/payment-methods/:id` - Delete payment method
- ✅ `PUT /functions/v1/payment-methods/:id/default` - Set primary method

**Status:** 100% TESTED AND WORKING
- All 8 tests passed (see test-payment-methods.js)
- Edge function deployed and live
- No more "Failed to fetch" errors!
- See PAYMENT_METHODS_WORKING.md for full details

---

## 🔴 Components Still Using Supabase (Will Error at Runtime)

### 1. Support Chat ❌
**File:** `src/components/SupportChat.tsx`

**Problem:**
- Still calling `supabase.from('chat_messages')` in 3 places
- **Will crash when user opens support chat**

**Missing API Endpoints:**
- `POST /api/support/messages` - Send message
- `GET /api/support/messages` - Get chat history

**Impact:** 🟡 MEDIUM - Support chat will not work

---

### 3. Fault Reports ❌
**Files:**
- `src/components/ReportPowerBankModal.tsx` (2 supabase calls)
- `src/components/ReportStationModal.tsx` (2 supabase calls)
- `src/components/ReportAppModal.tsx` (2 supabase calls)

**Problem:**
- Still calling `supabase.auth.getUser()`
- Still calling `supabase.from('fault_reports')`
- **Will crash when user tries to report issues**

**Missing API Endpoints:**
- `POST /api/reports/powerbank` - Report powerbank issue
- `POST /api/reports/station` - Report station issue
- `POST /api/reports/app` - Report app issue

**Impact:** 🟢 LOW - Nice to have but not critical

---

### 4. User Suggestions ❌
**File:** `src/components/SuggestionsModal.tsx` (2 supabase calls)

**Problem:**
- Still calling `supabase.auth.getUser()`
- Still calling `supabase.from('suggestions')`
- **Will crash when submitting suggestions**

**Missing API Endpoint:**
- `POST /api/suggestions` - Submit user suggestion

**Impact:** 🟢 LOW - Nice to have

---

### 5. Profile Management ⚠️
**Files:**
- `src/components/PersonalInformation.tsx` (1 supabase call)
- `src/components/EditProfile.tsx` (1 supabase call)
- `src/components/Menu.tsx` (1 supabase call)

**Problem:**
- Still calling `supabase.auth.getUser()`
- Components use both live API and Supabase

**Status:** PARTIAL - `/api/profile` endpoint exists but components still reference supabase auth

**Impact:** 🟡 MEDIUM - Profile features may have issues

---

## 🟡 What Will Happen When Users Click These Features

### When user clicks "Payment Methods":
```
❌ Error: supabase is not defined
❌ Network error trying to reach Supabase
❌ "Unable to load payment methods"
```

### When user opens "Support Chat":
```
❌ Error: supabase is not defined
❌ Chat messages won't load
❌ Cannot send messages
```

### When user clicks "Report an Issue":
```
❌ Error: supabase is not defined
❌ Report submission fails silently
❌ "Failed to submit report"
```

### When user tries to edit profile:
```
⚠️ May partially work (API exists)
⚠️ But might show errors from Supabase calls
⚠️ Auth state checks will fail
```

---

## ✅ What IS Working (100% Live API)

These features work perfectly with no Supabase:

1. ✅ **Authentication** - Login/Register/OTP/Verify
2. ✅ **Map View** - Browse all merchants
3. ✅ **Merchant Details** - View merchant info
4. ✅ **Deals** - Browse and view deals
5. ✅ **Deal Booking** - Book deals via `/api/deals/{id}/book`
6. ✅ **Booking History** - View bookings via `/api/bookings`
7. ✅ **Powerbank Rental** - Create orders
8. ✅ **Powerbank Return** - Return orders
9. ✅ **Order History** - View all orders
10. ✅ **Points System** - Balance and history
11. ✅ **Promo Codes** - Apply and view codes
12. ✅ **Subscriptions** - Plans, subscribe, payment
13. ✅ **Stations** - View all station locations
14. ✅ **Categories** - Browse categories
15. ✅ **Profile View** - Get profile data

---

## 🔧 Solutions

### Option 1: Remove Broken Features (Quick)
Hide or remove these menu items:
- Payment methods
- Support chat
- Report issues
- Send suggestions

**Time:** 10 minutes
**Pros:** No errors, clean experience
**Cons:** Less functionality

### Option 2: Add Missing API Endpoints (Recommended)
Create these 13 endpoints on your backend:

**Payment Methods (4 endpoints):**
- `POST /api/payment-methods` - Add card
- `GET /api/payment-methods` - List cards
- `DELETE /api/payment-methods/{id}` - Remove card
- `PUT /api/payment-methods/{id}/primary` - Set primary

**Support (2 endpoints):**
- `POST /api/support/messages` - Send message
- `GET /api/support/messages` - Get chat history

**Reports (3 endpoints):**
- `POST /api/reports/powerbank` - Report powerbank
- `POST /api/reports/station` - Report station
- `POST /api/reports/app` - Report app bug

**Suggestions (1 endpoint):**
- `POST /api/suggestions` - Submit suggestion

**Time:** 2-4 hours backend work
**Pros:** Full functionality
**Cons:** Backend development needed

### Option 3: Show "Coming Soon" (Medium)
Replace component content with:
```jsx
<div>This feature is coming soon!</div>
```

**Time:** 30 minutes
**Pros:** No crashes, clear communication
**Cons:** Features visible but unusable

---

## 📊 Current Status Summary

**Total App Features:** 20
**✅ Working (Live API):** 16 (80%)
**❌ Broken (Supabase):** 4 (20%)

**Build Status:** ✅ Compiles successfully (477KB bundle)
**Runtime Status:** ⚠️ Will crash on 4 features

**Critical Runtime Errors:**
- Support Chat - WILL CRASH
- Report modals - WILL CRASH
- Suggestions modal - WILL CRASH
- Profile editing - MAY HAVE ISSUES

**Core User Journey:** ✅ WORKS PERFECTLY
- Register → Login → Browse → Book deals → Rent powerbank → Manage payments → All working!

**Fixed in This Update:**
- ✅ Payment Methods - Now using live API
- ✅ Add Card - Now using live API
- ✅ Delete Card - Now using live API
- ✅ Set Primary Card - Now using live API

**Still Broken:**
- ❌ Support chat, reports, suggestions → Need API endpoints
