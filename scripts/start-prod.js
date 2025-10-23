const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const backendDir = path.join(__dirname, '..', 'backend');
const logDir = path.join(backendDir, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const outLog = fs.openSync(path.join(logDir, 'server.out.log'), 'a');
const errLog = fs.openSync(path.join(logDir, 'server.err.log'), 'a');

const env = Object.assign({}, process.env, { NODE_ENV: 'production' });

// Spawn detached so the npm command exits and server keeps running in background
const server = spawn(process.execPath, [path.join(backendDir, 'server.js')], {
  cwd: backendDir,
  env,
  detached: true,
  stdio: ['ignore', outLog, errLog]
});

server.unref();

console.log(`Started backend (detached) with PID ${server.pid}. Logs: ${path.join(logDir, 'server.out.log')}`);
