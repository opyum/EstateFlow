# Stripe Integration Design

## Overview

Integration of Stripe payment system for EstateFlow with:
- Free trial: 1 deal without subscription (no time limit)
- Monthly plan: 49€/month
- Annual plan: 470€/year (~20% discount)

## Pricing Model

| Plan | Price | Billing |
|------|-------|---------|
| Trial | Free | 1 deal max |
| Monthly | 49€ | Recurring monthly |
| Annual | 470€ | Recurring yearly |

---

## Stripe Dashboard Tasks

### 1. Create Product
- Navigate to Products → Add product
- Name: "EstateFlow Pro"
- Description: "Full access to EstateFlow"

### 2. Create Prices (on same product)
- Monthly: 49€, recurring monthly → note `price_id`
- Annual: 470€, recurring yearly → note `price_id`

### 3. Configure Webhook
- Navigate to Developers → Webhooks → Add endpoint
- URL: `https://your-domain.com/api/stripe/webhook`
- Events to select:
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.deleted`
  - `customer.subscription.updated`
- Note the `webhook secret` (whsec_xxx)

### 4. Environment Variables
```env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID_MONTHLY=price_xxx_monthly
STRIPE_PRICE_ID_YEARLY=price_xxx_yearly
```

---

## Backend Tasks (.NET)

### 1. Modify StripeController for 2 plans
- Add `_stripePriceIdYearly` variable
- Modify `POST /api/stripe/checkout` to accept `plan` parameter ("monthly" or "yearly")
- Use correct `price_id` based on selected plan

**Request:**
```json
POST /api/stripe/checkout
{ "plan": "monthly" | "yearly" }
```

### 2. Add "1 free deal" limitation
- Modify `DealsController.Create()`:
  - If `agent.SubscriptionStatus != Active` AND `agent.Deals.Count >= 1` → return 403 error
- Add endpoint `GET /api/agents/me/can-create-deal` (optional, for frontend)

### 3. Add detailed subscription status endpoint
- `GET /api/stripe/subscription` → returns current plan (monthly/yearly), renewal date, etc.

**Response:**
```json
{
  "status": "active" | "trial" | "cancelled",
  "plan": "monthly" | "yearly" | null,
  "currentPeriodEnd": "2026-02-08T00:00:00Z",
  "cancelAtPeriodEnd": false
}
```

### 4. Handle `customer.subscription.updated` webhook
- Add handling for plan changes (monthly ↔ yearly)

---

## Frontend Tasks (Next.js)

### 1. Modify `/dashboard/subscription` page
- Add plan selector (Monthly/Annual toggle)
- Display both prices: 49€/month and 470€/year with "-20%" badge
- Pass `plan` parameter to checkout API

### 2. Modify `lib/api.ts`
```typescript
createCheckout: (token: string, plan: 'monthly' | 'yearly') =>
  apiFetch<{ url: string }>('/api/stripe/checkout', {
    token,
    method: 'POST',
    body: JSON.stringify({ plan }),
  }),
```

### 3. Block deal creation if limit reached
- In `/dashboard/deals/new`, check if user can create deal
- If not subscribed and already has 1 deal → show message with link to subscription page
- Optional: add `useCanCreateDeal()` hook

### 4. Display subscription status in dashboard
- Add banner if `subscriptionStatus === 'Trial'` and 1 deal already exists
- Message: "Upgrade to Pro to create more transactions"

---

## Implementation Checklist

### Stripe Dashboard
- [ ] Create "EstateFlow Pro" product
- [ ] Create monthly price (49€)
- [ ] Create annual price (470€)
- [ ] Configure webhook endpoint
- [ ] Note all IDs and secrets

### Backend
- [ ] Add `STRIPE_PRICE_ID_YEARLY` environment variable
- [ ] Modify `StripeController.CreateCheckoutSession()` for plan selection
- [ ] Add deal creation limit check in `DealsController`
- [ ] Add `GET /api/stripe/subscription` endpoint
- [ ] Handle `customer.subscription.updated` webhook

### Frontend
- [ ] Update subscription page with plan toggle
- [ ] Modify `stripeApi.createCheckout()` signature
- [ ] Add deal creation blocking logic
- [ ] Add upgrade banner in dashboard

---

## Files to Modify

### Backend
- `Controllers/StripeController.cs`
- `Controllers/DealsController.cs`

### Frontend
- `app/dashboard/subscription/page.tsx`
- `app/dashboard/deals/new/page.tsx`
- `lib/api.ts`

---

## Testing Checklist

- [ ] Create checkout session with monthly plan
- [ ] Create checkout session with annual plan
- [ ] Complete payment in Stripe test mode
- [ ] Verify webhook updates subscription status
- [ ] Verify deal creation blocked after 1 deal (trial)
- [ ] Verify deal creation allowed after subscription
- [ ] Test subscription cancellation
- [ ] Test plan change (monthly → annual)
