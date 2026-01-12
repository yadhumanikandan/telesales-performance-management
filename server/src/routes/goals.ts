import { Router, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, execute } from '../config/database.js';
import { AuthenticatedRequest } from '../types/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

interface AgentGoal {
  id: string;
  agent_id: string;
  goal_type: string;
  metric: string;
  target_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Get goals for current user
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const goals = await query<AgentGoal>(
      `SELECT * FROM agent_goals 
       WHERE agent_id = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [req.session.userId]
    );
    
    res.json({ goals });
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// Create a goal
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schema = z.object({
      goalType: z.string(),
      metric: z.string(),
      targetValue: z.number().positive(),
      startDate: z.string(),
      endDate: z.string(),
    });
    
    const { goalType, metric, targetValue, startDate, endDate } = schema.parse(req.body);
    
    const goal = await queryOne<AgentGoal>(
      `INSERT INTO agent_goals (agent_id, goal_type, metric, target_value, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.session.userId, goalType, metric, targetValue, startDate, endDate]
    );
    
    res.status(201).json({ goal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// Update a goal
router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetValue, isActive, completedAt } = req.body;
    
    const goal = await queryOne<AgentGoal>(
      `UPDATE agent_goals SET 
        target_value = COALESCE($1, target_value),
        is_active = COALESCE($2, is_active),
        completed_at = COALESCE($3, completed_at),
        updated_at = NOW()
       WHERE id = $4 AND agent_id = $5
       RETURNING *`,
      [targetValue, isActive, completedAt, req.params.id, req.session.userId]
    );
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    res.json({ goal });
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// Delete a goal
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rowsAffected = await execute(
      `DELETE FROM agent_goals WHERE id = $1 AND agent_id = $2`,
      [req.params.id, req.session.userId]
    );
    
    if (rowsAffected === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    res.json({ message: 'Goal deleted' });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// Get goal progress
router.get('/:id/progress', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const goal = await queryOne<AgentGoal>(
      `SELECT * FROM agent_goals WHERE id = $1 AND agent_id = $2`,
      [req.params.id, req.session.userId]
    );
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    let currentValue = 0;
    
    // Calculate progress based on metric
    if (goal.metric === 'calls') {
      const result = await queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM call_feedback 
         WHERE agent_id = $1 AND DATE(call_timestamp) >= $2 AND DATE(call_timestamp) <= $3`,
        [req.session.userId, goal.start_date, goal.end_date]
      );
      currentValue = Number(result?.count) || 0;
    } else if (goal.metric === 'leads') {
      const result = await queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM leads 
         WHERE agent_id = $1 AND DATE(created_at) >= $2 AND DATE(created_at) <= $3`,
        [req.session.userId, goal.start_date, goal.end_date]
      );
      currentValue = Number(result?.count) || 0;
    } else if (goal.metric === 'talk_time') {
      const result = await queryOne<{ total: number }>(
        `SELECT COALESCE(SUM(talk_time_minutes), 0) as total FROM agent_talk_time 
         WHERE agent_id = $1 AND date >= $2 AND date <= $3`,
        [req.session.userId, goal.start_date, goal.end_date]
      );
      currentValue = Number(result?.total) || 0;
    }
    
    const progress = Math.min(Math.round((currentValue / goal.target_value) * 100), 100);
    
    res.json({ goal, currentValue, progress });
  } catch (error) {
    console.error('Get goal progress error:', error);
    res.status(500).json({ error: 'Failed to fetch goal progress' });
  }
});

export default router;
