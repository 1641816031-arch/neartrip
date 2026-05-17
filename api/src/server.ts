import dotenv from 'dotenv';
dotenv.config({ path: '/var/www/neartrip/api/.env' });
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import healthRouter from './routes/health.js';
import trainsRouter from './routes/trains.js';
import trainsBatchRouter from './routes/trainsBatch.js';
import citiesRouter from './routes/cities.js';
import trainStopsRouter from './routes/trainStops.js';
import weatherRouter from './routes/weather.js';
import locateRouter from './routes/locate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors({ origin: '*' }));

// API 路由
app.use('/api/health', healthRouter);
app.use('/api/trains', trainsRouter);
app.use('/api/trains/batch', trainsBatchRouter);
app.use('/api/cities', citiesRouter);
app.use('/api/train-stops', trainStopsRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/locate', locateRouter);

// 静态数据文件
app.use('/data', express.static(path.join(__dirname, '../data')));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API base: http://localhost:${PORT}/api`);
});