-- ============================================
-- Seed Data for Sales Performance Tracker
-- ============================================

-- Password hash for 'password123' using bcrypt (10 rounds)
-- You can generate new hashes at: https://bcrypt-generator.com/

-- Create Teams first
INSERT INTO teams (id, name, team_type) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Sales Team Alpha', 'office'),
    ('b0000000-0000-0000-0000-000000000002', 'Remote Warriors', 'remote'),
    ('b0000000-0000-0000-0000-000000000003', 'Elite Closers', 'office')
ON CONFLICT DO NOTHING;

-- Create Admin User (password: admin123)
INSERT INTO profiles (id, email, username, full_name, is_active, team_id)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin@example.com',
    'admin',
    'System Administrator',
    true,
    NULL
) ON CONFLICT (id) DO NOTHING;

-- Create Supervisor User (password: password123)
INSERT INTO profiles (id, email, username, full_name, is_active, team_id)
VALUES (
    'a0000000-0000-0000-0000-000000000002',
    'supervisor@example.com',
    'supervisor',
    'John Supervisor',
    true,
    'b0000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Create Team Leader User (password: password123)
INSERT INTO profiles (id, email, username, full_name, is_active, team_id)
VALUES (
    'a0000000-0000-0000-0000-000000000003',
    'teamlead@example.com',
    'teamlead',
    'Sarah TeamLead',
    true,
    'b0000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Create Agent Users (password: password123)
INSERT INTO profiles (id, email, username, full_name, is_active, team_id, supervisor_id)
VALUES 
    ('a0000000-0000-0000-0000-000000000004', 'agent1@example.com', 'agent1', 'Mike Agent', true, 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'),
    ('a0000000-0000-0000-0000-000000000005', 'agent2@example.com', 'agent2', 'Lisa Sales', true, 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'),
    ('a0000000-0000-0000-0000-000000000006', 'agent3@example.com', 'agent3', 'Tom Closer', true, 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002'),
    ('a0000000-0000-0000-0000-000000000007', 'agent4@example.com', 'agent4', 'Emma Dialer', true, 'b0000000-0000-0000-0000-000000000002', NULL),
    ('a0000000-0000-0000-0000-000000000008', 'agent5@example.com', 'agent5', 'James Hunter', true, 'b0000000-0000-0000-0000-000000000003', NULL)
ON CONFLICT (id) DO NOTHING;

-- Update team leaders
UPDATE teams SET leader_id = 'a0000000-0000-0000-0000-000000000003' WHERE id = 'b0000000-0000-0000-0000-000000000001';

-- Assign Roles
INSERT INTO user_roles (user_id, role) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'admin'),
    ('a0000000-0000-0000-0000-000000000002', 'supervisor'),
    ('a0000000-0000-0000-0000-000000000003', 'agent'),
    ('a0000000-0000-0000-0000-000000000004', 'agent'),
    ('a0000000-0000-0000-0000-000000000005', 'agent'),
    ('a0000000-0000-0000-0000-000000000006', 'agent'),
    ('a0000000-0000-0000-0000-000000000007', 'agent'),
    ('a0000000-0000-0000-0000-000000000008', 'agent')
ON CONFLICT DO NOTHING;

-- Create Master Contacts
INSERT INTO master_contacts (id, company_name, contact_person_name, phone_number, trade_license_number, city, area, industry, current_owner_agent_id, status)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'ABC Trading LLC', 'Ahmed Hassan', '+971501234567', 'TL-001-2024', 'Dubai', 'Business Bay', 'Trading', 'a0000000-0000-0000-0000-000000000004', 'new'),
    ('c0000000-0000-0000-0000-000000000002', 'XYZ Corp', 'Mohammed Ali', '+971502345678', 'TL-002-2024', 'Abu Dhabi', 'Al Reem', 'Technology', 'a0000000-0000-0000-0000-000000000004', 'contacted'),
    ('c0000000-0000-0000-0000-000000000003', 'Gulf Services', 'Fatima Khan', '+971503456789', 'TL-003-2024', 'Dubai', 'DIFC', 'Consulting', 'a0000000-0000-0000-0000-000000000005', 'interested'),
    ('c0000000-0000-0000-0000-000000000004', 'Desert Gold', 'Omar Yusuf', '+971504567890', 'TL-004-2024', 'Sharjah', 'Industrial', 'Manufacturing', 'a0000000-0000-0000-0000-000000000005', 'new'),
    ('c0000000-0000-0000-0000-000000000005', 'Pearl Trading', 'Sara Ahmed', '+971505678901', 'TL-005-2024', 'Dubai', 'JLT', 'Import/Export', 'a0000000-0000-0000-0000-000000000006', 'contacted'),
    ('c0000000-0000-0000-0000-000000000006', 'Tech Solutions UAE', 'Khalid Ibrahim', '+971506789012', 'TL-006-2024', 'Dubai', 'Internet City', 'Technology', 'a0000000-0000-0000-0000-000000000006', 'interested'),
    ('c0000000-0000-0000-0000-000000000007', 'Oasis Enterprises', 'Layla Mansour', '+971507890123', 'TL-007-2024', 'Abu Dhabi', 'Mussafah', 'Construction', 'a0000000-0000-0000-0000-000000000007', 'new'),
    ('c0000000-0000-0000-0000-000000000008', 'Falcon Industries', 'Rashid Al Maktoum', '+971508901234', 'TL-008-2024', 'Dubai', 'Al Quoz', 'Manufacturing', 'a0000000-0000-0000-0000-000000000008', 'converted')
ON CONFLICT DO NOTHING;

-- Create Call Feedback
INSERT INTO call_feedback (id, agent_id, contact_id, feedback_status, notes, call_timestamp)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'interested', 'Very interested in our services', NOW() - INTERVAL '2 days'),
    ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 'callback', 'Requested callback next week', NOW() - INTERVAL '1 day'),
    ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000003', 'interested', 'Ready to proceed', NOW() - INTERVAL '3 hours'),
    ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000004', 'not_answered', 'No response', NOW() - INTERVAL '5 hours'),
    ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000005', 'not_interested', 'Not interested at this time', NOW() - INTERVAL '1 day'),
    ('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000006', 'interested', 'Send proposal', NOW() - INTERVAL '2 hours'),
    ('d0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000007', 'callback', 'Call back tomorrow', NOW() - INTERVAL '4 hours'),
    ('d0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000008', 'interested', 'Deal closed!', NOW() - INTERVAL '6 hours')
ON CONFLICT DO NOTHING;

-- Create Leads
INSERT INTO leads (id, agent_id, contact_id, lead_status, lead_score, deal_value, lead_source, notes)
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'qualified', 85, 50000, 'Cold Call', 'High potential client'),
    ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000003', 'contacted', 70, 35000, 'Referral', 'Follow up required'),
    ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000006', 'new', 60, 25000, 'Website', 'New inquiry'),
    ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000008', 'converted', 95, 75000, 'Cold Call', 'Successfully converted')
ON CONFLICT DO NOTHING;

-- Create Agent Submissions
INSERT INTO agent_submissions (id, agent_id, bank_name, submission_group, status, notes, submission_date)
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'Emirates NBD', 'group1', 'approved', 'Quick approval', CURRENT_DATE),
    ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'ADCB', 'group1', 'pending', 'Awaiting review', CURRENT_DATE),
    ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'Mashreq', 'group2', 'approved', 'Client satisfied', CURRENT_DATE - INTERVAL '1 day'),
    ('f0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000006', 'FAB', 'group1', 'pending', 'Documents submitted', CURRENT_DATE),
    ('f0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000008', 'RAK Bank', 'group2', 'approved', 'Excellent deal', CURRENT_DATE - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- Create Agent Talk Time
INSERT INTO agent_talk_time (id, agent_id, date, talk_time_minutes, notes)
VALUES
    ('g0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', CURRENT_DATE, 145, 'Good productivity'),
    ('g0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', CURRENT_DATE, 180, 'Excellent day'),
    ('g0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000006', CURRENT_DATE, 120, 'Average day'),
    ('g0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000007', CURRENT_DATE, 95, 'Short day'),
    ('g0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000008', CURRENT_DATE, 200, 'Top performer'),
    ('g0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000004', CURRENT_DATE - INTERVAL '1 day', 160, NULL),
    ('g0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000005', CURRENT_DATE - INTERVAL '1 day', 175, NULL),
    ('g0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000006', CURRENT_DATE - INTERVAL '1 day', 130, NULL)
ON CONFLICT DO NOTHING;

-- Create Agent Goals
INSERT INTO agent_goals (id, agent_id, goal_type, metric, target_value, start_date, end_date, is_active)
VALUES
    ('h0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'daily', 'calls', 50, CURRENT_DATE, CURRENT_DATE, true),
    ('h0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'weekly', 'submissions', 10, CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, true),
    ('h0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'daily', 'calls', 45, CURRENT_DATE, CURRENT_DATE, true),
    ('h0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000006', 'daily', 'talk_time', 180, CURRENT_DATE, CURRENT_DATE, true)
ON CONFLICT DO NOTHING;

-- Create Performance Targets
INSERT INTO performance_targets (id, created_by, target_type, metric, target_value, period, threshold_percentage, team_id, is_active)
VALUES
    ('i0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'team', 'calls', 500, 'weekly', 80, 'b0000000-0000-0000-0000-000000000001', true),
    ('i0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'team', 'submissions', 50, 'weekly', 75, 'b0000000-0000-0000-0000-000000000001', true),
    ('i0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'agent', 'calls', 50, 'daily', 80, NULL, true)
ON CONFLICT DO NOTHING;

-- Create Performance Cache for today
INSERT INTO performance_cache (id, agent_id, cache_date, total_calls, interested_count, not_interested_count, not_answered_count, leads_generated, whatsapp_sent)
VALUES
    ('j0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', CURRENT_DATE, 45, 12, 8, 15, 3, 5),
    ('j0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', CURRENT_DATE, 52, 15, 10, 12, 4, 8),
    ('j0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000006', CURRENT_DATE, 38, 8, 12, 10, 2, 3),
    ('j0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000007', CURRENT_DATE, 30, 6, 8, 10, 1, 2),
    ('j0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000008', CURRENT_DATE, 60, 20, 15, 10, 5, 10)
ON CONFLICT DO NOTHING;

-- ============================================
-- Test Login Credentials
-- ============================================
-- NOTE: These users need to signup through the app first, then assign roles.
-- 
-- After signup, run this command to make yourself admin:
-- docker exec -it docker-db-1 psql -U postgres -d salestracker -c "INSERT INTO user_roles (user_id, role) SELECT id, 'admin' FROM profiles WHERE email='your@email.com';"
--
-- Test data summary:
-- - 3 Teams: Sales Team Alpha, Remote Warriors, Elite Closers
-- - 8 Users: 1 admin, 1 supervisor, 1 team lead, 5 agents
-- - 8 Contacts with various statuses
-- - 8 Call feedback records
-- - 4 Leads in different stages
-- - 5 Agent submissions
-- - Talk time records for validation
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Seed data inserted successfully!';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Test Data Summary:';
    RAISE NOTICE '  - Teams: 3';
    RAISE NOTICE '  - Users: 8 (signup required for password)';
    RAISE NOTICE '  - Contacts: 8';
    RAISE NOTICE '  - Call Feedback: 8';
    RAISE NOTICE '  - Leads: 4';
    RAISE NOTICE '  - Submissions: 5';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'To create admin after signup:';
    RAISE NOTICE 'INSERT INTO user_roles (user_id, role)';
    RAISE NOTICE 'SELECT id, ''admin'' FROM profiles WHERE email=''your@email.com'';';
    RAISE NOTICE '==========================================';
END $$;
