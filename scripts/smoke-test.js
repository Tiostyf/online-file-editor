const http = require('http');

const check = (path) => new Promise((resolve) => {
  const port = process.env.PORT || 3001;
  const opts = { hostname: '127.0.0.1', port, path, timeout: 5000 };
  const req = http.get(opts, (res) => {
    const { statusCode } = res;
    let data = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => resolve({ statusCode, data }));
  });

  req.on('error', (err) => resolve({ error: err.message }));
  req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
});

const retry = async (path, attempts = 5, delayMs = 800) => {
  for (let i = 0; i < attempts; i++) {
    const res = await check(path);
    if (!res.error && res.statusCode && res.statusCode >= 200 && res.statusCode < 400) return res;
    await new Promise(r => setTimeout(r, delayMs));
  }
  return await check(path);
};

(async () => {
  const port = process.env.PORT || 3001;
  console.log('Running smoke tests against http://localhost:' + port);
  const root = await retry('/');
  const health = await retry('/api/health');

  console.log('\n/ response:');
  if (root.error) console.log('  ERROR:', root.error);
  else console.log('  status:', root.statusCode, root.data ? '(has body)' : '');

  console.log('\n/api/health response:');
  if (health.error) console.log('  ERROR:', health.error);
  else console.log('  status:', health.statusCode, 'body:', health.data);

  const success = !root.error && root.statusCode === 200 && !health.error && health.statusCode === 200;
  process.exit(success ? 0 : 2);
})();
