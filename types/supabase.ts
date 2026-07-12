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
      ads: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          link_url: string | null
          provider_id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          provider_id: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          provider_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      availability: {
        Row: {
          active: boolean
          day_key: string
          id: string
          provider_id: string
          slots: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          day_key: string
          id?: string
          provider_id: string
          slots?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          day_key?: string
          id?: string
          provider_id?: string
          slots?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string
          confirmation_sent: boolean | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          message: string | null
          notification_sent: boolean | null
          preferred_date: string | null
          preferred_slot: string | null
          provider_id: string | null
          requested_slot: string | null
          service: string | null
          service_requested: string | null
          status: string | null
          status_updated_at: string | null
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone: string
          confirmation_sent?: boolean | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          message?: string | null
          notification_sent?: boolean | null
          preferred_date?: string | null
          preferred_slot?: string | null
          provider_id?: string | null
          requested_slot?: string | null
          service?: string | null
          service_requested?: string | null
          status?: string | null
          status_updated_at?: string | null
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string
          confirmation_sent?: boolean | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          message?: string | null
          notification_sent?: boolean | null
          preferred_date?: string | null
          preferred_slot?: string | null
          provider_id?: string | null
          requested_slot?: string | null
          service?: string | null
          service_requested?: string | null
          status?: string | null
          status_updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      clause_library: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          is_system: boolean
          persona: string
          provider_id: string | null
          tags: Json
          title: string
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          id?: string
          is_system?: boolean
          persona?: string
          provider_id?: string | null
          tags?: Json
          title: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_system?: boolean
          persona?: string
          provider_id?: string | null
          tags?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "clause_library_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_doc_templates: {
        Row: {
          body_scaffold: string | null
          created_at: string
          description: string | null
          doc_type: string
          fields: Json
          id: string
          is_system: boolean
          label: string
          persona: string
          provider_id: string | null
        }
        Insert: {
          body_scaffold?: string | null
          created_at?: string
          description?: string | null
          doc_type: string
          fields?: Json
          id?: string
          is_system?: boolean
          label: string
          persona?: string
          provider_id?: string | null
        }
        Update: {
          body_scaffold?: string | null
          created_at?: string
          description?: string | null
          doc_type?: string
          fields?: Json
          id?: string
          is_system?: boolean
          label?: string
          persona?: string
          provider_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_doc_templates_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_notes: {
        Row: {
          assessment: string
          body: string
          body_chart: Json
          created_at: string
          id: string
          note_type: string
          objective: string
          plan: string
          provider_id: string
          share_token: string | null
          status: string
          student_id: string | null
          subjective: string
          updated_at: string
          visit_date: string
        }
        Insert: {
          assessment?: string
          body?: string
          body_chart?: Json
          created_at?: string
          id?: string
          note_type?: string
          objective?: string
          plan?: string
          provider_id: string
          share_token?: string | null
          status?: string
          student_id?: string | null
          subjective?: string
          updated_at?: string
          visit_date?: string
        }
        Update: {
          assessment?: string
          body?: string
          body_chart?: Json
          created_at?: string
          id?: string
          note_type?: string
          objective?: string
          plan?: string
          provider_id?: string
          share_token?: string | null
          status?: string
          student_id?: string | null
          subjective?: string
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_notes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_templates: {
        Row: {
          body_scaffold: string | null
          created_at: string
          description: string | null
          doc_type: string
          fields: Json
          id: string
          is_system: boolean
          label: string
          persona: string
          provider_id: string | null
        }
        Insert: {
          body_scaffold?: string | null
          created_at?: string
          description?: string | null
          doc_type: string
          fields?: Json
          id?: string
          is_system?: boolean
          label: string
          persona?: string
          provider_id?: string | null
        }
        Update: {
          body_scaffold?: string | null
          created_at?: string
          description?: string | null
          doc_type?: string
          fields?: Json
          id?: string
          is_system?: boolean
          label?: string
          persona?: string
          provider_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "draft_templates_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      drafting_usage: {
        Row: {
          count: number
          day_key: string
          provider_id: string
        }
        Insert: {
          count?: number
          day_key: string
          provider_id: string
        }
        Update: {
          count?: number
          day_key?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drafting_usage_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      drafts: {
        Row: {
          body: string
          created_at: string
          doc_type: string
          format: string
          id: string
          provider_id: string
          share_token: string | null
          status: string
          student_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          doc_type: string
          format?: string
          id?: string
          provider_id: string
          share_token?: string | null
          status?: string
          student_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          doc_type?: string
          format?: string
          id?: string
          provider_id?: string
          share_token?: string | null
          status?: string
          student_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drafts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drafts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_library: {
        Row: {
          category: string
          created_at: string
          default_duration: string | null
          default_hold: number | null
          default_reps: number | null
          default_sets: number
          description: string
          id: string
          instructions: string
          is_system: boolean
          media_url: string | null
          name: string
          persona: string
          provider_id: string | null
          tags: Json
        }
        Insert: {
          category: string
          created_at?: string
          default_duration?: string | null
          default_hold?: number | null
          default_reps?: number | null
          default_sets?: number
          description?: string
          id?: string
          instructions?: string
          is_system?: boolean
          media_url?: string | null
          name: string
          persona?: string
          provider_id?: string | null
          tags?: Json
        }
        Update: {
          category?: string
          created_at?: string
          default_duration?: string | null
          default_hold?: number | null
          default_reps?: number | null
          default_sets?: number
          description?: string
          id?: string
          instructions?: string
          is_system?: boolean
          media_url?: string | null
          name?: string
          persona?: string
          provider_id?: string | null
          tags?: Json
        }
        Relationships: [
          {
            foreignKeyName: "exercise_library_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      hep_programs: {
        Row: {
          body: string
          created_at: string
          exercises: Json
          id: string
          instructions: string
          provider_id: string
          share_token: string | null
          status: string
          student_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          exercises?: Json
          id?: string
          instructions?: string
          provider_id: string
          share_token?: string | null
          status?: string
          student_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          exercises?: Json
          id?: string
          instructions?: string
          provider_id?: string
          share_token?: string | null
          status?: string
          student_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hep_programs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hep_programs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      outcome_measures: {
        Row: {
          created_at: string
          id: string
          measure_type: string
          notes: string | null
          provider_id: string
          recorded_date: string
          score: number | null
          student_id: string
          unit: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          measure_type: string
          notes?: string | null
          provider_id: string
          recorded_date?: string
          score?: number | null
          student_id: string
          unit?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          measure_type?: string
          notes?: string | null
          provider_id?: string
          recorded_date?: string
          score?: number | null
          student_id?: string
          unit?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "outcome_measures_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_measures_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          body: string
          created_at: string
          diagnosis: string
          duration_weeks: number | null
          frequency: string
          goals: Json
          id: string
          modalities: Json
          phases: Json
          provider_id: string
          status: string
          student_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          diagnosis?: string
          duration_weeks?: number | null
          frequency?: string
          goals?: Json
          id?: string
          modalities?: Json
          phases?: Json
          provider_id: string
          status?: string
          student_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          diagnosis?: string
          duration_weeks?: number | null
          frequency?: string
          goals?: Json
          id?: string
          modalities?: Json
          phases?: Json
          provider_id?: string
          status?: string
          student_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      working_usage: {
        Row: {
          count: number
          day_key: string
          provider_id: string
        }
        Insert: {
          count?: number
          day_key: string
          provider_id: string
        }
        Update: {
          count?: number
          day_key?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "working_usage_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
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

export const Constants = {
  public: {
    Enums: {},
  },
} as const
