import { Router, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, execute } from '../config/database.js';
import { AuthenticatedRequest, Lead, MasterContact, LeadStatus } from '../types/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get all leads for current agent
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.query;
    
    let sql = `
      SELECT l.*, 
        mc.company_name, mc.contact_person_name, mc.phone_number, 
        mc.trade_license_number, mc.city, mc.industry
      FROM leads l
      LEFT JOIN master_contacts mc ON l.contact_id = mc.id
      WHERE l.agent_id = $1
    `;
    const params: any[] = [req.session.userId];
    
    if (status && status !== 'all') {
      sql += ' AND l.lead_status = $2';
      params.push(status);
    }
    
    sql += ' ORDER BY l.created_at DESC';
    
    const leads = await query<Lead & Partial<MasterContact>>(sql, params);
    
    res.json({ leads });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Get lead by ID
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lead = await queryOne<Lead & Partial<MasterContact>>(
      `SELECT l.*, 
        mc.company_name, mc.contact_person_name, mc.phone_number, 
        mc.trade_license_number, mc.city, mc.industry
      FROM leads l
      LEFT JOIN master_contacts mc ON l.contact_id = mc.id
      WHERE l.id = $1 AND l.agent_id = $2`,
      [req.params.id, req.session.userId]
    );
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json({ lead });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// Update lead status
router.patch('/:id/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schema = z.object({
      status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']),
    });
    
    const { status } = schema.parse(req.body);
    
    const lead = await queryOne<Lead>(
      `UPDATE leads SET 
        lead_status = $1, 
        updated_at = NOW()
       WHERE id = $2 AND agent_id = $3
       RETURNING *`,
      [status, req.params.id, req.session.userId]
    );
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json({ lead });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update lead status error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Update lead details
router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { leadScore, leadSource, dealValue, expectedCloseDate, notes } = req.body;
    
    const lead = await queryOne<Lead>(
      `UPDATE leads SET 
        lead_score = COALESCE($1, lead_score),
        lead_source = COALESCE($2, lead_source),
        deal_value = COALESCE($3, deal_value),
        expected_close_date = COALESCE($4, expected_close_date),
        notes = COALESCE($5, notes),
        updated_at = NOW()
       WHERE id = $6 AND agent_id = $7
       RETURNING *`,
      [leadScore, leadSource, dealValue, expectedCloseDate, notes, req.params.id, req.session.userId]
    );
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json({ lead });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Convert opportunity to lead (add trade license)
router.post('/:contactId/convert', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schema = z.object({
      tradeLicenseNumber: z.string().min(1),
    });
    
    const { tradeLicenseNumber } = schema.parse(req.body);
    
    const contact = await queryOne<MasterContact>(
      `UPDATE master_contacts SET 
        trade_license_number = $1, 
        updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [tradeLicenseNumber, req.params.contactId]
    );
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json({ contact });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Convert opportunity error:', error);
    res.status(500).json({ error: 'Failed to convert opportunity' });
  }
});

// Get lead stats
router.get('/stats/summary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await queryOne<{
      total: number;
      new: number;
      contacted: number;
      qualified: number;
      converted: number;
      lost: number;
      total_deal_value: number;
    }>(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE lead_status = 'new') as new,
        COUNT(*) FILTER (WHERE lead_status = 'contacted') as contacted,
        COUNT(*) FILTER (WHERE lead_status = 'qualified') as qualified,
        COUNT(*) FILTER (WHERE lead_status = 'converted') as converted,
        COUNT(*) FILTER (WHERE lead_status = 'lost') as lost,
        COALESCE(SUM(deal_value), 0) as total_deal_value
       FROM leads
       WHERE agent_id = $1`,
      [req.session.userId]
    );
    
    res.json({ stats });
  } catch (error) {
    console.error('Get lead stats error:', error);
    res.status(500).json({ error: 'Failed to fetch lead stats' });
  }
});

export default router;
