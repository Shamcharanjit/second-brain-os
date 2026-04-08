export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          created_at: string
          cta_label: string | null
          cta_link: string | null
          id: string
          message: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          cta_link?: string | null
          id?: string
          message: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          cta_link?: string | null
          id?: string
          message?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      capture_attachment_extractions: {
        Row: {
          attachment_id: string
          capture_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          extracted_text: string | null
          id: string
          kind: string
          model: string | null
          provider: string | null
          started_at: string | null
          status: string
          structured_json: Json | null
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_id: string
          capture_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          extracted_text?: string | null
          id?: string
          kind: string
          model?: string | null
          provider?: string | null
          started_at?: string | null
          status?: string
          structured_json?: Json | null
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_id?: string
          capture_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          extracted_text?: string | null
          id?: string
          kind?: string
          model?: string | null
          provider?: string | null
          started_at?: string | null
          status?: string
          structured_json?: Json | null
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capture_attachment_extractions_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "capture_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capture_attachment_extractions_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "user_captures"
            referencedColumns: ["id"]
          },
        ]
      }
      capture_attachments: {
        Row: {
          bucket: string
          capture_id: string
          created_at: string
          extracted_text: string | null
          file_kind: string
          file_name: string
          file_size: number | null
          id: string
          metadata: Json
          mime_type: string | null
          status: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bucket?: string
          capture_id: string
          created_at?: string
          extracted_text?: string | null
          file_kind: string
          file_name: string
          file_size?: number | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          status?: string
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bucket?: string
          capture_id?: string
          created_at?: string
          extracted_text?: string | null
          file_kind?: string
          file_name?: string
          file_size?: number | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          status?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capture_attachments_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "user_captures"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_campaigns: {
        Row: {
          campaign_name: string
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          min_score_threshold: number
          notes: string | null
          prompt_strength: string
          start_date: string
          target_segment: string[]
          updated_at: string
        }
        Insert: {
          campaign_name: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          min_score_threshold?: number
          notes?: string | null
          prompt_strength?: string
          start_date?: string
          target_segment?: string[]
          updated_at?: string
        }
        Update: {
          campaign_name?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          min_score_threshold?: number
          notes?: string | null
          prompt_strength?: string
          start_date?: string
          target_segment?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      conversion_prompt_events: {
        Row: {
          campaign_id: string | null
          created_at: string
          event_type: string
          id: string
          prompt_strength: string
          prompt_type: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          prompt_strength?: string
          prompt_type?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          prompt_strength?: string
          prompt_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversion_prompt_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "conversion_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      rollout_decisions: {
        Row: {
          actual_sent: number
          created_at: string
          decided_at: string
          decision: string
          health_state: string
          id: string
          notes: string | null
          recommended_batch: number
          rollout_state: string
          updated_at: string
        }
        Insert: {
          actual_sent?: number
          created_at?: string
          decided_at?: string
          decision?: string
          health_state?: string
          id?: string
          notes?: string | null
          recommended_batch: number
          rollout_state?: string
          updated_at?: string
        }
        Update: {
          actual_sent?: number
          created_at?: string
          decided_at?: string
          decision?: string
          health_state?: string
          id?: string
          notes?: string | null
          recommended_batch?: number
          rollout_state?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          billing_cycle: string
          created_at: string
          display_order: number
          feature_flags: Json
          id: string
          is_active: boolean
          name: string
          price_inr: number
          price_usd: number
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          display_order?: number
          feature_flags?: Json
          id?: string
          is_active?: boolean
          name: string
          price_inr?: number
          price_usd?: number
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          display_order?: number
          feature_flags?: Json
          id?: string
          is_active?: boolean
          name?: string
          price_inr?: number
          price_usd?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_captures: {
        Row: {
          ai_data: Json | null
          completed_at: string | null
          converted_to_project_at: string | null
          created_at: string
          id: string
          idea_status: string
          input_type: string
          is_completed: boolean
          is_pinned_today: boolean
          manually_adjusted: boolean
          processed: boolean
          raw_input: string
          review_status: string
          reviewed_at: string | null
          source_action_id: string | null
          source_project_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_data?: Json | null
          completed_at?: string | null
          converted_to_project_at?: string | null
          created_at?: string
          id?: string
          idea_status?: string
          input_type?: string
          is_completed?: boolean
          is_pinned_today?: boolean
          manually_adjusted?: boolean
          processed?: boolean
          raw_input: string
          review_status?: string
          reviewed_at?: string | null
          source_action_id?: string | null
          source_project_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_data?: Json | null
          completed_at?: string | null
          converted_to_project_at?: string | null
          created_at?: string
          id?: string
          idea_status?: string
          input_type?: string
          is_completed?: boolean
          is_pinned_today?: boolean
          manually_adjusted?: boolean
          processed?: boolean
          raw_input?: string
          review_status?: string
          reviewed_at?: string | null
          source_action_id?: string | null
          source_project_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_memory_entries: {
        Row: {
          created_at: string
          id: string
          importance_score: number
          is_archived: boolean
          is_pinned: boolean
          last_reviewed_at: string | null
          linked_idea_ids: string[]
          linked_project_ids: string[]
          memory_type: string
          raw_text: string
          source_capture_id: string | null
          summary: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          importance_score?: number
          is_archived?: boolean
          is_pinned?: boolean
          last_reviewed_at?: string | null
          linked_idea_ids?: string[]
          linked_project_ids?: string[]
          memory_type?: string
          raw_text: string
          source_capture_id?: string | null
          summary: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          importance_score?: number
          is_archived?: boolean
          is_pinned?: boolean
          last_reviewed_at?: string | null
          linked_idea_ids?: string[]
          linked_project_ids?: string[]
          memory_type?: string
          raw_text?: string
          source_capture_id?: string | null
          summary?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_projects: {
        Row: {
          color: string
          created_at: string
          description: string
          due_date: string | null
          id: string
          linked_capture_ids: string[]
          name: string
          next_actions: Json
          notes: Json
          priority: string
          progress: number
          source_idea_id: string | null
          status: string
          timeline: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          linked_capture_ids?: string[]
          name: string
          next_actions?: Json
          notes?: Json
          priority?: string
          progress?: number
          source_idea_id?: string | null
          status?: string
          timeline?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          linked_capture_ids?: string[]
          name?: string
          next_actions?: Json
          notes?: Json
          priority?: string
          progress?: number
          source_idea_id?: string | null
          status?: string
          timeline?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_referrals: {
        Row: {
          created_at: string
          id: string
          referred_user_email: string
          referrer_user_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_user_email: string
          referrer_user_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_user_email?: string
          referrer_user_id?: string
          status?: string
        }
        Relationships: []
      }
      user_review_meta: {
        Row: {
          created_at: string
          id: string
          last_daily_review_at: string | null
          last_weekly_review_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_daily_review_at?: string | null
          last_weekly_review_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_daily_review_at?: string | null
          last_weekly_review_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_provider: string | null
          billing_region: string
          conversion_readiness_score: number
          created_at: string
          current_period_end: string | null
          id: string
          is_early_access: boolean
          is_founder_assigned: boolean
          plan_expires_at: string | null
          plan_started_at: string | null
          plan_tier: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          subscription_status: string
          updated_at: string
          upgrade_prompt_eligible: boolean
          user_id: string
        }
        Insert: {
          billing_provider?: string | null
          billing_region?: string
          conversion_readiness_score?: number
          created_at?: string
          current_period_end?: string | null
          id?: string
          is_early_access?: boolean
          is_founder_assigned?: boolean
          plan_expires_at?: string | null
          plan_started_at?: string | null
          plan_tier?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          subscription_status?: string
          updated_at?: string
          upgrade_prompt_eligible?: boolean
          user_id: string
        }
        Update: {
          billing_provider?: string | null
          billing_region?: string
          conversion_readiness_score?: number
          created_at?: string
          current_period_end?: string | null
          id?: string
          is_early_access?: boolean
          is_founder_assigned?: boolean
          plan_expires_at?: string | null
          plan_started_at?: string | null
          plan_tier?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          subscription_status?: string
          updated_at?: string
          upgrade_prompt_eligible?: boolean
          user_id?: string
        }
        Relationships: []
      }
      waitlist_signups: {
        Row: {
          activation_completed_at: string | null
          created_at: string
          email: string
          email_send_count: number
          id: string
          invite_accepted_at: string | null
          invite_opened_at: string | null
          invite_sent_at: string | null
          invite_token: string | null
          invited: boolean
          last_email_type_sent: string | null
          last_reminder_sent_at: string | null
          name: string
          notes: string | null
          referral_code: string | null
          referral_count: number
          referral_reward_level: number
          referred_by: string | null
          reminder_count: number
          status: string
          updated_at: string
          use_case: string | null
        }
        Insert: {
          activation_completed_at?: string | null
          created_at?: string
          email: string
          email_send_count?: number
          id?: string
          invite_accepted_at?: string | null
          invite_opened_at?: string | null
          invite_sent_at?: string | null
          invite_token?: string | null
          invited?: boolean
          last_email_type_sent?: string | null
          last_reminder_sent_at?: string | null
          name: string
          notes?: string | null
          referral_code?: string | null
          referral_count?: number
          referral_reward_level?: number
          referred_by?: string | null
          reminder_count?: number
          status?: string
          updated_at?: string
          use_case?: string | null
        }
        Update: {
          activation_completed_at?: string | null
          created_at?: string
          email?: string
          email_send_count?: number
          id?: string
          invite_accepted_at?: string | null
          invite_opened_at?: string | null
          invite_sent_at?: string | null
          invite_token?: string | null
          invited?: boolean
          last_email_type_sent?: string | null
          last_reminder_sent_at?: string | null
          name?: string
          notes?: string | null
          referral_code?: string | null
          referral_count?: number
          referral_reward_level?: number
          referred_by?: string | null
          reminder_count?: number
          status?: string
          updated_at?: string
          use_case?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_analytics: { Args: never; Returns: Json }
      get_conversion_candidates: { Args: never; Returns: Json }
      submit_waitlist: {
        Args: {
          p_email: string
          p_name: string
          p_notes?: string
          p_referred_by?: string
          p_use_case?: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
