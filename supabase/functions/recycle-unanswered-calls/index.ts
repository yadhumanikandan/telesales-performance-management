import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const today = new Date().toISOString().split('T')[0];
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

    // Find unanswered calls from 15+ days ago that are not marked as not_interested
    const { data: unansweredCalls, error: fetchError } = await supabase
      .from('call_feedback')
      .select('agent_id, contact_id')
      .eq('feedback_status', 'not_answered')
      .lt('call_timestamp', fifteenDaysAgo);

    if (fetchError) {
      console.error('Error fetching unanswered calls:', fetchError);
      throw fetchError;
    }

    if (!unansweredCalls || unansweredCalls.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No unanswered calls to recycle', recycled: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter out contacts that are marked as not_interested
    const contactIds = [...new Set(unansweredCalls.map(c => c.contact_id))];
    
    const { data: notInterestedContacts } = await supabase
      .from('call_feedback')
      .select('contact_id')
      .in('contact_id', contactIds)
      .eq('feedback_status', 'not_interested');

    const notInterestedSet = new Set(notInterestedContacts?.map(c => c.contact_id) || []);

    // Filter out not_interested and get unique agent-contact pairs
    const validCalls = unansweredCalls.filter(c => !notInterestedSet.has(c.contact_id));
    
    // Group by agent
    const callsByAgent = new Map<string, string[]>();
    for (const call of validCalls) {
      if (!callsByAgent.has(call.agent_id)) {
        callsByAgent.set(call.agent_id, []);
      }
      const contacts = callsByAgent.get(call.agent_id)!;
      if (!contacts.includes(call.contact_id)) {
        contacts.push(call.contact_id);
      }
    }

    let totalRecycled = 0;

    for (const [agentId, contactIds] of callsByAgent) {
      // Check which contacts are already in today's call list for this agent
      const { data: existingInList } = await supabase
        .from('approved_call_list')
        .select('contact_id')
        .eq('agent_id', agentId)
        .eq('list_date', today)
        .in('contact_id', contactIds);

      const existingSet = new Set(existingInList?.map(c => c.contact_id) || []);
      const contactsToAdd = contactIds.filter(id => !existingSet.has(id));

      if (contactsToAdd.length === 0) continue;

      // Get current max call_order for today
      const { data: maxOrderData } = await supabase
        .from('approved_call_list')
        .select('call_order')
        .eq('agent_id', agentId)
        .eq('list_date', today)
        .order('call_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextOrder = (maxOrderData?.call_order || 0) + 1;

      // Add contacts to call list
      const insertData = contactsToAdd.map(contactId => ({
        agent_id: agentId,
        contact_id: contactId,
        list_date: today,
        call_order: nextOrder++,
        call_status: 'pending' as const,
      }));

      const { error: insertError } = await supabase
        .from('approved_call_list')
        .insert(insertData);

      if (insertError) {
        console.error(`Error adding contacts for agent ${agentId}:`, insertError);
      } else {
        totalRecycled += contactsToAdd.length;
      }
    }

    console.log(`Recycled ${totalRecycled} unanswered calls`);

    return new Response(
      JSON.stringify({ 
        message: `Recycled ${totalRecycled} unanswered calls to call lists`,
        recycled: totalRecycled 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in recycle-unanswered-calls:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
