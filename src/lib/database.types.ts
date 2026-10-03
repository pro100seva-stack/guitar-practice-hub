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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          include_default_exercises: boolean
          language: string
          metronome_beats: number
          metronome_bpm: number
          onboarding_tour_pending: boolean
          show_completed_weeks: boolean
          show_target_practice_time: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          include_default_exercises?: boolean
          language?: string
          metronome_beats?: number
          metronome_bpm?: number
          onboarding_tour_pending?: boolean
          show_completed_weeks?: boolean
          show_target_practice_time?: boolean
          updated_at?: string
          user_id?: string
        }
        Update: {
          include_default_exercises?: boolean
          language?: string
          metronome_beats?: number
          metronome_bpm?: number
          onboarding_tour_pending?: boolean
          show_completed_weeks?: boolean
          show_target_practice_time?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      block_templates: {
        Row: {
          description: string | null
          id: string
          key: string
          label: string
          phase: string
          sort_order: number
          target_minutes: number
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          label: string
          phase: string
          sort_order?: number
          target_minutes: number
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          label?: string
          phase?: string
          sort_order?: number
          target_minutes?: number
        }
        Relationships: []
      }
      plan_weeks: {
        Row: {
          created_at: string
          end_date: string | null
          focus: string
          id: string
          program_id: string
          program_sequence: number
          start_date: string | null
          tasks: string | null
          updated_at: string
          user_id: string
          week_number: number | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          focus: string
          id?: string
          program_id: string
          program_sequence: number
          start_date?: string | null
          tasks?: string | null
          updated_at?: string
          user_id?: string
          week_number?: number | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          focus?: string
          id?: string
          program_id?: string
          program_sequence?: number
          start_date?: string | null
          tasks?: string | null
          updated_at?: string
          user_id?: string
          week_number?: number | null
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          id: string
          language: string
          name: string
          status: string
          total_weeks: number
          is_default: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string
          name: string
          status?: string
          total_weeks?: number
          is_default?: boolean
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          name?: string
          status?: string
          total_weeks?: number
          is_default?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_blocks: {
        Row: {
          actual_minutes: number | null
          block_key: string
          done: boolean
          id: string
          label: string
          session_id: string
          target_minutes: number | null
        }
        Insert: {
          actual_minutes?: number | null
          block_key: string
          done?: boolean
          id?: string
          label: string
          session_id: string
          target_minutes?: number | null
        }
        Update: {
          actual_minutes?: number | null
          block_key?: string
          done?: boolean
          id?: string
          label?: string
          session_id?: string
          target_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_blocks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          comment: string | null
          id: string
          logged_at: string
          session_date: string
          source: string
          total_minutes: number
          user_id: string
          week_id: string | null
        }
        Insert: {
          comment?: string | null
          id?: string
          logged_at?: string
          session_date: string
          source?: string
          total_minutes?: number
          user_id?: string
          week_id?: string | null
        }
        Update: {
          comment?: string | null
          id?: string
          logged_at?: string
          session_date?: string
          source?: string
          total_minutes?: number
          user_id?: string
          week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "plan_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          status: string
          tuning: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          status?: string
          tuning?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          status?: string
          tuning?: string | null
          user_id?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          done: boolean
          id: string
          name: string
          sort_order: number
          source: string | null
          week_id: string
        }
        Insert: {
          done?: boolean
          id?: string
          name: string
          sort_order?: number
          source?: string | null
          week_id: string
        }
        Update: {
          done?: boolean
          id?: string
          name?: string
          sort_order?: number
          source?: string | null
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "plan_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      week_songs: {
        Row: {
          song_id: string
          week_id: string
        }
        Insert: {
          song_id: string
          week_id: string
        }
        Update: {
          song_id?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "week_songs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "week_songs_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "plan_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_plan_week_program: {
        Args: { p_program_id: string; p_week_id: string }
        Returns: undefined
      }
      insert_plan_week: {
        Args: {
          p_end_date: string
          p_focus: string
          p_insert_after_week_id: string
          p_program_id: string
          p_start_date: string
          p_tasks: string | null
        }
        Returns: string
      }
      add_plan_week: {
        Args: {
          p_end_date: string
          p_focus: string
          p_insert_after_week_id?: string
          p_program_id: string
          p_start_date: string
          p_tasks: string | null
        }
        Returns: string
      }
      pause_active_program: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      pause_current_program: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      remove_plan_week: {
        Args: { p_week_id: string }
        Returns: string
      }
      reschedule_plan_week: {
        Args: { p_end_date: string; p_start_date: string; p_week_id: string }
        Returns: undefined
      }
      resume_program: {
        Args: { target_program_id: string }
        Returns: string
      }
      start_custom_program: {
        Args: { program_name: string }
        Returns: string
      }
      start_default_program: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      sync_program_status: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
