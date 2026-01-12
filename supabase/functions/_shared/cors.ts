// Shared CORS configuration for edge functions
// Only allows requests from known origins for security

const ALLOWED_ORIGINS = [
  "https://eoendveneygjkciuhfaw.supabase.co",
  "https://lovable.dev",
  "https://www.lovable.dev",
  // Lovable preview domains
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  // Local development
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  
  // Check if origin matches any allowed origin
  const isAllowed = ALLOWED_ORIGINS.some((allowed) => {
    if (typeof allowed === "string") {
      return allowed === origin;
    }
    // RegExp pattern matching for dynamic subdomains
    return allowed.test(origin);
  });

  // Use the actual origin if allowed, otherwise use a safe default
  const allowedOrigin = isAllowed ? origin : "https://lovable.dev";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

// For OPTIONS preflight requests
export function handleCorsPreflightRequest(req: Request): Response {
  return new Response(null, { 
    status: 204,
    headers: getCorsHeaders(req) 
  });
}
