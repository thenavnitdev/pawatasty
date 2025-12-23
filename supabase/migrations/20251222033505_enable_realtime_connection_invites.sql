/*
  # Enable Realtime for Connection Invites

  1. Changes
    - Enable realtime publications for connection_invites table
    - This allows clients to subscribe to INSERT events when they receive new invites
  
  2. Benefits
    - Users get instant notifications when they receive connection invites
    - No need to poll the database for new invites
    - Better user experience with real-time updates
*/

-- Enable realtime for connection_invites table
ALTER PUBLICATION supabase_realtime ADD TABLE connection_invites;
