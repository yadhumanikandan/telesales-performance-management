import { Router, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, execute } from '../config/database.js';
import { AuthenticatedRequest, ApprovedCallList, CallFeedback, MasterContact, FeedbackStatus } from '../types/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get today's call list
router.get('/list', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date } = req.query;
    const listDate = date || new Date().toISOString().split('T')[0];
    
    const callList = await query<ApprovedCallList & Partial<MasterContact>>(
      `SELECT acl.*, 
        mc.company_name, mc.contact_person_name, mc.phone_number,
        mc.trade_license_number, mc.city, mc.industry, mc.area
       FROM approved_call_list acl
       LEFT JOIN master_contacts mc ON acl.contact_id = mc.id
       WHERE acl.agent_id = $1 AND acl.list_date = $2
       ORDER BY acl.call_order ASC`,
      [req.session.userId, listDate]
    );
    
    // Get today's feedback for these contacts
    const contactIds = callList.map(c => c.contact_id);
    
    let feedbackMap = new Map<string, { status: FeedbackStatus; notes: string | null }>();
    
    if (contactIds.length > 0) {
      const feedback = await query<CallFeedback>(
        `SELECT * FROM call_feedback 
         WHERE agent_id = $1 
         AND contact_id = ANY($2)
         AND DATE(call_timestamp) = $3
         ORDER BY call_timestamp DESC`,
        [req.session.userId, contactIds, listDate]
      );
      
      feedback.forEach(f => {
        if (!feedbackMap.has(f.contact_id)) {
          feedbackMap.set(f.contact_id, { status: f.feedback_status, notes: f.notes });
        }
      });
    }
    
    const enrichedList = callList.map(item => ({
      ...item,
      lastFeedback: feedbackMap.get(item.contact_id)?.status || null,
      lastNotes: feedbackMap.get(item.contact_id)?.notes || null,
    }));
    
    res.json({ callList: enrichedList });
  } catch (error) {
    console.error('Get call list error:', error);
    res.status(500).json({ error: 'Failed to fetch call list' });
  }
});

// Log call feedback
router.post('/feedback', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schema = z.object({
      callListId: z.string().uuid(),
      contactId: z.string().uuid(),
      status: z.enum(['not_answered', 'interested', 'not_interested', 'callback', 'wrong_number']),
      notes: z.string().optional(),
    });
    
    const { callListId, contactId, status, notes } = schema.parse(req.body);
    
    // Insert feedback
    const feedback = await queryOne<CallFeedback>(
      `INSERT INTO call_feedback (agent_id, contact_id, call_list_id, feedback_status, notes, call_timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [req.session.userId, contactId, callListId, status, notes || null]
    );
    
    // Update call list item
    await execute(
      `UPDATE approved_call_list SET call_status = 'called', called_at = NOW() WHERE id = $1`,
      [callListId]
    );
    
    // Update contact status
    let contactStatus: string = 'contacted';
    if (status === 'interested') contactStatus = 'interested';
    if (status === 'not_interested') contactStatus = 'not_interested';
    
    await execute(
      `UPDATE master_contacts SET status = $1 WHERE id = $2`,
      [contactStatus, contactId]
    );
    
    // If interested, create a lead
    if (status === 'interested') {
      await execute(
        `INSERT INTO leads (agent_id, contact_id, lead_status, notes)
         VALUES ($1, $2, 'new', $3)
         ON CONFLICT DO NOTHING`,
        [req.session.userId, contactId, notes || null]
      );
    }
    
    res.json({ feedback });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Log feedback error:', error);
    res.status(500).json({ error: 'Failed to log feedback' });
  }
});

// Skip a call
router.post('/:callListId/skip', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await execute(
      `UPDATE approved_call_list SET call_status = 'skipped' WHERE id = $1 AND agent_id = $2`,
      [req.params.callListId, req.session.userId]
    );
    
    res.json({ message: 'Call skipped' });
  } catch (error) {
    console.error('Skip call error:', error);
    res.status(500).json({ error: 'Failed to skip call' });
  }
});

// Get call list stats
router.get('/stats', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date } = req.query;
    const listDate = date || new Date().toISOString().split('T')[0];
    
    const stats = await queryOne<{
      total: number;
      pending: number;
      called: number;
      skipped: number;
    }>(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE call_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE call_status = 'called') as called,
        COUNT(*) FILTER (WHERE call_status = 'skipped') as skipped
       FROM approved_call_list
       WHERE agent_id = $1 AND list_date = $2`,
      [req.session.userId, listDate]
    );
    
    const feedbackStats = await queryOne<{
      interested: number;
      not_interested: number;
      not_answered: number;
      callback: number;
    }>(
      `SELECT 
        COUNT(*) FILTER (WHERE feedback_status = 'interested') as interested,
        COUNT(*) FILTER (WHERE feedback_status = 'not_interested') as not_interested,
        COUNT(*) FILTER (WHERE feedback_status = 'not_answered') as not_answered,
        COUNT(*) FILTER (WHERE feedback_status = 'callback') as callback
       FROM call_feedback
       WHERE agent_id = $1 AND DATE(call_timestamp) = $2`,
      [req.session.userId, listDate]
    );
    
    res.json({ stats: { ...stats, ...feedbackStats } });
  } catch (error) {
    console.error('Get call stats error:', error);
    res.status(500).json({ error: 'Failed to fetch call stats' });
  }
});

// Get recent activity
router.get('/activity', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    
    const activity = await query<CallFeedback & { company_name: string; contact_person_name: string }>(
      `SELECT cf.*, mc.company_name, mc.contact_person_name
       FROM call_feedback cf
       LEFT JOIN master_contacts mc ON cf.contact_id = mc.id
       WHERE cf.agent_id = $1
       ORDER BY cf.call_timestamp DESC
       LIMIT $2`,
      [req.session.userId, limit]
    );
    
    res.json({ activity });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

export default router;
