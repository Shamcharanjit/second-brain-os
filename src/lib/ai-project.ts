/**
 * AI Project Assist client — calls the project-assist edge function.
 */

import { isSupabaseEnabled, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";

export type ProjectAIAction = "suggest_next_step" | "break_into_steps" | "find_blocker";

export interface SuggestNextStepResult {
  next_step: string;
  reasoning: string;
}

export interface BreakIntoStepsResult {
  steps: Array<{ step: string; priority: "high" | "medium" | "low" }>;
}

export interface FindBlockerResult {
  blocker: string;
  suggestion: string;
}

export type ProjectAIResult =
  | { action: "suggest_next_step"; result: SuggestNextStepResult }
  | { action: "break_into_steps"; result: BreakIntoStepsResult }
  | { action: "find_blocker"; result: FindBlockerResult };

export function isProjectAIAvailable(): boolean {
  return isSupabaseEnabled;
}

export async function callProjectAssist(
  action: ProjectAIAction,
  projectName: string,
  projectDescription: string,
  existingActions: string[],
): Promise<ProjectAIResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("AI not configured");
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/project-assist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      action,
      project_name: projectName,
      project_description: projectDescription,
      existing_actions: existingActions,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `AI request failed (${res.status})`);
  }

  return await res.json();
}
