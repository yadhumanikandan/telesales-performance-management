import { Router, Response } from 'express';
import { query, queryOne } from '../config/database.js';
import { AuthenticatedRequest, CallFeedback } from '../types/index.js';
import { requireAuth, requireSupervisorOrAbove } from '../middleware/auth.js';

const router = Router();

// Get performance stats for current user
router.get('/stats', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
      case 'six_months':
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        dateFilter = sixMonthsAgo.toISOString().split('T')[0];
        break;
      default:
        dateFilter = now.toISOString().split('T')[0];
    }
    
    const stats = await queryOne<{
      total_calls: number;
      interested: number;
      not_interested: number;
      not_answered: number;
      whatsapp_sent: number;
    }>(
      `SELECT 
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE feedback_status = 'interested') as interested,
        COUNT(*) FILTER (WHERE feedback_status = 'not_interested') as not_interested,
        COUNT(*) FILTER (WHERE feedback_status = 'not_answered') as not_answered,
        COUNT(*) FILTER (WHERE whatsapp_sent = true) as whatsapp_sent
       FROM call_feedback
       WHERE agent_id = $1 AND DATE(call_timestamp) >= $2`,
      [req.session.userId, dateFilter]
    );
    
    const leads = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM leads WHERE agent_id = $1 AND DATE(created_at) >= $2`,
      [req.session.userId, dateFilter]
    );
    
    const totalCalls = Number(stats?.total_calls) || 0;
    const interested = Number(stats?.interested) || 0;
    const conversionRate = totalCalls > 0 ? Math.round((interested / totalCalls) * 100) : 0;
    
    res.json({
      stats: {
        totalCalls,
        interested,
        notInterested: Number(stats?.not_interested) || 0,
        notAnswered: Number(stats?.not_answered) || 0,
        whatsappSent: Number(stats?.whatsapp_sent) || 0,
        leadsGenerated: Number(leads?.count) || 0,
        conversionRate,
      },
    });
  } catch (error) {
    console.error('Get performance stats error:', error);
    res.status(500).json({ error: 'Failed to fetch performance stats' });
  }
});

// Get hourly call data for chart
router.get('/hourly', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const hourlyData = await query<{
      hour: number;
      calls: number;
      interested: number;
      not_interested: number;
    }>(
      `SELECT 
        EXTRACT(HOUR FROM call_timestamp) as hour,
        COUNT(*) as calls,
        COUNT(*) FILTER (WHERE feedback_status = 'interested') as interested,
        COUNT(*) FILTER (WHERE feedback_status = 'not_interested') as not_interested
       FROM call_feedback
       WHERE agent_id = $1 AND DATE(call_timestamp) = $2
       GROUP BY EXTRACT(HOUR FROM call_timestamp)
       ORDER BY hour`,
      [req.session.userId, today]
    );
    
    // Fill in missing hours (8 AM - 8 PM)
    const hourlyMap = new Map(hourlyData.map(h => [h.hour, h]));
    const result = [];
    
    for (let h = 8; h <= 20; h++) {
      const data = hourlyMap.get(h) || { hour: h, calls: 0, interested: 0, not_interested: 0 };
      result.push({
        hour: `${h.toString().padStart(2, '0')}:00`,
        calls: Number(data.calls),
        interested: Number(data.interested),
        notInterested: Number(data.not_interested),
      });
    }
    
    res.json({ hourlyData: result });
  } catch (error) {
    console.error('Get hourly data error:', error);
    res.status(500).json({ error: 'Failed to fetch hourly data' });
  }
});

// Get weekly trend data
router.get('/weekly', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const weeklyData = await query<{
      date: string;
      calls: number;
      interested: number;
      not_interested: number;
    }>(
      `SELECT 
        DATE(call_timestamp) as date,
        COUNT(*) as calls,
        COUNT(*) FILTER (WHERE feedback_status = 'interested') as interested,
        COUNT(*) FILTER (WHERE feedback_status = 'not_interested') as not_interested
       FROM call_feedback
       WHERE agent_id = $1 AND call_timestamp >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(call_timestamp)
       ORDER BY date`,
      [req.session.userId]
    );
    
    res.json({ weeklyData });
  } catch (error) {
    console.error('Get weekly data error:', error);
    res.status(500).json({ error: 'Failed to fetch weekly data' });
  }
});

// Get leaderboard
router.get('/leaderboard', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
    
    const leaderboard = await query<{
      agent_id: string;
      full_name: string;
      username: string;
      total_calls: number;
      interested: number;
    }>(
      `SELECT 
        cf.agent_id,
        p.full_name,
        p.username,
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE cf.feedback_status = 'interested') as interested
       FROM call_feedback cf
       LEFT JOIN profiles p ON cf.agent_id = p.id
       WHERE DATE(cf.call_timestamp) >= $1
       GROUP BY cf.agent_id, p.full_name, p.username
       ORDER BY total_calls DESC
       LIMIT 20`,
      [dateFilter]
    );
    
    const result = leaderboard.map((entry, index) => ({
      rank: index + 1,
      agentId: entry.agent_id,
      agentName: entry.full_name || entry.username || 'Unknown',
      totalCalls: Number(entry.total_calls),
      interested: Number(entry.interested),
      conversionRate: Number(entry.total_calls) > 0
        ? Math.round((Number(entry.interested) / Number(entry.total_calls)) * 100)
        : 0,
    }));
    
    res.json({ leaderboard: result });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get heatmap data
router.get('/heatmap', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { period = 'weekly' } = req.query;
    
    const dateFilter = period === 'monthly'
      ? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
      : new Date(new Date().setDate(new Date().getDate() - new Date().getDay())).toISOString().split('T')[0];
    
    const heatmapData = await query<{
      day: number;
      hour: number;
      calls: number;
    }>(
      `SELECT 
        EXTRACT(DOW FROM call_timestamp) as day,
        EXTRACT(HOUR FROM call_timestamp) as hour,
        COUNT(*) as calls
       FROM call_feedback
       WHERE agent_id = $1 AND DATE(call_timestamp) >= $2
       GROUP BY EXTRACT(DOW FROM call_timestamp), EXTRACT(HOUR FROM call_timestamp)`,
      [req.session.userId, dateFilter]
    );
    
    res.json({ heatmapData });
  } catch (error) {
    console.error('Get heatmap error:', error);
    res.status(500).json({ error: 'Failed to fetch heatmap data' });
  }
});

export default router;
