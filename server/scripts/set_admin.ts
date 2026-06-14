
import mongoose from 'mongoose';
import User from '@/models/User.ts';
import { ENV } from '@/config/env.ts';

async function migrate() {
  try {
    await mongoose.connect(ENV.MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminEmails = ENV.ADMIN_EMAILS;
    
    const adminUpdate = await User.updateMany(
      { email: { $in: adminEmails } },
      { $set: { role: 'admin', isApproved: true } }
    );
    console.log(`Admin update result:`, adminUpdate);
    console.log(`Promoted ${adminUpdate.modifiedCount} users to Admin (Matched: ${adminUpdate.matchedCount}).`);
    
    if (adminUpdate.matchedCount < adminEmails.length) {
         console.warn(`WARNING: Attempted to promote ${adminEmails.length} admins, but only found ${adminUpdate.matchedCount} in the database.`);
    }

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
    process.exit(0);
  }
}

migrate();
