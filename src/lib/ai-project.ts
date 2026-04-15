/**
 * AI Project Assist client — calls the project-assist edge function.
 *
 * Edge functions are deployed on Lovable Cloud, so we use the
 * VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY env vars
 * (which point to the Cloud project) rather than the production
 * data-layer config.
 */

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

/* Edge-function host — always the Cloud project where functions are deployed */
const EF_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const EF_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export function isProjectAIAvailable(): boolean {
  return Boolean(EF_URL && EF_KEY);
}

export async function callProjectAssist(
  action: ProjectAIAction,
  projectName: string,
  projectDescription: string,
  existingActions: string[],
): Promise<ProjectAIResult> {
  if (!EF_URL || !EF_KEY) {
    throw new Error("AI not configured");
  }

  let res: Response;
  try {
    res = await fetch(`${EF_URL}/functions/v1/project-assist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${EF_KEY}`,
      },
      body: JSON.stringify({
        action,
        project_name: projectName,
        project_description: projectDescription,
        existing_actions: existingActions,
      }),
    });
  } catch (_networkErr) {
    throw new Error("Could not reach AI service. Please check your connection and try again.");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 429) throw new Error("AI is busy — please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Upgrade your plan for more.");
    throw new Error(data.error || `AI request failed (${res.status})`);
  }

  return await res.json();
}
