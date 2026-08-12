const io = require('socket.io-client');

// 1. REPLACE THIS WITH LAPTOP 1'S IP ADDRESS
const LAPTOP_1_IP = '192.168.1.15'; // e.g. 192.168.x.x or 169.254.x.x for Ethernet
const PORT = 5000;

const SERVER_URL = `http://${LAPTOP_1_IP}:${PORT}`;

console.log(`[Laptop 2] Connecting to Laptop 1 at ${SERVER_URL}...`);

// -------------------------------------------------------------
// 1. TEST WEBSOCKET CONNECTION
// -------------------------------------------------------------
const socket = io(SERVER_URL);

socket.on('connect', () => {
  console.log('✅ [WebSocket Connected!] Connected successfully to Laptop 1.');
});

// Listen for live carbon updates sent from Laptop 1
socket.on('carbon_update', (data) => {
  console.log('\n📊 [WebSocket Event] Received updated Carbon State from Laptop 1:');
  console.log(`   History: [${data.history.join(', ')}]`);
  console.log(`   Slope: ${data.slope}`);
  console.log(`   Predicted Value: ${data.predictedValue}`);
  console.log(`   Status: ${data.status}`);
});

// Listen for the render split / migration command
socket.on('execute_render_chunk', (task) => {
  console.log('\n🚀 [WebSocket Command Received] MIGRATION TRIGGERED!');
  console.log(`   Render Frames: ${task.frames}`);
  console.log(`   Received At: ${task.timestamp}`);
  console.log('   --> Laptop 2 starting local workload execution now...\n');
});

socket.on('disconnect', () => {
  console.log('❌ [WebSocket Disconnected] Connection lost.');
});

socket.on('connect_error', (err) => {
  console.log('⚠️ [Connection Error] Could not connect:', err.message);
  console.log('   Check: Is Laptop 1 running? Is the IP correct? Is Windows Firewall blocking Port 5000?');
});

// -------------------------------------------------------------
// 2. TEST HTTP FETCH (API Endpoint)
// -------------------------------------------------------------
async function testHttpFetch() {
  try {
    const response = await fetch(`${SERVER_URL}/api/carbon-status`);
    const data = await response.json();
    console.log('\n🌐 [HTTP GET /api/carbon-status] Direct response received:');
    console.log(data);
  } catch (err) {
    console.error('⚠️ [HTTP Error] Fetch failed:', err.message);
  }
}

// Run the HTTP test 2 seconds after script starts
setTimeout(testHttpFetch, 2000);