import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== "string" || token.length < 16) {
      return Response.json(
        { success: false, error: "Invalid invite token" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return Response.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Validate invite token
    const { data: waitlistRow, error: lookupError } = await supabase
      .from("waitlist_signups")
      .select("email, invited, status")
      .eq("invite_token", token.trim())
      .maybeSingle();

    if (lookupError || !waitlistRow || !waitlistRow.invited) {
      return Response.json(
        { success: false, error: "Invalid or expired invite link" },
        { status: 400, headers: corsHeaders }
      );
    }

    const email = waitlistRow.email;

    // 2. Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      // User already created their account — just tell them to sign in
      return Response.json(
        { success: false, error: "Account already exists. Please sign in instead." },
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. Create user with confirmed email (skip verification since they proved ownership via invite email)
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !newUser?.user) {
      console.error("Failed to create user:", createError);
      return Response.json(
        { success: false, error: createError?.message || "Failed to create account" },
        { status: 500, headers: corsHeaders }
      );
    }

    // 4. Guarantee waitlist_signups row exists and is updated
    const now = new Date().toISOString();
    const nameFallback = email.split("@")[0] || "User";

    // Try update by email (case-insensitive) first
    const { data: updatedRows, error: updateErr } = await supabase
      .from("waitlist_signups")
      .update({
        status: "activated",
        invited: true,
        invite_accepted_at: now,
        activation_completed_at: now,
        last_email_type_sent: "invite",
      })
      .ilike("email", email)
      .select("id");

    const rowUpdated = !updateErr && updatedRows && updatedRows.length > 0;

    if (!rowUpdated) {
      // No existing row — create one so metadata is never missing
      const { error: insertErr } = await supabase
        .from("waitlist_signups")
        .insert({
          email: email.toLowerCase(),
          name: nameFallback,
          status: "activated",
          invited: true,
          invite_token: token.trim(),
          invite_sent_at: now,
          invite_accepted_at: now,
          activation_completed_at: now,
          last_email_type_sent: "invite",
        });

      if (insertErr) {
        console.error("Failed to create waitlist_signups row:", insertErr);
      }
    } else {
      // Also update invite_sent_at if it was null
      await supabase
        .from("waitlist_signups")
        .update({ invite_sent_at: now })
        .ilike("email", email)
        .is("invite_sent_at", null);
    }

    // 5. Sign in the user to get a session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData?.session) {
      // Account was created but auto-sign-in failed — user can sign in manually
      return Response.json(
        { success: true, session: null, message: "Account created! Please sign in." },
        { status: 200, headers: corsHeaders }
      );
    }

    return Response.json(
      { success: true, session: signInData.session },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("activate-invite error:", err);
    return Response.json(
      { success: false, error: "Internal error" },
      { status: 500, headers: corsHeaders }
    );
  }
});
