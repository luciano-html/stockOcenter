const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config();

const token = jwt.sign({ userId: 'dummy', role: 'admin' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/work-orders/stats/ranking?year=2026',
  method: 'GET',
  headers: { 'Cookie': `token=${token}` }
};

http.get(options, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', data));
}).on('error', console.log);
