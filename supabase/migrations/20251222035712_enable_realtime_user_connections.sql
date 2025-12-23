/*
  # Enable realtime for user_connections table

  1. Configuration
    - Enable realtime publications for user_connections table
    - Allow realtime subscriptions for connection changes

  2. Purpose
    - Enable real-time updates when connections are created or removed
    - Support dynamic Friends List updates
*/

-- Enable realtime for user_connections table
ALTER PUBLICATION supabase_realtime ADD TABLE user_connections;
