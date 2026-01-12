import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch agent's performance data
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

    // Get today's call feedback
    const { data: todayFeedback } = await supabase
      .from("call_feedback")
      .select("feedback_status, whatsapp_sent")
      .eq("agent_id", user.id)
      .gte("call_timestamp", todayStart)
      .lte("call_timestamp", todayEnd);

    // Get this week's feedback
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const { data: weekFeedback } = await supabase
      .from("call_feedback")
      .select("feedback_status, whatsapp_sent")
      .eq("agent_id", user.id)
      .gte("call_timestamp", weekStart.toISOString())
      .lte("call_timestamp", todayEnd);

    // Get agent's goals
    const { data: goals } = await supabase
      .from("agent_goals")
      .select("*")
      .eq("agent_id", user.id)
      .eq("is_active", true);

    // Get agent's talk time
    const { data: talkTime } = await supabase
      .from("agent_talk_time")
      .select("talk_time_minutes")
      .eq("agent_id", user.id)
      .eq("date", today.toISOString().split("T")[0])
      .single();

    // Get agent's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, login_streak_current, login_streak_longest")
      .eq("id", user.id)
      .single();

    // Get leads count
    const { count: leadsCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", user.id)
      .gte("created_at", weekStart.toISOString());

    // Calculate stats
    const todayStats = {
      totalCalls: todayFeedback?.length || 0,
      interested: todayFeedback?.filter(f => f.feedback_status === "interested").length || 0,
      notInterested: todayFeedback?.filter(f => f.feedback_status === "not_interested").length || 0,
      notAnswered: todayFeedback?.filter(f => f.feedback_status === "not_answered").length || 0,
      whatsappSent: todayFeedback?.filter(f => f.whatsapp_sent).length || 0,
    };

    const weekStats = {
      totalCalls: weekFeedback?.length || 0,
      interested: weekFeedback?.filter(f => f.feedback_status === "interested").length || 0,
      notInterested: weekFeedback?.filter(f => f.feedback_status === "not_interested").length || 0,
    };

    const todayConversionRate = todayStats.totalCalls > 0 
      ? Math.round((todayStats.interested / todayStats.totalCalls) * 100) 
      : 0;
    
    const weekConversionRate = weekStats.totalCalls > 0 
      ? Math.round((weekStats.interested / weekStats.totalCalls) * 100) 
      : 0;

    // Build context for AI
    const performanceContext = `
## Agent Performance Context

**Agent Name**: ${profile?.full_name || "Agent"}
**Login Streak**: ${profile?.login_streak_current || 0} days (longest: ${profile?.login_streak_longest || 0} days)

### Today's Performance:
- Total Calls: ${todayStats.totalCalls}
- Interested: ${todayStats.interested}
- Not Interested: ${todayStats.notInterested}
- Not Answered: ${todayStats.notAnswered}
- WhatsApp Follow-ups Sent: ${todayStats.whatsappSent}
- Conversion Rate: ${todayConversionRate}%
- Talk Time: ${talkTime?.talk_time_minutes || 0} minutes

### This Week's Performance:
- Total Calls: ${weekStats.totalCalls}
- Interested: ${weekStats.interested}
- Not Interested: ${weekStats.notInterested}
- Conversion Rate: ${weekConversionRate}%
- Leads Generated: ${leadsCount || 0}

### Active Goals:
${goals && goals.length > 0 
  ? goals.map(g => `- ${g.metric}: Target ${g.target_value} (${g.goal_type})`).join("\n")
  : "- No active goals set"}

### Performance Benchmarks:
- Good conversion rate: 20-30%
- Excellent conversion rate: Above 30%
- Daily call target: 30-50 calls
- Follow-up rate target: 80% of interested contacts
`;

    const systemPrompt = `You are an AI Performance Coach for a sales call center. Your role is to provide personalized, encouraging, and actionable feedback to sales agents based on their performance metrics.

${performanceContext}

Guidelines:
1. Be encouraging and positive while being honest about areas for improvement
2. Provide specific, actionable tips based on the agent's actual performance data
3. Reference their specific numbers when giving advice
4. Celebrate wins and milestones
5. Suggest realistic goals based on current performance
6. Keep responses concise but helpful (2-3 paragraphs max)
7. Use emojis sparingly to add warmth 🎯 💪 ⭐
8. If they ask about specific metrics, explain what those numbers mean
9. Compare their performance to benchmarks when relevant
10. Encourage consistent habits and improvement over perfection

Remember: You're a supportive coach, not a critic. Focus on growth and improvement.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Performance coach error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
