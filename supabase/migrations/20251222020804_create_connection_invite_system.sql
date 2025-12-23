/*
  # Create Connection Invite System

  1. New Tables
    - `connection_invites`
      - `id` (bigserial, primary key)
      - `sender_user_id` (text, references users.user_id)
      - `sender_link_id` (text, the sender's Link ID for display)
      - `sender_name` (text, sender's full name for display)
      - `recipient_user_id` (text, references users.user_id)
      - `status` (text: 'pending', 'accepted', 'ignored')
      - `created_at` (timestamptz)
      - `responded_at` (timestamptz, nullable)

    - `user_connections`
      - `id` (bigserial, primary key)
      - `user_id_1` (text, references users.user_id)
      - `user_id_2` (text, references users.user_id)
      - `created_at` (timestamptz)
      - Unique constraint on user pairs (bidirectional)

  2. Security
    - Enable RLS on both tables
    - Users can read their own sent/received invites
    - Users can create invites
    - Users can update status of invites they received
    - Users can read their own connections

  3. Indexes
    - Fast lookup by recipient and status
    - Fast lookup of connections by user_id
*/

-- Create connection_invites table
CREATE TABLE IF NOT EXISTS connection_invites (
  id bigserial PRIMARY KEY,
  sender_user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  sender_link_id text NOT NULL,
  sender_name text NOT NULL,
  recipient_user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'ignored')),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT no_self_invite CHECK (sender_user_id != recipient_user_id)
);

-- Create indexes for connection_invites
CREATE INDEX IF NOT EXISTS idx_connection_invites_recipient ON connection_invites(recipient_user_id, status);
CREATE INDEX IF NOT EXISTS idx_connection_invites_sender ON connection_invites(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_connection_invites_created_at ON connection_invites(created_at DESC);

-- Create user_connections table
CREATE TABLE IF NOT EXISTS user_connections (
  id bigserial PRIMARY KEY,
  user_id_1 text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  user_id_2 text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_connection CHECK (user_id_1 != user_id_2),
  CONSTRAINT unique_connection UNIQUE (user_id_1, user_id_2)
);

-- Create indexes for user_connections
CREATE INDEX IF NOT EXISTS idx_user_connections_user1 ON user_connections(user_id_1);
CREATE INDEX IF NOT EXISTS idx_user_connections_user2 ON user_connections(user_id_2);

-- Enable RLS
ALTER TABLE connection_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for connection_invites

-- Users can view invites they sent
CREATE POLICY "Users can view sent invites"
  ON connection_invites
  FOR SELECT
  TO authenticated
  USING (sender_user_id = auth.uid()::text);

-- Users can view invites they received
CREATE POLICY "Users can view received invites"
  ON connection_invites
  FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid()::text);

-- Users can send invites
CREATE POLICY "Users can send invites"
  ON connection_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_user_id = auth.uid()::text);

-- Users can update invites they received (to accept/ignore)
CREATE POLICY "Users can respond to received invites"
  ON connection_invites
  FOR UPDATE
  TO authenticated
  USING (recipient_user_id = auth.uid()::text)
  WITH CHECK (recipient_user_id = auth.uid()::text);

-- RLS Policies for user_connections

-- Users can view their connections
CREATE POLICY "Users can view their connections"
  ON user_connections
  FOR SELECT
  TO authenticated
  USING (user_id_1 = auth.uid()::text OR user_id_2 = auth.uid()::text);

-- Users can create connections (through invite acceptance)
CREATE POLICY "Users can create connections"
  ON user_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id_1 = auth.uid()::text OR user_id_2 = auth.uid()::text);

-- Function to create bidirectional connection
CREATE OR REPLACE FUNCTION create_user_connection(uid1 text, uid2 text)
RETURNS bigint AS $$
DECLARE
  connection_id bigint;
  smaller_id text;
  larger_id text;
BEGIN
  -- Always store with smaller text first for consistency
  IF uid1 < uid2 THEN
    smaller_id := uid1;
    larger_id := uid2;
  ELSE
    smaller_id := uid2;
    larger_id := uid1;
  END IF;

  -- Insert or get existing connection
  INSERT INTO user_connections (user_id_1, user_id_2)
  VALUES (smaller_id, larger_id)
  ON CONFLICT (user_id_1, user_id_2) DO NOTHING
  RETURNING id INTO connection_id;

  -- If no row was inserted (connection exists), get the existing ID
  IF connection_id IS NULL THEN
    SELECT id INTO connection_id
    FROM user_connections
    WHERE user_id_1 = smaller_id AND user_id_2 = larger_id;
  END IF;

  RETURN connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;