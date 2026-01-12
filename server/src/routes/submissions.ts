import { Router, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, execute } from '../config/database.js';
import { AuthenticatedRequest, AgentSubmission } from '../types/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get submissions for current user
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { period = 'weekly' } = req.query;
    
    let dateFilter: string;
    const now = new Date();
    
    if (period === 'monthly') {
      dateFilter = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    } else {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      dateFilter = weekStart.toISOString().split('T')[0];
    }
    
    const submissions = await query<AgentSubmission>(
      `SELECT * FROM agent_submissions
       WHERE agent_id = $1 AND submission_date >= $2
       ORDER BY submission_date DESC`,
      [req.session.userId, dateFilter]
    );
    
    res.json({ submissions });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// Create a submission
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schema = z.object({
      submissionGroup: z.enum(['group1', 'group2']),
      bankName: z.string().min(1),
      notes: z.string().optional(),
    });
    
    const { submissionGroup, bankName, notes } = schema.parse(req.body);
    
    const submission = await queryOne<AgentSubmission>(
      `INSERT INTO agent_submissions (agent_id, submission_group, bank_name, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.session.userId, submissionGroup, bankName, notes || null]
    );
    
    res.status(201).json({ submission });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    
    // Check for unique constraint violation
    if ((error as any)?.code === '23505') {
      return res.status(400).json({ error: 'You have already submitted for this bank today' });
    }
    
    console.error('Create submission error:', error);
    res.status(500).json({ error: 'Failed to create submission' });
  }
});

// Delete a submission
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rowsAffected = await execute(
      `DELETE FROM agent_submissions WHERE id = $1 AND agent_id = $2`,
      [req.params.id, req.session.userId]
    );
    
    if (rowsAffected === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    res.json({ message: 'Submission deleted' });
  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

// Check if today's submission is missing
router.get('/check-today', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().getDay();
    
    // Skip Sunday
    if (dayOfWeek === 0) {
      return res.json({ isMissingToday: false });
    }
    
    const todaySubmissions = await query<AgentSubmission>(
      `SELECT * FROM agent_submissions WHERE agent_id = $1 AND submission_date = $2`,
      [req.session.userId, today]
    );
    
    res.json({ isMissingToday: todaySubmissions.length === 0 });
  } catch (error) {
    console.error('Check submission error:', error);
    res.status(500).json({ error: 'Failed to check submission' });
  }
});

export default router;
