import { Router, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, execute } from '../config/database.js';
import { AuthenticatedRequest, Team, Profile } from '../types/index.js';
import { requireAuth, requireAdmin, requireSupervisorOrAbove } from '../middleware/auth.js';

const router = Router();

// Get teams (filtered by role)
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const role = req.session.role;
    let teams: Team[];
    
    if (role === 'admin' || role === 'super_admin') {
      teams = await query<Team>('SELECT * FROM teams ORDER BY name');
    } else {
      // Get user's team and teams they lead
      teams = await query<Team>(
        `SELECT * FROM teams WHERE id = $1 OR leader_id = $2`,
        [req.session.teamId, req.session.userId]
      );
    }
    
    res.json({ teams });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get team by ID
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const team = await queryOne<Team>(
      'SELECT * FROM teams WHERE id = $1',
      [req.params.id]
    );
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json({ team });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// Get team members
router.get('/:id/members', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const members = await query<Profile & { role: string }>(
      `SELECT p.*, ur.role 
       FROM profiles p
       LEFT JOIN user_roles ur ON p.id = ur.user_id
       WHERE p.team_id = $1
       ORDER BY p.full_name`,
      [req.params.id]
    );
    
    res.json({ members });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// Create team (admin only)
router.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      teamType: z.enum(['remote', 'office']),
      leaderId: z.string().uuid().optional(),
    });
    
    const { name, teamType, leaderId } = schema.parse(req.body);
    
    const team = await queryOne<Team>(
      `INSERT INTO teams (name, team_type, leader_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, teamType, leaderId || null]
    );
    
    res.status(201).json({ team });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Update team (admin only)
router.patch('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, teamType, leaderId } = req.body;
    
    const team = await queryOne<Team>(
      `UPDATE teams SET 
        name = COALESCE($1, name),
        team_type = COALESCE($2, team_type),
        leader_id = COALESCE($3, leader_id),
        updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, teamType, leaderId, req.params.id]
    );
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json({ team });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// Delete team (admin only)
router.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rowsAffected = await execute(
      'DELETE FROM teams WHERE id = $1',
      [req.params.id]
    );
    
    if (rowsAffected === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json({ message: 'Team deleted' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// Get team performance stats
router.get('/:id/performance', requireSupervisorOrAbove, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { period = 'today' } = req.query;
    
    let dateFilter: string;
    const now = new Date();
    
    switch (period) {
      case 'this_week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        dateFilter = weekStart.toISOString().split('T')[0];
        break;
      case 'this_month':
        dateFilter = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        break;
      default:
        dateFilter = now.toISOString().split('T')[0];
    }
    
    const stats = await queryOne<{
      total_calls: number;
      interested: number;
      leads: number;
    }>(
      `SELECT 
        COUNT(cf.*) as total_calls,
        COUNT(*) FILTER (WHERE cf.feedback_status = 'interested') as interested,
        (SELECT COUNT(*) FROM leads l 
         JOIN profiles p ON l.agent_id = p.id 
         WHERE p.team_id = $1 AND DATE(l.created_at) >= $2) as leads
       FROM call_feedback cf
       JOIN profiles p ON cf.agent_id = p.id
       WHERE p.team_id = $1 AND DATE(cf.call_timestamp) >= $2`,
      [req.params.id, dateFilter]
    );
    
    res.json({ stats });
  } catch (error) {
    console.error('Get team performance error:', error);
    res.status(500).json({ error: 'Failed to fetch team performance' });
  }
});

export default router;
