import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import passport from 'passport';
import helmet from 'helmet';
import morgan from 'morgan';

import '@/config/passport.ts';
import authRoutes from '@/routes/auth.routes.ts';
import contentRoutes from '@/routes/content.routes.ts';
import permissionRoutes from '@/routes/permission.routes.ts';
import { ENV } from '@/config/environment.ts';
import { mailService } from '@/services/mail/mail.service.ts';

const app = express();
// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors({ origin: ENV.CLIENT_URL?.split(',').map(url => url.trim()), credentials: true }));
app.use(helmet());
app.use(morgan('dev'));

// Passport
app.use(passport.initialize());

// Routes
import testRoutes from '@/routes/test.routes.js';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', contentRoutes);
app.use('/api/tests', testRoutes);
app.use('/api', permissionRoutes);

// Error Handling
import { errorHandler } from '@/middleware/error.middleware.ts';
app.use(errorHandler);

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Database connection
const MONGODB_URI = ENV.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('connected to MongoDB');
    void mailService.verify();
    app.listen(ENV.PORT, () => {
      console.log(`Server is running on port ${ENV.PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
