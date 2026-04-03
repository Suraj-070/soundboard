import express from 'express';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import session from 'express-session';

const router = express.Router();

// Configure session
export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    secure: false, // Set to true if using HTTPS
  },
});

// Configure Discord OAuth strategy
passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_REDIRECT_URI,
  scope: ['identify', 'guilds'],
}, (accessToken, refreshToken, profile, done) => {
  // Check if user is in the soundboard server
  const isInGuild = profile.guilds?.some(guild => guild.id === process.env.DISCORD_GUILD_ID);
  
  if (!isInGuild) {
    return done(null, false, { message: 'You must be in the soundboard server to access this dashboard' });
  }

  const user = {
    discordId: profile.id,
    username: profile.username,
    discriminator: profile.discriminator,
    avatar: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`,
  };

  return done(null, user);
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Auth routes
router.get('/discord', passport.authenticate('discord'));

router.get('/discord/callback', 
  passport.authenticate('discord', { 
    failureRedirect: 'http://localhost:5173',
  }),
  (req, res) => {
    res.redirect('http://localhost:5173');
  }
);

router.get('/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

export default router;