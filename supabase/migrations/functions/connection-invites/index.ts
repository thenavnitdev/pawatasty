import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname.split('/').pop();

    // GET /pending - Get pending invites for current user
    if (method === 'GET' && path === 'pending') {
      const { data: invites, error } = await supabase
        .from('connection_invites')
        .select('*')
        .eq('recipient_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get pending invites error:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, invites: invites || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /sent - Get sent invites
    if (method === 'GET' && path === 'sent') {
      const { data: invites, error } = await supabase
        .from('connection_invites')
        .select('*')
        .eq('sender_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get sent invites error:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, invites: invites || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /send - Send a connection invite
    if (method === 'POST' && path === 'send') {
      const body = await req.json();
      const { recipientLinkId } = body;

      console.log('Send invite request:', { userId: user.id, recipientLinkId });

      if (!recipientLinkId || recipientLinkId.length !== 6) {
        return new Response(
          JSON.stringify({ success: false, error: 'Valid 6-character Link ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get sender info
      const { data: senderProfile, error: senderError } = await supabase
        .from('users')
        .select('full_name, link_id')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('Sender profile query:', { userId: user.id, senderProfile, senderError });

      if (senderError) {
        console.error('Sender profile error:', senderError);
        return new Response(
          JSON.stringify({ success: false, error: `Sender profile error: ${senderError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!senderProfile) {
        return new Response(
          JSON.stringify({ success: false, error: 'Sender profile not found. Please complete your profile first.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find recipient by link_id
      const { data: recipientProfile, error: recipientError } = await supabase
        .from('users')
        .select('user_id, full_name, link_id')
        .eq('link_id', recipientLinkId.toUpperCase())
        .maybeSingle();

      console.log('Recipient profile query:', { linkId: recipientLinkId.toUpperCase(), recipientProfile, recipientError });

      if (recipientError) {
        console.error('Recipient profile error:', recipientError);
        return new Response(
          JSON.stringify({ success: false, error: `Recipient lookup error: ${recipientError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!recipientProfile) {
        return new Response(
          JSON.stringify({ success: false, error: 'User with this Link ID not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if trying to invite self
      if (recipientProfile.user_id === user.id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Cannot send invite to yourself' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if already connected
      const { data: existingConnection, error: connectionCheckError } = await supabase
        .from('user_connections')
        .select('id')
        .or(`and(user_id_1.eq.${user.id},user_id_2.eq.${recipientProfile.user_id}),and(user_id_1.eq.${recipientProfile.user_id},user_id_2.eq.${user.id})`)
        .maybeSingle();

      if (connectionCheckError) {
        console.error('Connection check error:', connectionCheckError);
      }

      if (existingConnection) {
        return new Response(
          JSON.stringify({ success: false, error: 'Already connected with this user' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if invite already exists
      const { data: existingInvite, error: inviteCheckError } = await supabase
        .from('connection_invites')
        .select('id, status')
        .eq('sender_user_id', user.id)
        .eq('recipient_user_id', recipientProfile.user_id)
        .eq('status', 'pending')
        .maybeSingle();

      if (inviteCheckError) {
        console.error('Invite check error:', inviteCheckError);
      }

      if (existingInvite) {
        return new Response(
          JSON.stringify({ success: false, error: 'Pending invite already sent to this user' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create the invite
      const { data: invite, error: inviteError } = await supabase
        .from('connection_invites')
        .insert({
          sender_user_id: user.id,
          sender_link_id: senderProfile.link_id,
          sender_name: senderProfile.full_name,
          recipient_user_id: recipientProfile.user_id,
          status: 'pending',
        })
        .select()
        .single();

      if (inviteError) {
        console.error('Create invite error:', inviteError);
        return new Response(
          JSON.stringify({ success: false, error: `Failed to create invite: ${inviteError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Invite created successfully:', invite);

      return new Response(
        JSON.stringify({ 
          success: true, 
          invite,
          message: 'Connection invite sent successfully'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /respond - Accept or ignore an invite
    if (method === 'POST' && path === 'respond') {
      const body = await req.json();
      const { inviteId, action } = body;

      console.log('Respond to invite request:', { inviteId, action, userId: user.id });

      if (!inviteId || !action || !['accept', 'ignore'].includes(action)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid request. Provide inviteId and action (accept/ignore)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the invite
      const { data: invite, error: inviteError } = await supabase
        .from('connection_invites')
        .select('*')
        .eq('id', inviteId)
        .eq('recipient_user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      console.log('Invite lookup result:', { invite, inviteError });

      if (inviteError || !invite) {
        console.error('Invite not found:', { inviteId, userId: user.id, inviteError });
        return new Response(
          JSON.stringify({ success: false, error: 'Invite not found or already responded' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update invite status
      const newStatus = action === 'accept' ? 'accepted' : 'ignored';
      console.log('Updating invite status:', { inviteId, newStatus });

      const { error: updateError } = await supabase
        .from('connection_invites')
        .update({
          status: newStatus,
          responded_at: new Date().toISOString()
        })
        .eq('id', inviteId);

      console.log('Update result:', { updateError });

      if (updateError) {
        console.error('Update invite error:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If accepted, create the connection
      if (action === 'accept') {
        const { data: connection, error: connectionError } = await supabase
          .rpc('create_user_connection', {
            uid1: invite.sender_user_id,
            uid2: invite.recipient_user_id
          });

        if (connectionError) {
          console.error('Create connection error:', connectionError);
          return new Response(
            JSON.stringify({ success: false, error: connectionError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Connection established successfully',
            connectionId: connection
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Invite ignored'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /connections - Get user's connections
    if (method === 'GET' && path === 'connections') {
      const { data: connections, error } = await supabase
        .from('user_connections')
        .select('*')
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

      if (error) {
        console.error('Get connections error:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get connected user profiles
      const connectionUserIds = connections?.map(c =>
        c.user_id_1 === user.id ? c.user_id_2 : c.user_id_1
      ) || [];

      if (connectionUserIds.length === 0) {
        return new Response(
          JSON.stringify({ success: true, connections: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('user_id, full_name, link_id, profile_picture')
        .in('user_id', connectionUserIds);

      if (usersError) {
        console.error('Get connected users error:', usersError);
        return new Response(
          JSON.stringify({ success: false, error: usersError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, connections: users || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /remove - Remove a connection
    if (method === 'DELETE' && path === 'remove') {
      const body = await req.json();
      const { userId } = body;

      console.log('Remove connection request:', { currentUser: user.id, targetUser: userId });

      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'User ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete the connection (check both directions)
      const { error: deleteError } = await supabase
        .from('user_connections')
        .delete()
        .or(`and(user_id_1.eq.${user.id},user_id_2.eq.${userId}),and(user_id_1.eq.${userId},user_id_2.eq.${user.id})`);

      if (deleteError) {
        console.error('Delete connection error:', deleteError);
        return new Response(
          JSON.stringify({ success: false, error: deleteError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Connection removed successfully'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid endpoint' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Connection invites error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
