const path = require('path');

process.env.NODE_ENV = 'test';
process.env.DATA_STORE_PATH = path.join(__dirname, 'data', 'test-db.json');
