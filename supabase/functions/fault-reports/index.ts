import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FaultReportRequest {
  reportType: string;
  qrCode?: string;
  category: string;
  description: string;
  bookingId?: number;
  orderId?: number;
  deviceId?: string;
  stationId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'POST') {
      const body: FaultReportRequest = await req.json();

      if (!body.reportType || !body.category || !body.description) {
        return new Response(
          JSON.stringify({ error: 'Report type, category, and description are required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('email, phone_number, first_name, last_name')
        .eq('id', user.id)
        .maybeSingle();

      const insertData = {
        user_id: user.id,
        report_type: body.reportType,
        title: body.category,
        description: body.description,
        device_id: body.qrCode || body.deviceId || null,
        station_id: body.stationId || null,
        booking_id: body.bookingId || null,
        order_id: body.orderId || null,
        status: 'pending',
        priority: 'medium',
        user_email: userProfile?.email || user.email || null,
        user_phone: userProfile?.phone_number || null,
        user_name: userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : null,
      };

      const { data: newReport, error: insertError } = await supabase
        .from('fault_reports')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({
          id: newReport.id,
          ticketNumber: newReport.ticket_number,
          userId: newReport.user_id,
          reportType: newReport.report_type,
          title: newReport.title,
          description: newReport.description,
          deviceId: newReport.device_id,
          stationId: newReport.station_id,
          bookingId: newReport.booking_id,
          orderId: newReport.order_id,
          status: newReport.status,
          priority: newReport.priority,
          createdAt: newReport.created_at,
          updatedAt: newReport.updated_at,
        }),
        {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'GET') {
      const { data: reports, error } = await supabase
        .from('fault_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedReports = (reports || []).map((report: any) => ({
        id: report.id,
        ticketNumber: report.ticket_number,
        userId: report.user_id,
        reportType: report.report_type,
        title: report.title,
        description: report.description,
        deviceId: report.device_id,
        stationId: report.station_id,
        bookingId: report.booking_id,
        orderId: report.order_id,
        status: report.status,
        priority: report.priority,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
      }));

      return new Response(
        JSON.stringify({ reports: formattedReports }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});