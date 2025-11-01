// Cloudflare Worker для CORS proxy
// Разверни на: workers.cloudflare.com

const N8N_BASE_URL = 'https://hi9neee.app.n8n.cloud';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Proxy to n8n
  const n8nUrl = N8N_BASE_URL + url.pathname;
  
  const response = await fetch(n8nUrl, {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' ? await request.text() : undefined,
  });

  // Add CORS to response
  const newResponse = new Response(response.body, response);
  
  Object.keys(corsHeaders).forEach(key => {
    newResponse.headers.set(key, corsHeaders[key]);
  });

  return newResponse;
}
