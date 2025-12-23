import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BookDealRequest {
  bookingDate: string;
  guests?: number;
  specialRequests?: string;
  restaurantId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    console.log('📍 Path parts:', pathParts);

    if (req.method === "DELETE" && pathParts[pathParts.length - 2] === "bookings") {
      const bookingId = parseInt(pathParts[pathParts.length - 1]);
      console.log('🗑️ Cancel booking route matched! Booking ID:', bookingId);

      const { error: cancelError } = await supabase
        .from("deal_bookings")
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .eq("user_id", user.id);

      if (cancelError) {
        console.error('❌ Error cancelling booking:', cancelError);
        throw cancelError;
      }

      console.log('✅ Booking cancelled successfully');

      return new Response(
        JSON.stringify({ message: "Booking cancelled successfully" }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (req.method === "POST" && pathParts[pathParts.length - 1] === "book" && pathParts[pathParts.length - 3] === "deals") {
      const dealId = parseInt(pathParts[pathParts.length - 2]);
      console.log('🎯 Booking deal ID:', dealId);

      const body: BookDealRequest = await req.json();
      console.log('📝 Booking request:', body);

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("subscription")
        .eq("user_id", user.id)
        .maybeSingle();

      if (userError) {
        console.error('❌ Error fetching user subscription:', userError);
        throw new Error("Failed to verify subscription");
      }

      const userSubscription = userData?.subscription || 'flex';
      console.log('👤 User subscription:', userSubscription);

      if (userSubscription === 'flex') {
        console.error('❌ Flex plan users cannot book deals');
        return new Response(
          JSON.stringify({
            error: "Deal bookings are only available for Silver and Gold subscription members. Please upgrade your plan.",
            requiresUpgrade: true,
            currentPlan: 'flex'
          }),
          {
            status: 403,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      if (userSubscription !== 'silver' && userSubscription !== 'gold') {
        console.error('❌ Invalid subscription for deal booking:', userSubscription);
        return new Response(
          JSON.stringify({
            error: "Only Silver and Gold members can book deals. Please upgrade your plan.",
            requiresUpgrade: true,
            currentPlan: userSubscription
          }),
          {
            status: 403,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      console.log('✅ Subscription validated - user can book deals');

      const { data: deal, error: dealError } = await supabase
        .from("merchant_deals")
        .select(`
          id,
          merchant_id,
          deal_name,
          image_id,
          image_ids,
          location,
          merchants (
            company_name,
            address
          )
        `)
        .eq("id", dealId)
        .maybeSingle();

      if (dealError || !deal) {
        console.error('❌ Deal not found:', dealError);
        throw new Error("Deal not found");
      }

      console.log('✅ Found deal:', deal);

      const merchant = Array.isArray(deal.merchants) ? deal.merchants[0] : deal.merchants;

      // Check if user is booking from a specific branch
      let merchantName = merchant?.company_name || '';
      let merchantAddress = merchant?.address || '';
      let merchantLocation = deal.location || '';
      let branchIdToStore = merchantLocation;

      // First priority: Check if restaurantId is a branch (from the UI context)
      if (body.restaurantId) {
        console.log('📍 Restaurant ID provided:', body.restaurantId);
        const { data: branchData } = await supabase
          .from("merchant_branches")
          .select("branch_id, branch_name, address")
          .eq("merchant_id", body.restaurantId)
          .maybeSingle();

        if (branchData) {
          console.log('✅ Found branch details from restaurantId:', branchData);
          merchantName = branchData.branch_name;
          merchantAddress = branchData.address;
          branchIdToStore = branchData.branch_id;
        } else {
          // Try looking up by branch_id directly
          const { data: branchByIdData } = await supabase
            .from("merchant_branches")
            .select("branch_id, branch_name, address")
            .eq("branch_id", body.restaurantId)
            .maybeSingle();

          if (branchByIdData) {
            console.log('✅ Found branch details by branch_id:', branchByIdData);
            merchantName = branchByIdData.branch_name;
            merchantAddress = branchByIdData.address;
            branchIdToStore = branchByIdData.branch_id;
          }
        }
      }
      // Second priority: Check if deal is for a specific branch
      else if (deal.location && deal.location !== 'all' && deal.location !== 'On-site') {
        const { data: branchData } = await supabase
          .from("merchant_branches")
          .select("branch_name, address")
          .eq("branch_id", deal.location)
          .maybeSingle();

        if (branchData) {
          console.log('✅ Found branch details from deal.location:', branchData);
          merchantName = branchData.branch_name;
          merchantAddress = branchData.address;
        }
      }

      // Get numeric image ID from image_ids array, fallback to image_id
      let dealImageId = '';
      if (deal.image_ids) {
        try {
          const imageIds = typeof deal.image_ids === 'string' ? JSON.parse(deal.image_ids) : deal.image_ids;
          dealImageId = imageIds.length > 0 ? imageIds[0] : (deal.image_id || '');
        } catch (e) {
          dealImageId = deal.image_id || '';
        }
      } else {
        dealImageId = deal.image_id || '';
      }

      const bookingData = {
        user_id: user.id,
        deal_id: dealId,
        merchant_id: deal.merchant_id,
        merchant_name: merchantName,
        merchant_address: merchantAddress,
        merchant_location: branchIdToStore,
        deal_title: deal.deal_name,
        deal_image: dealImageId,
        booking_date: body.bookingDate,
        booking_time: body.specialRequests || '18:00 - 19:00',
        booking_type: body.guests && body.guests > 1 ? 'group' : 'single',
        guests: body.guests || 1,
        status: 'confirmed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('💾 Inserting booking:', bookingData);

      const { data: booking, error: bookingError } = await supabase
        .from("deal_bookings")
        .insert(bookingData)
        .select()
        .single();

      if (bookingError) {
        console.error('❌ Booking error:', bookingError);
        throw bookingError;
      }

      console.log('✅ Booking created:', booking);

      return new Response(
        JSON.stringify({
          id: booking.id.toString(),
          userId: booking.user_id,
          dealId: booking.deal_id,
          merchantId: booking.merchant_id,
          bookingDate: booking.booking_date,
          booking_date: booking.booking_date,
          booking_time: booking.booking_time,
          booking_type: booking.booking_type,
          status: booking.status,
          specialRequests: booking.booking_time,
          deal: {
            id: booking.deal_id,
            title: booking.deal_title,
            description: '',
            image: booking.deal_image,
          },
          merchant: {
            id: booking.merchant_id,
            name: booking.merchant_name,
            address: booking.merchant_address,
          },
          restaurant: {
            id: booking.merchant_id,
            name: booking.merchant_name,
            address: booking.merchant_address,
          },
          createdAt: booking.created_at,
        }),
        {
          status: 201,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (req.method === "GET" && pathParts[pathParts.length - 1] === "bookings") {
      console.log('📋 Fetching bookings for user:', user.id);

      const { data: bookings, error: bookingsError } = await supabase
        .from("deal_bookings")
        .select("*")
        .eq("user_id", user.id)
        .order("booking_date", { ascending: false });

      if (bookingsError) {
        console.error('❌ Bookings query error:', bookingsError);
        throw bookingsError;
      }

      console.log('✅ Found bookings:', bookings?.length || 0);

      const enrichedBookings = await Promise.all((bookings || []).map(async (b: any) => {
        const { data: dealData } = await supabase
          .from("merchant_deals")
          .select("image_id, image_ids, deal_name")
          .eq("id", b.deal_id)
          .maybeSingle();

        // Get numeric image ID from image_ids array, fallback to image_id
        let correctDealImage = '';
        if (dealData?.image_ids) {
          try {
            const imageIds = typeof dealData.image_ids === 'string' ? JSON.parse(dealData.image_ids) : dealData.image_ids;
            correctDealImage = imageIds.length > 0 ? imageIds[0] : (dealData.image_id || b.deal_image || '');
          } catch (e) {
            correctDealImage = dealData.image_id || b.deal_image || '';
          }
        } else {
          correctDealImage = dealData?.image_id || b.deal_image || '';
        }

        const correctDealTitle = dealData?.deal_name || b.deal_title || '';

        // Check if booking has branch-specific location
        let merchantName = b.merchant_name;
        let merchantAddress = b.merchant_address;

        if (b.merchant_location && b.merchant_location !== 'all' && b.merchant_location !== 'On-site' && b.merchant_location !== '') {
          // This booking is for a specific branch, fetch current branch details
          const { data: branchData } = await supabase
            .from("merchant_branches")
            .select("branch_name, address")
            .eq("branch_id", b.merchant_location)
            .maybeSingle();

          if (branchData) {
            merchantName = branchData.branch_name;
            merchantAddress = branchData.address;
          }
        }

        return {
          id: b.id.toString(),
          userId: b.user_id,
          dealId: b.deal_id,
          merchantId: b.merchant_id,
          bookingDate: b.booking_date,
          booking_date: b.booking_date,
          booking_time: b.booking_time,
          booking_type: b.booking_type || 'single',
          guests: b.guests || 1,
          status: b.status,
          specialRequests: b.booking_time,
          dealImage: correctDealImage,
          deal: {
            id: b.deal_id,
            title: correctDealTitle,
            description: '',
            image: correctDealImage,
          },
          merchant: {
            id: b.merchant_id,
            name: merchantName,
            address: merchantAddress,
          },
          restaurant: {
            id: b.merchant_id,
            name: merchantName,
            address: merchantAddress,
          },
          createdAt: b.created_at,
          completedAt: b.completed_at,
        };
      }));

      const formattedBookings = enrichedBookings;

      return new Response(
        JSON.stringify({ bookings: formattedBookings, total: formattedBookings.length }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (req.method === "POST" && pathParts[pathParts.length - 1] === "complete" && pathParts[pathParts.length - 2]) {
      const bookingId = parseInt(pathParts[pathParts.length - 2]);
      console.log('✅ Complete booking route matched! Booking ID:', bookingId, 'User ID:', user.id);
      console.log('🔍 Path parts:', pathParts);

      // Step 1: Fetch booking
      const { data: bookingData, error: fetchError } = await supabase
        .from("deal_bookings")
        .select("deal_id, status")
        .eq("id", bookingId)
        .eq("user_id", user.id)
        .single();

      if (fetchError || !bookingData) {
        console.error('❌ Booking not found:', fetchError);
        throw new Error(`Booking not found: ${fetchError?.message || 'No data'}`);
      }

      console.log('📋 Found booking:', bookingData);

      // Check if already completed
      if (bookingData.status === 'completed') {
        console.log('⚠️ Booking already completed');
        const { data: userData } = await supabase
          .from("users")
          .select("total_savings")
          .eq("user_id", user.id)
          .single();

        return new Response(
          JSON.stringify({
            message: "Booking already completed",
            savings: 0,
            totalSavings: userData?.total_savings || 0
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      // Step 2: Fetch deal details
      const { data: deal, error: dealError } = await supabase
        .from("merchant_deals")
        .select("save_value")
        .eq("id", bookingData.deal_id)
        .single();

      if (dealError || !deal) {
        console.error('❌ Deal not found:', dealError);
        throw new Error(`Deal not found: ${dealError?.message || 'No data'}`);
      }

      const saveValue = parseFloat(deal.save_value) || 0;
      console.log('💰 Save value:', saveValue);

      // Step 3: Update booking status
      const { error: updateError } = await supabase
        .from("deal_bookings")
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .eq("user_id", user.id);

      if (updateError) {
        console.error('❌ Error updating booking:', updateError);
        throw new Error(`Failed to update booking: ${updateError.message}`);
      }

      console.log('✅ Booking status updated to completed');

      // Step 4: Increment total savings
      console.log('💰 Calling increment_total_savings RPC with user_id:', user.id, 'amount:', saveValue);
      const { data: newTotal, error: savingsError } = await supabase.rpc('increment_total_savings', {
        p_user_id: user.id,
        p_amount: saveValue
      });

      if (savingsError) {
        console.error('❌ Error updating savings:', savingsError);
        console.error('❌ Full error details:', JSON.stringify(savingsError, null, 2));
        throw new Error(`Failed to update savings: ${savingsError.message || JSON.stringify(savingsError)}`);
      }

      console.log('✅ Savings updated. New total:', newTotal);

      // Step 5: Fetch updated total savings to confirm
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("total_savings")
        .eq("user_id", user.id)
        .single();

      const totalSavings = userData?.total_savings || newTotal || saveValue;

      console.log('✅ Booking completed successfully. Savings:', saveValue, 'Total:', totalSavings);

      return new Response(
        JSON.stringify({
          message: "Booking completed successfully",
          savings: saveValue,
          totalSavings: totalSavings
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (req.method === "GET" && pathParts[pathParts.length - 2] === "bookings") {
      const bookingId = parseInt(pathParts[pathParts.length - 1]);
      console.log('📋 Fetching booking:', bookingId);

      const { data: booking, error: bookingError } = await supabase
        .from("deal_bookings")
        .select("*")
        .eq("id", bookingId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (bookingError || !booking) {
        console.error('❌ Booking not found:', bookingError);
        throw new Error("Booking not found");
      }

      const { data: dealData } = await supabase
        .from("merchant_deals")
        .select("image_id, image_ids, deal_name")
        .eq("id", booking.deal_id)
        .maybeSingle();

      let correctDealImage = '';
      if (dealData?.image_ids) {
        try {
          const imageIds = typeof dealData.image_ids === 'string' ? JSON.parse(dealData.image_ids) : dealData.image_ids;
          correctDealImage = imageIds.length > 0 ? imageIds[0] : (dealData.image_id || booking.deal_image || '');
        } catch (e) {
          correctDealImage = dealData.image_id || booking.deal_image || '';
        }
      } else {
        correctDealImage = dealData?.image_id || booking.deal_image || '';
      }

      const correctDealTitle = dealData?.deal_name || booking.deal_title || '';

      // Check if booking has branch-specific location
      let merchantName = booking.merchant_name;
      let merchantAddress = booking.merchant_address;

      if (booking.merchant_location && booking.merchant_location !== 'all' && booking.merchant_location !== 'On-site' && booking.merchant_location !== '') {
        // This booking is for a specific branch, fetch current branch details
        const { data: branchData } = await supabase
          .from("merchant_branches")
          .select("branch_name, address")
          .eq("branch_id", booking.merchant_location)
          .maybeSingle();

        if (branchData) {
          merchantName = branchData.branch_name;
          merchantAddress = branchData.address;
        }
      }

      return new Response(
        JSON.stringify({
          id: booking.id.toString(),
          userId: booking.user_id,
          dealId: booking.deal_id,
          merchantId: booking.merchant_id,
          bookingDate: booking.booking_date,
          booking_date: booking.booking_date,
          booking_time: booking.booking_time,
          booking_type: booking.booking_type || 'single',
          status: booking.status,
          specialRequests: booking.booking_time,
          dealImage: correctDealImage,
          deal: {
            id: booking.deal_id,
            title: correctDealTitle,
            description: '',
            image: correctDealImage,
          },
          merchant: {
            id: booking.merchant_id,
            name: merchantName,
            address: merchantAddress,
          },
          restaurant: {
            id: booking.merchant_id,
            name: merchantName,
            address: merchantAddress,
          },
          createdAt: booking.created_at,
          completedAt: booking.completed_at,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error('❌ Error in deals-booking function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});