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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      capture_log: {
        Row: {
          attempt_at: string
          error_detail: string | null
          id: string
          kri_id: string
          linked_capture_id: string | null
          outcome: string
        }
        Insert: {
          attempt_at?: string
          error_detail?: string | null
          id?: string
          kri_id: string
          linked_capture_id?: string | null
          outcome: string
        }
        Update: {
          attempt_at?: string
          error_detail?: string | null
          id?: string
          kri_id?: string
          linked_capture_id?: string | null
          outcome?: string
        }
        Relationships: [
          {
            foreignKeyName: "capture_log_linked_capture_id_fkey"
            columns: ["linked_capture_id"]
            isOneToOne: false
            referencedRelation: "kri_captures"
            referencedColumns: ["id"]
          },
        ]
      }
      kri_captures: {
        Row: {
          captured_at: string
          edition_label: string
          edition_page_url: string
          file_sha256: string | null
          file_size_bytes: number | null
          file_source_url: string | null
          headline_unit: string | null
          headline_value: number | null
          id: string
          kri_id: string
          prior_value: number | null
          raw_extract: Json | null
          source_id: string
        }
        Insert: {
          captured_at?: string
          edition_label: string
          edition_page_url: string
          file_sha256?: string | null
          file_size_bytes?: number | null
          file_source_url?: string | null
          headline_unit?: string | null
          headline_value?: number | null
          id?: string
          kri_id: string
          prior_value?: number | null
          raw_extract?: Json | null
          source_id: string
        }
        Update: {
          captured_at?: string
          edition_label?: string
          edition_page_url?: string
          file_sha256?: string | null
          file_size_bytes?: number | null
          file_source_url?: string | null
          headline_unit?: string | null
          headline_value?: number | null
          id?: string
          kri_id?: string
          prior_value?: number | null
          raw_extract?: Json | null
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kri_captures_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      kri_definitions: {
        Row: {
          description: string | null
          display_name: string
          display_order: number
          id: string
          illustrative_status: string | null
          illustrative_target: number | null
          illustrative_trend: string | null
          illustrative_value: number | null
          is_live: boolean
          kri_id: string
        }
        Insert: {
          description?: string | null
          display_name: string
          display_order?: number
          id?: string
          illustrative_status?: string | null
          illustrative_target?: number | null
          illustrative_trend?: string | null
          illustrative_value?: number | null
          is_live?: boolean
          kri_id: string
        }
        Update: {
          description?: string | null
          display_name?: string
          display_order?: number
          id?: string
          illustrative_status?: string | null
          illustrative_target?: number | null
          illustrative_trend?: string | null
          illustrative_value?: number | null
          is_live?: boolean
          kri_id?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          edition_page_url_pattern: string
          file_format: string
          id: string
          kri_id: string
          last_known_file_url: string | null
          publication_name: string
          publisher: string
          series_landing_page_url: string
          simulate_failure: boolean
          update_cadence: string
          updated_at: string
        }
        Insert: {
          edition_page_url_pattern: string
          file_format?: string
          id?: string
          kri_id: string
          last_known_file_url?: string | null
          publication_name: string
          publisher: string
          series_landing_page_url: string
          simulate_failure?: boolean
          update_cadence: string
          updated_at?: string
        }
        Update: {
          edition_page_url_pattern?: string
          file_format?: string
          id?: string
          kri_id?: string
          last_known_file_url?: string | null
          publication_name?: string
          publisher?: string
          series_landing_page_url?: string
          simulate_failure?: boolean
          update_cadence?: string
          updated_at?: string
        }
        Relationships: []
      }
      thresholds: {
        Row: {
          effective_from: string
          id: string
          is_official_nhs_target: boolean
          kri_id: string
          methodology_label: string
          methodology_long: string | null
          methodology_n: number | null
          methodology_window_end: string | null
          methodology_window_start: string | null
          qualifier_label: string | null
          rationale: string | null
          threshold_type: string
          threshold_value: number
          trust_override_captured_at: string | null
          trust_override_source: string | null
          trust_override_value: number | null
          units: string
          updated_at: string
        }
        Insert: {
          effective_from?: string
          id?: string
          is_official_nhs_target?: boolean
          kri_id: string
          methodology_label: string
          methodology_long?: string | null
          methodology_n?: number | null
          methodology_window_end?: string | null
          methodology_window_start?: string | null
          qualifier_label?: string | null
          rationale?: string | null
          threshold_type?: string
          threshold_value: number
          trust_override_captured_at?: string | null
          trust_override_source?: string | null
          trust_override_value?: number | null
          units?: string
          updated_at?: string
        }
        Update: {
          effective_from?: string
          id?: string
          is_official_nhs_target?: boolean
          kri_id?: string
          methodology_label?: string
          methodology_long?: string | null
          methodology_n?: number | null
          methodology_window_end?: string | null
          methodology_window_start?: string | null
          qualifier_label?: string | null
          rationale?: string | null
          threshold_type?: string
          threshold_value?: number
          trust_override_captured_at?: string | null
          trust_override_source?: string | null
          trust_override_value?: number | null
          units?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "thresholds_kri_id_fkey"
            columns: ["kri_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["kri_id"]
          },
        ]
      }
    }
    Views: {
      capture_log_public: {
        Row: {
          attempt_at: string | null
          id: string | null
          kri_id: string | null
          outcome: string | null
        }
        Insert: {
          attempt_at?: string | null
          id?: string | null
          kri_id?: string | null
          outcome?: string | null
        }
        Update: {
          attempt_at?: string | null
          id?: string | null
          kri_id?: string | null
          outcome?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
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
