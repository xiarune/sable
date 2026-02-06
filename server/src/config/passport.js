const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

function configurePassport() {
  // Only configure Google OAuth if credentials are provided
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const googleId = profile.id;
            const email = profile.emails?.[0]?.value?.toLowerCase();
            const name = profile.displayName;
            const picture = profile.photos?.[0]?.value;

            // Check if user exists with this Google ID
            let user = await User.findOne({ "providers.google.googleId": googleId });

            if (user) {
              // Existing Google user
              return done(null, user);
            }

            // Check if email is already registered
            if (email) {
              user = await User.findOne({ email });
              if (user) {
                // Link Google to existing account
                user.providers.google = {
                  googleId,
                  email,
                  name,
                  picture,
                };
                if (!user.avatarUrl && picture) {
                  user.avatarUrl = picture;
                }
                await user.save();
                return done(null, user);
              }
            }

            // New user - create with needsUsername = true
            user = new User({
              email,
              needsUsername: true,
              providers: {
                google: {
                  googleId,
                  email,
                  name,
                  picture,
                },
              },
              avatarUrl: picture || "",
              displayName: name,
            });
            await user.save();

            return done(null, user);
          } catch (err) {
            return done(err, null);
          }
        }
      )
    );
    console.log("✅ Google OAuth configured");
  } else {
    console.log("⚠️  Google OAuth not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)");
  }

  // Serialize user for session (we use JWT so these are minimal)
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
}

module.exports = { configurePassport };
