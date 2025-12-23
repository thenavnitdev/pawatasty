# Edge Functions API Documentation

This document provides a complete reference for all Supabase Edge Functions in the application.

## Table of Contents
- [Public APIs (No Auth)](#public-apis-no-auth)
- [Authenticated APIs](#authenticated-apis)
- [Feature Flags](#feature-flags)

---

## Public APIs (No Auth)

### 1. Merchants API
**Endpoint:** `{SUPABASE_URL}/functions/v1/merchants`

#### GET /merchants
Get all merchants or filter by location.

**Query Parameters:**
- `lat` (optional): Latitude for location-based search
- `lng` (optional): Longitude for location-based search
- `radius` (optional): Search radius in meters (default: 5000)

**Response:**
```json
[
  {
    "id": "string",
    "merchantId": "string",
    "companyName": "string",
    "companyDescription": "string",
    "businessCategory": "string",
    "address": "string",
    "latitude": number,
    "longitude": number,
    "phoneNr": "string",
    "website": "string",
    "openDays": "string",
    "openTime": "string",
    "logoId": "string",
    "coverImageIds": ["string"],
    "rating": number,
    "distance": number,
    "deals": [...]
  }
]
```

#### GET /merchants/:merchantId
Get a specific merchant by ID with all deals.

**Response:**
```json
{
  "id": "string",
  "merchantId": "string",
  "companyName": "string",
  "deals": [
    {
      "id": "string",
      "merchantId": "string",
      "title": "string",
      "description": "string",
      "discount": "string",
      "validFrom": "date",
      "validUntil": "date",
      "terms": "string",
      "imageUrl": "string"
    }
  ]
}
```

---

### 2. Stations API
**Endpoint:** `{SUPABASE_URL}/functions/v1/stations`

#### GET /stations
Get all stations or filter by location.

**Query Parameters:**
- `lat` (optional): Latitude for location-based search
- `lng` (optional): Longitude for location-based search
- `radius` (optional): Search radius in meters (default: 5000)

**Response:**
```json
[
  {
    "id": "string",
    "name": "string",
    "address": "string",
    "latitude": number,
    "longitude": number,
    "totalSlots": number,
    "availableSlots": number,
    "powerbankCapacity": number,
    "status": "active|inactive",
    "merchantId": "string",
    "merchant": {
      "id": "string",
      "name": "string"
    },
    "distance": number
  }
]
```

#### GET /stations/:stationId
Get a specific station by ID.

---

### 3. Categories API
**Endpoint:** `{SUPABASE_URL}/functions/v1/categories`

#### GET /categories
Get all merchant categories.

**Response:**
```json
[
  {
    "id": number,
    "name": "string",
    "slug": "string",
    "description": "string",
    "iconUrl": "string",
    "sortOrder": number
  }
]
```

---

## Authenticated APIs

All authenticated APIs require the following headers:
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

### 4. Deals Booking API
**Endpoint:** `{SUPABASE_URL}/functions/v1/deals-booking`

#### POST /deals-booking/:dealId/book
Book a specific deal.

**Request Body:**
```json
{
  "guests": number,
  "date": "YYYY-MM-DD",
  "time": "HH:MM"
}
```

**Response:**
```json
{
  "bookingId": "string",
  "status": "confirmed",
  "message": "Booking confirmed"
}
```

#### GET /deals-booking/bookings
Get all user bookings.

**Response:**
```json
[
  {
    "id": "string",
    "dealId": "string",
    "merchantId": "string",
    "guests": number,
    "date": "date",
    "time": "time",
    "status": "confirmed|cancelled|completed"
  }
]
```

---

### 5. Orders Management API
**Endpoint:** `{SUPABASE_URL}/functions/v1/orders-management`

#### GET /orders-management
Get all user orders.

**Response:**
```json
[
  {
    "orderId": "string",
    "stationId": "string",
    "pickupTime": "datetime",
    "returnTime": "datetime",
    "status": "active|completed|overdue",
    "totalCost": number
  }
]
```

#### POST /orders-management
Create a new powerbank rental order.

**Request Body:**
```json
{
  "stationId": "string"
}
```

#### PUT /orders-management/:orderId/return
Return a powerbank.

**Request Body:**
```json
{
  "returnStationId": "string"
}
```

---

### 6. Liked Merchants API
**Endpoint:** `{SUPABASE_URL}/functions/v1/liked-merchants`

#### GET /liked-merchants
Get all liked merchants for the user.

**Response:**
```json
[
  {
    "id": "string",
    "merchantId": "string",
    "merchant": {
      "companyName": "string",
      "address": "string",
      "rating": number
    },
    "likedAt": "datetime"
  }
]
```

#### POST /liked-merchants
Add a merchant to favorites.

**Request Body:**
```json
{
  "merchantId": "string"
}
```

#### DELETE /liked-merchants/:merchantId
Remove a merchant from favorites.

---

### 7. User Profile API
**Endpoint:** `{SUPABASE_URL}/functions/v1/user-profile`

#### GET /user-profile
Get current user profile.

**Response:**
```json
{
  "userId": "string",
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phoneNumber": "string",
  "gender": "string",
  "membershipLevel": "flex|silver|gold"
}
```

#### PUT /user-profile
Update user profile.

**Request Body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "phoneNumber": "string",
  "gender": "male|female|other"
}
```

#### DELETE /user-profile
Delete user account.

---

### 8. Subscriptions API
**Endpoint:** `{SUPABASE_URL}/functions/v1/subscriptions`

#### GET /subscriptions/plans
Get all available subscription plans.

**Response:**
```json
[
  {
    "id": number,
    "name": "string",
    "type": "per_use|monthly|yearly",
    "price": "string",
    "minutes": number,
    "dailyFreeMinutes": "string",
    "features": ["string"],
    "penaltyFee": number
  }
]
```

#### GET /subscriptions
Get user's active subscription.

**Response:**
```json
{
  "id": "string",
  "planId": number,
  "status": "active|cancelled|expired",
  "startDate": "date",
  "endDate": "date",
  "plan": {
    "name": "string",
    "price": "string"
  }
}
```

#### POST /subscriptions
Subscribe to a plan.

**Request Body:**
```json
{
  "planId": number,
  "paymentMethodId": "string"
}
```

#### DELETE /subscriptions/:subscriptionId
Cancel a subscription.

---

### 9. Reviews API
**Endpoint:** `{SUPABASE_URL}/functions/v1/reviews`

#### GET /reviews?merchantId={merchantId}
Get all reviews for a merchant.

**Response:**
```json
[
  {
    "id": "string",
    "merchantId": "string",
    "userId": "string",
    "rating": number,
    "comment": "string",
    "createdAt": "datetime",
    "user": {
      "firstName": "string",
      "lastName": "string"
    }
  }
]
```

#### POST /reviews
Create a new review.

**Request Body:**
```json
{
  "merchantId": "string",
  "rating": number,
  "comment": "string"
}
```

#### PUT /reviews/:reviewId
Update a review.

**Request Body:**
```json
{
  "rating": number,
  "comment": "string"
}
```

#### DELETE /reviews/:reviewId
Delete a review.

---

## Pre-existing Authenticated APIs

### 10. Payment Methods API
**Endpoint:** `{SUPABASE_URL}/functions/v1/payment-methods`
Manage user payment methods (cards, bank accounts).

### 11. Points Balance API
**Endpoint:** `{SUPABASE_URL}/functions/v1/points-balance`
Get user loyalty points balance.

### 12. Points Transactions API
**Endpoint:** `{SUPABASE_URL}/functions/v1/points-transactions`
Get user points transaction history.

### 13. Promo Codes API
**Endpoint:** `{SUPABASE_URL}/functions/v1/user-promo-code`
Get user promo codes.

**Endpoint:** `{SUPABASE_URL}/functions/v1/apply-promo-code`
Apply a promo code.

### 14. Support Chat API
**Endpoint:** `{SUPABASE_URL}/functions/v1/support-chat`
Manage support chat messages.

### 15. Fault Reports API
**Endpoint:** `{SUPABASE_URL}/functions/v1/fault-reports`
Report issues with stations or powerbanks.

### 16. Suggestions API
**Endpoint:** `{SUPABASE_URL}/functions/v1/suggestions`
Submit user suggestions and feedback.

### 17. Image Proxy API
**Endpoint:** `{SUPABASE_URL}/functions/v1/image-proxy`
Proxy and optimize images from external sources.

---

## Feature Flags

Control which APIs are used via `/src/services/apiConfig.ts`:

```typescript
export const API_FEATURES = {
  USE_EDGE_MERCHANTS: true,
  USE_EDGE_STATIONS: true,
  USE_EDGE_CATEGORIES: true,
  USE_EDGE_DEALS: true,
  USE_EDGE_ORDERS: true,
  USE_EDGE_LIKED_MERCHANTS: true,
  USE_EDGE_PROFILE: true,
  USE_EDGE_SUBSCRIPTIONS: true,
  USE_EDGE_REVIEWS: true,
};
```

Set any flag to `false` to use the legacy external API for that feature.

---

## Error Handling

All APIs return errors in the following format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

---

## Environment Variables

Required environment variables (automatically configured in Supabase):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)

Frontend usage:
```typescript
const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/{function-name}`;
```
