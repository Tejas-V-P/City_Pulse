// Server-Sent Events (SSE) broadcaster for live real-time seat alerts and registration updates
const clients = new Set();

/**
 * Register a new SSE client connection
 */
export function addSSEClient(res) {
  clients.add(res);
  
  // Send immediate connected payload
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now(), clientCount: clients.size })}\n\n`);

  res.on('close', () => {
    clients.delete(res);
  });
}

/**
 * Broadcast an event to all connected SSE clients
 */
export function broadcastSSE(type, data) {
  const payload = `data: ${JSON.stringify({ type, data, timestamp: Date.now() })}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch (e) {
      clients.delete(client);
    }
  }
}

/**
 * Heartbeat to keep connection alive across proxies
 */
setInterval(() => {
  for (const client of clients) {
    try {
      client.write(': heartbeat\n\n');
    } catch (e) {
      clients.delete(client);
    }
  }
}, 30000);
