/*
  # Complete Rental System with Stripe Integration

  1. New Tables
    - `rental_sessions` - Tracks powerbank/item rentals
    - `rental_charges` - Records all charges (validation, usage, penalty)

  2. Pricing Logic (€0.50 validation, €1/30min, €5 daily cap, €25 penalty > 5 days)

  3. Security - RLS enabled, users access only their own rentals
*/

CREATE TABLE IF NOT EXISTS rental_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  merchant_name text,
  station_id text,
  item_id text NOT NULL,
  stripe_customer_id text,
  stripe_payment_method_id text,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue', 'cancelled')),
  validation_charge_id text,
  validation_paid boolean NOT NULL DEFAULT false,
  usage_charge_id text,
  usage_amount decimal(10, 2) DEFAULT 0,
  total_minutes integer DEFAULT 0,
  penalty_amount decimal(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rental_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_session_id uuid NOT NULL REFERENCES rental_sessions(id) ON DELETE CASCADE,
  charge_type text NOT NULL CHECK (charge_type IN ('validation', 'usage', 'penalty')),
  amount decimal(10, 2) NOT NULL,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_sessions_user_id ON rental_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_sessions_status ON rental_sessions(status);
CREATE INDEX IF NOT EXISTS idx_rental_sessions_start_time ON rental_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_rental_charges_session_id ON rental_charges(rental_session_id);
CREATE INDEX IF NOT EXISTS idx_rental_charges_stripe_pi ON rental_charges(stripe_payment_intent_id);

ALTER TABLE rental_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rental sessions"
  ON rental_sessions FOR SELECT
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create own rental sessions"
  ON rental_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update own rental sessions"
  ON rental_sessions FOR UPDATE
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can view own rental charges"
  ON rental_charges FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rental_sessions
      WHERE rental_sessions.id = rental_charges.rental_session_id
      AND rental_sessions.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "System can create rental charges"
  ON rental_charges FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rental_sessions
      WHERE rental_sessions.id = rental_charges.rental_session_id
      AND rental_sessions.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE OR REPLACE FUNCTION calculate_rental_fee(
  start_timestamp timestamptz,
  end_timestamp timestamptz
) RETURNS TABLE (
  total_minutes integer,
  usage_fee decimal,
  penalty_fee decimal,
  total_fee decimal
) AS $$
DECLARE
  duration_minutes integer;
  full_days integer;
  remaining_minutes integer;
  blocks_30min integer;
  base_fee decimal;
  daily_cap decimal := 5.00;
  penalty decimal := 0.00;
BEGIN
  duration_minutes := EXTRACT(EPOCH FROM (end_timestamp - start_timestamp)) / 60;
  full_days := duration_minutes / 1440;
  remaining_minutes := duration_minutes - (full_days * 1440);
  blocks_30min := CEIL(remaining_minutes / 30.0);
  base_fee := blocks_30min * 1.00;
  
  IF base_fee > daily_cap THEN
    base_fee := daily_cap;
  END IF;
  
  base_fee := base_fee + (full_days * daily_cap);
  
  IF duration_minutes > 7200 THEN
    penalty := 25.00;
  END IF;
  
  RETURN QUERY SELECT
    duration_minutes::integer,
    base_fee,
    penalty,
    (base_fee + penalty)::decimal;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION update_rental_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_rental_sessions_updated_at ON rental_sessions;
CREATE TRIGGER update_rental_sessions_updated_at
  BEFORE UPDATE ON rental_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_rental_session_timestamp();