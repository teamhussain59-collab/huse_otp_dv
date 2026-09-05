const API_BASE = 'https://numberpanel.tech';
const DEFAULT_APPROVED_AGENT = 'husedev786@gmail.com';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'Content-Type'
  };
}

async function callApi(endpoint, method, data, env, requiresAuth = true) {
  if (requiresAuth && !env.API_TOKEN) {
    return { success: false, error: 'API_TOKEN is not configured in Cloudflare Worker Secrets.' };
  }
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  if (requiresAuth) headers['Authorization'] = 'Bearer ' + env.API_TOKEN;

  const response = await fetch(API_BASE + endpoint, {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify(data || {}) : undefined,
    redirect: 'follow'
  });
  const text = await response.text();
  let decoded;
  try { decoded = JSON.parse(text); } catch (_) { decoded = null; }
  if (!decoded) {
    return {
      success: false,
      error: `Upstream API returned non-JSON (HTTP ${response.status}).`,
      status: response.status,
      contentType: response.headers.get('content-type') || ''
    };
  }
  return decoded;
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const method = request.method;

  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });

  if (action === 'verifyAgentEmail') {
    if (method !== 'POST') return json({ success: false, approved: false, error: 'Method not allowed' }, 405);
    let input = {};
    try { input = await request.json(); } catch (_) {}
    const email = normalizeEmail(input.agentEmail);
    const approvedEmail = normalizeEmail(env.APPROVED_AGENT_EMAIL || DEFAULT_APPROVED_AGENT);
    if (!email || !email.includes('@')) return json({ success: false, approved: false, error: 'Invalid Agent Email' });
    return json({ success: true, approved: email === approvedEmail });
  }

  let response;
  try {
    switch (action) {
      case 'getServices': response = await callApi('/api/services', 'GET', null, env, false); break;
      case 'getMyNumbers': response = await callApi('/api/my_numbers', 'GET', null, env); break;
      case 'getMyOTPs': response = await callApi('/api/my_otps?limit=' + (parseInt(url.searchParams.get('limit') || '20', 10)), 'GET', null, env); break;
      case 'getStats': response = await callApi('/api/stats/detailed?period=' + encodeURIComponent(url.searchParams.get('period') || 'daily'), 'GET', null, env); break;
      case 'getLatestOTP': {
        const number = url.searchParams.get('number');
        if (!number) return json({ success: false, error: 'Missing number' });
        response = await callApi('/api/latest_otp?number=' + encodeURIComponent(number), 'GET', null, env); break;
      }
      case 'getCountries': {
        const service = url.searchParams.get('service') || 'WhatsApp';
        response = await callApi('/api/countries?service=' + encodeURIComponent(service), 'GET', null, env, false); break;
      }
      case 'getOtp': {
        const count = parseInt(url.searchParams.get('count') || '10', 10);
        response = await callApi('/api/otp?count=' + count, 'GET', null, env); break;
      }
      case 'requestNumber': {
        if (method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);
        const input = await request.json();
        response = await callApi('/api/request_number', 'POST', { service: input.service || 'WhatsApp', country: input.country || 'Indonesia' }, env); break;
      }
      case 'releaseNumber': {
        if (method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);
        const input = await request.json();
        if (!input.number) return json({ success: false, error: 'Missing number' });
        response = await callApi('/api/release_number', 'POST', { number: input.number }, env); break;
      }
      default: return json({ success: false, error: 'Invalid action' }, 400);
    }
  } catch (error) {
    return json({ success: false, error: error.message || 'Worker error' }, 500);
  }

  const out = json(response);
  const headers = new Headers(out.headers);
  Object.entries(corsHeaders()).forEach(([k, v]) => headers.set(k, v));
  return new Response(out.body, { status: out.status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.searchParams.has('action')) return handleApi(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
    return env.ASSETS.fetch(request);
  }
};
