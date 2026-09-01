const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config();

const token = jwt.sign({ id: 'dummy', role: 'admin' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/work-orders/stats/ranking?year=2026',
  method: 'GET',
  headers: {
    'Cookie': `token=${token}`
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`BODY: ${data.substring(0, 500)}...`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});
req.end();
