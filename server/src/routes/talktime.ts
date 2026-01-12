import { Router, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, execute } from '../config/database.js';
import { AuthenticatedRequest, AgentTalkTime } from '../types/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get today's talk time
router.get('/today', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const talkTime = await queryOne<AgentTalkTime>(
      `SELECT * FROM agent_talk_time WHERE agent_id = $1 AND date = $2`,
      [req.session.userId, today]
    );
    
    res.json({ talkTime });
  } catch (error) {
    console.error('Get talk time error:', error);
    res.status(500).json({ error: 'Failed to fetch talk time' });
  }
});

// Get recent talk time entries
router.get('/recent', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const entries = await query<AgentTalkTime>(
      `SELECT * FROM agent_talk_time 
       WHERE agent_id = $1 AND date >= $2
       ORDER BY date DESC`,
      [req.session.userId, startDate.toISOString().split('T')[0]]
    );
    
    res.json({ entries });
  } catch (error) {
    console.error('Get recent talk time error:', error);
    res.status(500).json({ error: 'Failed to fetch recent talk time' });
  }
});

// Get monthly total
router.get('/monthly', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const result = await queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(talk_time_minutes), 0) as total 
       FROM agent_talk_time 
       WHERE agent_id = $1 AND date >= $2 AND date <= $3`,
      [req.session.userId, monthStart, monthEnd]
    );
    
    res.json({ monthlyTotal: Number(result?.total) || 0 });
  } catch (error) {
    console.error('Get monthly talk time error:', error);
    res.status(500).json({ error: 'Failed to fetch monthly talk time' });
  }
});

// Submit or update talk time
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schema = z.object({
      minutes: z.number().min(0),
      notes: z.string().optional(),
      date: z.string().optional(),
    });
    
    const { minutes, notes, date } = schema.parse(req.body);
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Check if entry exists
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM agent_talk_time WHERE agent_id = $1 AND date = $2`,
      [req.session.userId, targetDate]
    );
    
    let talkTime: AgentTalkTime | null;
    
    if (existing) {
      talkTime = await queryOne<AgentTalkTime>(
        `UPDATE agent_talk_time SET 
          talk_time_minutes = $1, 
          notes = $2, 
          updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [minutes, notes || null, existing.id]
      );
    } else {
      talkTime = await queryOne<AgentTalkTime>(
        `INSERT INTO agent_talk_time (agent_id, date, talk_time_minutes, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [req.session.userId, targetDate, minutes, notes || null]
      );
    }
    
    res.json({ talkTime });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Submit talk time error:', error);
    res.status(500).json({ error: 'Failed to save talk time' });
  }
});

export default router;
