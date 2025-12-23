import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RentPowerbankRequest {
  stationId: string;
  paymentMethodId?: string;
}

interface ReturnPowerbankRequest {
  returnStationId: string;
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

    // Get authenticated user
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

    // POST /orders - Rent a powerbank
    if (req.method === "POST" && pathParts.length === 1) {
      const body: RentPowerbankRequest = await req.json();

      // Validate station exists and has available slots
      const { data: station, error: stationError } = await supabase
        .from("station_items")
        .select("*")
        .eq("id", body.stationId)
        .maybeSingle();

      if (stationError) throw stationError;
      if (!station) {
        return new Response(
          JSON.stringify({ error: "Station not found" }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      if ((station.pb_available || 0) <= 0) {
        return new Response(
          JSON.stringify({ error: "No powerbanks available at this station" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      // Get user subscription tier
      const { data: userData } = await supabase
        .from("users")
        .select("subscription, stripe_customer_id")
        .eq("user_id", user.id)
        .single();

      const userTier = userData?.subscription || "flex";

      // For Flex users, charge €0.50 validation fee
      let validationCharge = null;
      if (userTier === "flex") {
        if (!body.paymentMethodId) {
          return new Response(
            JSON.stringify({ error: "Payment method required for Flex plan rentals" }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            },
          );
        }

        // Get payment method
        const { data: paymentMethod, error: pmError } = await supabase
          .from("payment_methods")
          .select("*")
          .eq("id", body.paymentMethodId)
          .eq("user_id", user.id)
          .eq("payment_method_status", "active")
          .single();

        if (pmError || !paymentMethod) {
          return new Response(
            JSON.stringify({ error: "Invalid payment method" }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            },
          );
        }

        if (!userData?.stripe_customer_id) {
          return new Response(
            JSON.stringify({ error: "Stripe customer not found" }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            },
          );
        }

        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeSecretKey) {
          return new Response(
            JSON.stringify({ error: "Payment processing not configured" }),
            {
              status: 503,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            },
          );
        }

        // Charge €0.50 validation fee
        const validationResponse = await fetch("https://api.stripe.com/v1/payment_intents", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${stripeSecretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            amount: "50", // €0.50 in cents
            currency: "eur",
            customer: userData.stripe_customer_id,
            payment_method: paymentMethod.stripe_payment_method_id,
            confirm: "true",
            off_session: "true",
            description: "Powerbank rental validation fee",
            "metadata[type]": "validation",
            "metadata[user_id]": user.id,
          }),
        });

        if (!validationResponse.ok) {
          const error = await validationResponse.json();
          return new Response(
            JSON.stringify({ error: error.error?.message || "Payment failed" }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            },
          );
        }

        validationCharge = await validationResponse.json();

        if (validationCharge.status !== "succeeded") {
          return new Response(
            JSON.stringify({ error: "Validation payment failed" }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            },
          );
        }
      }

      // Generate unique powerbank ID
      const powerbankId = `PB-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

      // Create rental record
      const rentalData: any = {
        user_id: user.id,
        station_start_id: station.station_id,
        powerbank_id: powerbankId,
        item_id: station.id,
        merchant_name: station.name,
        status: "active",
        start_time: new Date().toISOString(),
        stripe_customer_id: userData?.stripe_customer_id,
      };

      if (validationCharge) {
        rentalData.validation_charge_id = validationCharge.id;
        rentalData.validation_paid = true;
      }

      const { data: rental, error: rentalError } = await supabase
        .from("rentals")
        .insert(rentalData)
        .select()
        .single();

      if (rentalError) throw rentalError;

      // Update station powerbank availability (decrement when renting)
      await supabase
        .from("station_items")
        .update({ pb_available: (station.pb_available || 0) - 1 })
        .eq("id", station.id);

      console.log(`✅ Powerbank rented: ${rental.id} - Validation: ${validationCharge?.id || 'N/A'}`);

      // Format response
      const formattedRental = {
        id: rental.id,
        userId: rental.user_id,
        stationId: body.stationId,
        powerbankId: rental.powerbank_id,
        status: rental.status,
        rentedAt: rental.start_time,
        validationCharged: !!validationCharge,
        validationAmount: validationCharge ? 0.50 : 0,
        station: {
          id: body.stationId,
          name: station.name,
          address: station.address,
        },
      };

      return new Response(JSON.stringify(formattedRental), {
        status: 201,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // GET /orders - Get user's orders
    if (req.method === "GET" && pathParts.length === 1) {
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          stations!orders_station_id_fkey(station_id, name, address),
          return_stations:stations!orders_return_station_id_fkey(station_id, name, address)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      const formattedOrders = orders.map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number,
        userId: o.user_id,
        stationId: o.stations?.station_id,
        powerbankId: o.powerbank_id,
        status: o.status,
        rentedAt: o.rented_at,
        returnedAt: o.returned_at,
        returnStationId: o.return_stations?.station_id,
        totalCost: o.total_cost,
        deposit: o.deposit,
        station: o.stations ? {
          id: o.stations.station_id,
          name: o.stations.name,
          address: o.stations.address,
        } : undefined,
        returnStation: o.return_stations ? {
          id: o.return_stations.station_id,
          name: o.return_stations.name,
          address: o.return_stations.address,
        } : undefined,
      }));

      return new Response(JSON.stringify(formattedOrders), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // GET /orders/:orderNumber - Get order by number
    if (req.method === "GET" && pathParts.length === 2) {
      const orderNumber = pathParts[1];

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          stations!orders_station_id_fkey(station_id, name, address),
          return_stations:stations!orders_return_station_id_fkey(station_id, name, address)
        `)
        .eq("order_number", orderNumber)
        .eq("user_id", user.id)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!order) {
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const formattedOrder = {
        id: order.id,
        orderNumber: order.order_number,
        userId: order.user_id,
        stationId: order.stations?.station_id,
        powerbankId: order.powerbank_id,
        status: order.status,
        rentedAt: order.rented_at,
        returnedAt: order.returned_at,
        returnStationId: order.return_stations?.station_id,
        totalCost: order.total_cost,
        deposit: order.deposit,
        station: order.stations ? {
          id: order.stations.station_id,
          name: order.stations.name,
          address: order.stations.address,
        } : undefined,
        returnStation: order.return_stations ? {
          id: order.return_stations.station_id,
          name: order.return_stations.name,
          address: order.return_stations.address,
        } : undefined,
      };

      return new Response(JSON.stringify(formattedOrder), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // PUT /orders/:rentalId/return - Return powerbank
    if (req.method === "PUT" && pathParts.length === 3 && pathParts[2] === "return") {
      const rentalId = pathParts[1];
      const body: ReturnPowerbankRequest = await req.json();

      // Get rental
      const { data: rental, error: rentalError } = await supabase
        .from("rentals")
        .select("*")
        .eq("id", rentalId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (rentalError) throw rentalError;
      if (!rental) {
        return new Response(
          JSON.stringify({ error: "Rental not found" }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      if (rental.status !== "active") {
        return new Response(
          JSON.stringify({ error: "Rental is not active" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      // Get return station
      const { data: returnStation, error: stationError } = await supabase
        .from("station_items")
        .select("*")
        .eq("id", body.returnStationId)
        .maybeSingle();

      if (stationError) throw stationError;
      if (!returnStation) {
        return new Response(
          JSON.stringify({ error: "Return station not found" }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      // Calculate rental duration and cost using correct pricing formula
      const rentedAt = new Date(rental.start_time);
      const returnedAt = new Date();
      const durationMs = returnedAt.getTime() - rentedAt.getTime();
      const durationMinutes = Math.ceil(durationMs / (1000 * 60));

      // Pricing: €1 per 30 minutes, €5 daily cap, €25 penalty after 5 days
      const fullDays = Math.floor(durationMinutes / 1440); // 1440 minutes = 1 day
      const remainingMinutes = durationMinutes - (fullDays * 1440);
      const blocks30Min = Math.ceil(remainingMinutes / 30);

      let usageFee = blocks30Min * 1.00; // €1 per 30-minute block

      // Apply daily cap (€5 max per day for partial day)
      if (usageFee > 5.00) {
        usageFee = 5.00;
      }

      // Add full days at €5 each
      usageFee += fullDays * 5.00;

      // Apply penalty if over 5 days (7200 minutes)
      let penaltyFee = 0;
      if (durationMinutes > 7200) {
        penaltyFee = 25.00;
      }

      const totalCost = usageFee + penaltyFee;

      // Get user subscription tier and payment info
      const { data: userData } = await supabase
        .from("users")
        .select("subscription, stripe_customer_id")
        .eq("user_id", user.id)
        .single();

      const userTier = userData?.subscription || "flex";

      // For Flex users, charge the usage fee automatically
      let usageChargeId = null;
      if (userTier === "flex" && totalCost > 0) {
        // Get user's primary payment method
        const { data: paymentMethod } = await supabase
          .from("payment_methods")
          .select("*")
          .eq("user_id", user.id)
          .eq("payment_method_status", "active")
          .eq("is_primary", true)
          .maybeSingle();

        if (paymentMethod && userData?.stripe_customer_id) {
          const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
          if (stripeSecretKey) {
            try {
              const usageResponse = await fetch("https://api.stripe.com/v1/payment_intents", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${stripeSecretKey}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                  amount: Math.round(totalCost * 100).toString(), // Convert to cents
                  currency: "eur",
                  customer: userData.stripe_customer_id,
                  payment_method: paymentMethod.stripe_payment_method_id,
                  confirm: "true",
                  off_session: "true",
                  description: `Powerbank rental - ${durationMinutes} minutes`,
                  "metadata[type]": "usage",
                  "metadata[user_id]": user.id,
                  "metadata[rental_id]": rental.id,
                  "metadata[duration_minutes]": durationMinutes.toString(),
                  "metadata[usage_fee]": usageFee.toFixed(2),
                  "metadata[penalty_fee]": penaltyFee.toFixed(2),
                }),
              });

              if (usageResponse.ok) {
                const usageCharge = await usageResponse.json();
                if (usageCharge.status === "succeeded") {
                  usageChargeId = usageCharge.id;
                  console.log(`✅ Usage charge succeeded: ${usageChargeId} - €${totalCost.toFixed(2)}`);
                }
              }
            } catch (chargeError) {
              console.error("Failed to charge usage fee:", chargeError);
              // Continue with order completion even if charge fails
              // The charge can be retried later or handled manually
            }
          }
        }
      }

      // Update rental
      const updateData: any = {
        status: "completed",
        end_time: returnedAt.toISOString(),
        station_end_id: returnStation.station_id,
        total_amount: totalCost,
        total_minutes: durationMinutes,
        penalty_fee: penaltyFee.toString(),
      };

      if (usageChargeId) {
        updateData.usage_charge_id = usageChargeId;
        updateData.usage_amount = totalCost;
      }

      const { data: updatedRental, error: updateError } = await supabase
        .from("rentals")
        .update(updateData)
        .eq("id", rental.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Increment return station powerbank availability (increment when returning)
      await supabase
        .from("station_items")
        .update({ pb_available: (returnStation.pb_available || 0) + 1 })
        .eq("id", returnStation.id);

      console.log(`✅ Powerbank returned: ${rental.id} - Usage: €${totalCost.toFixed(2)} - Duration: ${durationMinutes} min`);

      // Format response
      const formattedRental = {
        id: updatedRental.id,
        userId: updatedRental.user_id,
        powerbankId: updatedRental.powerbank_id,
        status: updatedRental.status,
        rentedAt: updatedRental.start_time,
        returnedAt: updatedRental.end_time,
        returnStationId: body.returnStationId,
        durationMinutes: durationMinutes,
        usageFee: usageFee,
        penaltyFee: penaltyFee,
        totalCost: totalCost,
        usageCharged: !!usageChargeId,
        returnStation: {
          id: body.returnStationId,
          name: returnStation.name,
          address: returnStation.address,
        },
      };

      return new Response(JSON.stringify(formattedRental), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
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
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
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