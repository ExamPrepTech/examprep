import passport from 'passport';
import { Strategy as GoogleStrategyCtor } from 'passport-google-oauth20';
import { Strategy as LocalStrategyCtor } from 'passport-local';
import bcrypt from 'bcryptjs';
import User, { type IUser } from '@/models/User.ts';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { ENV } from '@/config/environment.ts';
dotenv.config();

// environmental variables are loaded in index.ts but hoisted imports in ESM
// require local config call if used at top level.

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Local Strategy
passport.use(
  new LocalStrategyCtor({ usernameField: 'email' }, async (email, password, done) => {
    try {
      const user = await User.findOne({ email } as any);
      if (!user) return done(null, false, { message: 'Invalid email or password' });
      const userData = user.toObject() as any;
      if (!userData.password) return done(null, false, { message: 'Use Google login' });

      const isMatch = await bcrypt.compare(password, userData.password);
      if (!isMatch) return done(null, false, { message: 'Invalid email or password' });

      // Generate jwtSecureCode if it doesn't exist (for existing users)
      if (!user.jwtSecureCode) {
        user.jwtSecureCode = uuidv4();
        await user.save();
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: ENV.JWT_SECRET,
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      if (!payload?.id || !payload?.jwtSecureCode) {
        return done(null, false);
      }

      const user = await User.findById(payload.id);
      if (!user) {
        return done(null, false);
      }

      // Check if jwtSecureCode matches
      if (user.jwtSecureCode !== payload.jwtSecureCode) {
        return done(null, false);
      }

      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  })
);

// Google Strategy
if (ENV.GOOGLE_CLIENT_ID && ENV.GOOGLE_CLIENT_SECRET) {
  console.log('Registering Google Strategy...');
  passport.use(
    new GoogleStrategyCtor(
      {
        clientID: ENV.GOOGLE_CLIENT_ID,
        clientSecret: ENV.GOOGLE_CLIENT_SECRET,
        callbackURL: `${ENV.API_URL}/auth/google/callback`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          let user: any = await User.findOne({ googleId: profile.id } as any);

          if (!user) {
            user = await User.findOne({ email: profile.emails?.[0]?.value } as any);
            if (user) {
              user.set('googleId', profile.id);
              user.set('avatar', profile.photos?.[0]?.value);
              user.set('jwtSecureCode', uuidv4());
              await user.save();
            } else {
              user = await User.create({
                googleId: profile.id,
                email: profile.emails?.[0]?.value,
                name: profile.displayName,
                avatar: profile.photos?.[0]?.value,
                jwtSecureCode: uuidv4(),
              } as any);
            }
          }
          done(null, user);
        } catch (err) {
          done(err as Error, undefined);
        }
      }
    )
  );
}
