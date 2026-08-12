const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const readlineSync = require('readline-sync');

// Initialize Express App & Socket.io Server
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Store global carbon state
let carbonState = {
  history: [320, 340, 360, 390],
  predictedValue: 0,
  slope: 0,
  status: 'NORMAL'
};

// -------------------------------------------------------------
// 1. NATIVE LINEAR REGRESSION ENGINE
// -------------------------------------------------------------
function calculateLinearRegression(data) {
  const N = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  for (let x = 0; x < N; x++) {
    const y = data[x];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const slope = (N * sumXY - sumX * sumY) / (N * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / N;

  // Predict next time step (index = N)
  const predictedValue = Math.round(slope * N + intercept);

  return {
    slope: Number(slope.toFixed(2)),
    intercept: Number(intercept.toFixed(2)),
    predictedValue
  };
}

// Update local predictions
function updateAnalysis(newReadings) {
  carbonState.history = newReadings;
  const result = calculateLinearRegression(newReadings);
  
  carbonState.slope = result.slope;
  carbonState.predictedValue = result.predictedValue;
  
  // High slope/prediction triggers migration alert
  if (result.predictedValue > 400 || result.slope > 15) {
    carbonState.status = 'HIGH_CARBON_ALERT';
  } else {
    carbonState.status = 'NORMAL';
  }

  // Broadcast update to all connected WebSockets (Frontend + Laptop 2)
  io.emit('carbon_update', carbonState);
  return result;
}

// -------------------------------------------------------------
// 2. HTTP REST ENDPOINTS (For Next.js Dashboard)
// -------------------------------------------------------------
app.get('/api/carbon-status', (req, res) => {
  res.json(carbonState);
});

app.post('/api/update-carbon', (req, res) => {
  const { readings } = req.body;
  if (Array.isArray(readings) && readings.length > 1) {
    updateAnalysis(readings);
    res.json({ message: 'Success', state: carbonState });
  } else {
    res.status(400).json({ error: 'Provide an array of at least 2 numbers' });
  }
});

// -------------------------------------------------------------
// 3. WEBSOCKET HANDLER (Node-to-Node & Node-to-Dashboard)
// -------------------------------------------------------------
io.on('connection', (socket) => {
  console.log(`\n[WebSocket] Client connected: ${socket.id}`);

  // Send initial state immediately upon connection
  socket.emit('carbon_update', carbonState);

  // Trigger migration manually from client
  socket.on('trigger_split', (taskDetails) => {
    console.log('[WebSocket] Task Split Command Received!');
    io.emit('execute_render_chunk', {
      frames: taskDetails?.frames || '51-100',
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    console.log(`[WebSocket] Client disconnected: ${socket.id}`);
  });
});

// -------------------------------------------------------------
// 4. TERMINAL CLI INTERACTIVE LOOP
// -------------------------------------------------------------
function startInteractiveCLI() {
  console.log('\n--- GREEN CLOUD SCHEDULER BACKEND READY ---');
  console.log('Commands:');
  console.log('  1. Type new carbon numbers separated by commas (e.g., 300,320,350,420)');
  console.log('  2. Type "split" to send job migration trigger over WebSocket');
  console.log('  3. Type "exit" to close server\n');

  while (true) {
    const input = readlineSync.question('Enter command/readings > ');

    if (input.trim().toLowerCase() === 'exit') {
      console.log('Shutting down server...');
      process.exit(0);
    } else if (input.trim().toLowerCase() === 'split') {
      console.log('Emitting render split event across WebSockets...');
      io.emit('execute_render_chunk', { frames: '51-100' });
    } else {
      // Parse numbers from input
      const numbers = input.split(',').map(n => Number(n.trim())).filter(n => !isNaN(n));
      
      if (numbers.length >= 2) {
        const res = updateAnalysis(numbers);
        console.log(`\n--> Linear Regression Fitted: Slope = ${res.slope}, Predicted Next = ${res.predictedValue}`);
        console.log(`--> Status: ${carbonState.status}\n`);
      } else {
        console.log('--> Invalid input. Enter at least 2 numbers (e.g., 310,340,390)\n');
      }
    }
  }
}

// Start Server on Port 5000
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Backend Server listening on http://localhost:${PORT}`);
  // Run initial calculation
  updateAnalysis(carbonState.history);
  
  // Launch terminal prompt
  setTimeout(startInteractiveCLI, 1000);
});