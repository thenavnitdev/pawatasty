import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SuggestionRequest {
  category: string;
  title: string;
  description: string;
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
      const body: SuggestionRequest = await req.json();

      if (!body.category || !body.title || !body.description) {
        return new Response(
          JSON.stringify({ error: 'Category, title, and description are required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const insertData = {
        user_id: user.id,
        category: body.category,
        title: body.title,
        description: body.description,
        status: 'pending',
      };

      const { data: newSuggestion, error: insertError } = await supabase
        .from('suggestions')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({
          id: newSuggestion.id,
          userId: newSuggestion.user_id,
          category: newSuggestion.category,
          title: newSuggestion.title,
          description: newSuggestion.description,
          status: newSuggestion.status,
          createdAt: newSuggestion.created_at,
          updatedAt: newSuggestion.updated_at,
        }),
        {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'GET') {
      const { data: suggestions, error } = await supabase
        .from('suggestions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedSuggestions = (suggestions || []).map((suggestion: any) => ({
        id: suggestion.id,
        userId: suggestion.user_id,
        category: suggestion.category,
        title: suggestion.title,
        description: suggestion.description,
        status: suggestion.status,
        createdAt: suggestion.created_at,
        updatedAt: suggestion.updated_at,
      }));

      return new Response(
        JSON.stringify({ suggestions: formattedSuggestions }),
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
