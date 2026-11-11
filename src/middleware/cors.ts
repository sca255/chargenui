export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

export function withCors(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export function jsonWithCors(data: unknown, init?: ResponseInit): Response {
  return withCors(Response.json(data, init));
}

export function errorWithCors(message: string, status = 500): Response {
  return withCors(Response.json({ error: message }, { status }));
}

export function notFoundWithCors(message = "Endpoint not found"): Response {
  return errorWithCors(message, 404);
}