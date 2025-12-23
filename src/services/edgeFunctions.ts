import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface EdgeFunctionOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  requireAuth?: boolean;
  accessToken?: string;
}

export async function callEdgeFunction<T>(
  functionName: string,
  path: string = '',
  options: EdgeFunctionOptions = {}
): Promise<T> {
  const { method = 'GET', body, requireAuth = true, accessToken } = options;

  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  };

  if (requireAuth) {
    let token = accessToken;

    if (!token) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      console.log('🔐 Edge function auth check:', {
        functionName,
        path,
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        sessionError: sessionError?.message
      });

      if (!session?.access_token) {
        console.error('❌ NO SESSION TOKEN FOUND!');
        console.log('Session data:', session);
        throw new Error('Not authenticated. Please log in again.');
      }

      token = session.access_token;
    }

    headers['Authorization'] = `Bearer ${token}`;
  }

  const pathSegment = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const url = `${SUPABASE_URL}/functions/v1/${functionName}${pathSegment}`;

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  console.log('📡 Calling edge function:', {
    url,
    method,
    hasAuth: requireAuth,
    functionName
  });

  const response = await fetch(url, fetchOptions);

  console.log('📥 Edge function response:', {
    status: response.status,
    statusText: response.statusText,
    url
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Edge function error response:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    });

    let errorMessage: string;
    try {
      const errorJson = JSON.parse(errorText);

      // Check if this is a structured API response with success: false
      // If so, return it instead of throwing (for proper error handling in UI)
      if (errorJson.hasOwnProperty('success') && errorJson.success === false) {
        console.log('🔄 Returning structured error response:', errorJson);
        return errorJson as T;
      }

      errorMessage = errorJson.error || errorJson.message || 'Request failed';
    } catch {
      errorMessage = errorText || `HTTP ${response.status}`;
    }

    throw new Error(errorMessage);
  }

  return response.json();
}
