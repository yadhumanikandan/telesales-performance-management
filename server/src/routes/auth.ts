import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { query, queryOne, execute } from '../config/database.js';
import { AuthenticatedRequest, Profile, AppRole } from '../types/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Sign up
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName } = signupSchema.parse(req.body);
    
    // Check if user exists
    const existingUser = await queryOne<{ id: string }>(
      'SELECT id FROM profiles WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Generate username from email
    const username = email.split('@')[0];
    
    // Create user profile
    const profile = await queryOne<Profile>(
      `INSERT INTO profiles (id, email, username, full_name, password_hash, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [email.toLowerCase(), username, fullName, passwordHash]
    );
    
    if (!profile) {
      return res.status(500).json({ error: 'Failed to create user' });
    }
    
    // Create default role
    await execute(
      `INSERT INTO user_roles (user_id, role) VALUES ($1, 'agent')`,
      [profile.id]
    );
    
    // Set session
    req.session.userId = profile.id;
    req.session.email = profile.email;
    req.session.role = 'agent';
    req.session.teamId = profile.team_id;
    req.session.fullName = profile.full_name;
    
    res.status(201).json({
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        username: profile.username,
        role: 'agent',
        teamId: profile.team_id,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    // Get user with password
    const profile = await queryOne<Profile & { password_hash: string }>(
      'SELECT * FROM profiles WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (!profile || !profile.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, profile.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    if (!profile.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }
    
    // Get user role
    const roleRecord = await queryOne<{ role: AppRole }>(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [profile.id]
    );
    
    const role = roleRecord?.role || 'agent';
    
    // Update login streak
    await updateLoginStreak(profile.id);
    
    // Set session
    req.session.userId = profile.id;
    req.session.email = profile.email;
    req.session.role = role;
    req.session.teamId = profile.team_id;
    req.session.fullName = profile.full_name;
    
    res.json({
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        username: profile.username,
        role,
        teamId: profile.team_id,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const profile = await queryOne<Profile>(
      'SELECT id, email, username, full_name, phone_number, whatsapp_number, avatar_url, is_active, team_id, supervisor_id, login_streak_current, login_streak_longest, last_login_date, created_at, updated_at FROM profiles WHERE id = $1',
      [req.session.userId]
    );
    
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      user: profile,
      role: req.session.role,
      teamId: req.session.teamId,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

// Update profile
router.patch('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, phoneNumber, whatsappNumber, avatarUrl } = req.body;
    
    const profile = await queryOne<Profile>(
      `UPDATE profiles SET
        full_name = COALESCE($1, full_name),
        phone_number = COALESCE($2, phone_number),
        whatsapp_number = COALESCE($3, whatsapp_number),
        avatar_url = COALESCE($4, avatar_url),
        updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [fullName, phoneNumber, whatsappNumber, avatarUrl, req.session.userId]
    );
    
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update session
    req.session.fullName = profile.full_name;
    
    res.json({ user: profile });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

async function updateLoginStreak(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  const profile = await queryOne<{
    last_login_date: string | null;
    login_streak_current: number;
    login_streak_longest: number;
  }>(
    'SELECT last_login_date, login_streak_current, login_streak_longest FROM profiles WHERE id = $1',
    [userId]
  );
  
  if (!profile) return;
  
  let currentStreak = profile.login_streak_current || 0;
  let longestStreak = profile.login_streak_longest || 0;
  
  if (profile.last_login_date) {
    const lastLogin = new Date(profile.last_login_date);
    const todayDate = new Date(today);
    const yesterday = new Date(todayDate);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastLogin.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
      currentStreak++;
    } else if (lastLogin.toISOString().split('T')[0] !== today) {
      currentStreak = 1;
    }
  } else {
    currentStreak = 1;
  }
  
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }
  
  await execute(
    `UPDATE profiles SET 
      last_login_date = $1, 
      last_login = NOW(),
      login_streak_current = $2, 
      login_streak_longest = $3,
      updated_at = NOW()
     WHERE id = $4`,
    [today, currentStreak, longestStreak, userId]
  );
}

export default router;
