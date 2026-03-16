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
      ai_generated_questions: {
        Row: {
          class_id: string
          correct_option: number
          created_at: string
          difficulty: string
          generated_by: string
          id: string
          is_approved: boolean
          options: Json
          points: number
          question_text: string
          question_type: string
          subject_id: string
          topic_id: string
        }
        Insert: {
          class_id: string
          correct_option?: number
          created_at?: string
          difficulty?: string
          generated_by?: string
          id?: string
          is_approved?: boolean
          options?: Json
          points?: number
          question_text: string
          question_type?: string
          subject_id: string
          topic_id: string
        }
        Update: {
          class_id?: string
          correct_option?: number
          created_at?: string
          difficulty?: string
          generated_by?: string
          id?: string
          is_approved?: boolean
          options?: Json
          points?: number
          question_text?: string
          question_type?: string
          subject_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generated_questions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "syllabus_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generated_questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "syllabus_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generated_questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "syllabus_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      centers: {
        Row: {
          address: string | null
          center_code: string
          center_name: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          mobile: string | null
          owner_block: string | null
          owner_district: string | null
          owner_pin_code: string | null
          owner_state: string | null
          owner_tahsil: string | null
          owner_village: string | null
          payment_verified: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          center_code: string
          center_name: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          mobile?: string | null
          owner_block?: string | null
          owner_district?: string | null
          owner_pin_code?: string | null
          owner_state?: string | null
          owner_tahsil?: string | null
          owner_village?: string | null
          payment_verified?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          center_code?: string
          center_name?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          mobile?: string | null
          owner_block?: string | null
          owner_district?: string | null
          owner_pin_code?: string | null
          owner_state?: string | null
          owner_tahsil?: string | null
          owner_village?: string | null
          payment_verified?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          attempt_id: string
          certificate_id: string
          class: number | null
          created_at: string
          exam_name: string | null
          father_name: string | null
          id: string
          qr_code_data: string | null
          rank: number | null
          score: number | null
          student_id: string
          student_name: string
          year: number | null
        }
        Insert: {
          attempt_id: string
          certificate_id: string
          class?: number | null
          created_at?: string
          exam_name?: string | null
          father_name?: string | null
          id?: string
          qr_code_data?: string | null
          rank?: number | null
          score?: number | null
          student_id: string
          student_name: string
          year?: number | null
        }
        Update: {
          attempt_id?: string
          certificate_id?: string
          class?: number | null
          created_at?: string
          exam_name?: string | null
          father_name?: string | null
          id?: string
          qr_code_data?: string | null
          rank?: number | null
          score?: number | null
          student_id?: string
          student_name?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          center_code: string | null
          commission_amount: number
          created_at: string
          description: string | null
          id: string
          payment_id: string | null
          referral_code: string | null
          role: string
          student_id: string
        }
        Insert: {
          center_code?: string | null
          commission_amount: number
          created_at?: string
          description?: string | null
          id?: string
          payment_id?: string | null
          referral_code?: string | null
          role: string
          student_id: string
        }
        Update: {
          center_code?: string | null
          commission_amount?: number
          created_at?: string
          description?: string | null
          id?: string
          payment_id?: string | null
          referral_code?: string | null
          role?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_answers: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean | null
          question_id: string
          selected_option: number | null
          time_taken: number | null
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_option?: number | null
          time_taken?: number | null
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_option?: number | null
          time_taken?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          correct_answers: number | null
          created_at: string
          end_time: string | null
          id: string
          is_completed: boolean | null
          score: number | null
          start_time: string
          student_id: string
          time_taken: number | null
          total_questions: number | null
          wrong_answers: number | null
        }
        Insert: {
          correct_answers?: number | null
          created_at?: string
          end_time?: string | null
          id?: string
          is_completed?: boolean | null
          score?: number | null
          start_time?: string
          student_id: string
          time_taken?: number | null
          total_questions?: number | null
          wrong_answers?: number | null
        }
        Update: {
          correct_answers?: number | null
          created_at?: string
          end_time?: string | null
          id?: string
          is_completed?: boolean | null
          score?: number | null
          start_time?: string
          student_id?: string
          time_taken?: number | null
          total_questions?: number | null
          wrong_answers?: number | null
        }
        Relationships: []
      }
      exam_schedules: {
        Row: {
          class_id: string
          created_at: string
          difficulty: string
          exam_day: number
          exam_duration_minutes: number
          id: string
          is_active: boolean
          num_questions: number
          question_type: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          difficulty?: string
          exam_day?: number
          exam_duration_minutes?: number
          id?: string
          is_active?: boolean
          num_questions?: number
          question_type?: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          difficulty?: string
          exam_day?: number
          exam_duration_minutes?: number
          id?: string
          is_active?: boolean
          num_questions?: number
          question_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: true
            referencedRelation: "syllabus_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_photos: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      payment_orders: {
        Row: {
          amount: number
          created_at: string
          id: string
          metadata: Json | null
          order_type: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          metadata?: Json | null
          order_type: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          order_type?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          block: string | null
          center_code: string | null
          class: number | null
          created_at: string
          district: string | null
          email: string | null
          father_name: string | null
          full_name: string | null
          id: string
          mobile: string | null
          photo_url: string | null
          pin_code: string | null
          profile_completed: boolean | null
          referral_code: string | null
          referred_by: string | null
          school_address: string | null
          school_block: string | null
          school_district: string | null
          school_mobile: string | null
          school_name: string | null
          school_pin_code: string | null
          school_state: string | null
          school_tahsil: string | null
          school_village: string | null
          state: string | null
          tahsil: string | null
          updated_at: string
          user_id: string
          village: string | null
        }
        Insert: {
          block?: string | null
          center_code?: string | null
          class?: number | null
          created_at?: string
          district?: string | null
          email?: string | null
          father_name?: string | null
          full_name?: string | null
          id?: string
          mobile?: string | null
          photo_url?: string | null
          pin_code?: string | null
          profile_completed?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          school_address?: string | null
          school_block?: string | null
          school_district?: string | null
          school_mobile?: string | null
          school_name?: string | null
          school_pin_code?: string | null
          school_state?: string | null
          school_tahsil?: string | null
          school_village?: string | null
          state?: string | null
          tahsil?: string | null
          updated_at?: string
          user_id: string
          village?: string | null
        }
        Update: {
          block?: string | null
          center_code?: string | null
          class?: number | null
          created_at?: string
          district?: string | null
          email?: string | null
          father_name?: string | null
          full_name?: string | null
          id?: string
          mobile?: string | null
          photo_url?: string | null
          pin_code?: string | null
          profile_completed?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          school_address?: string | null
          school_block?: string | null
          school_district?: string | null
          school_mobile?: string | null
          school_name?: string | null
          school_pin_code?: string | null
          school_state?: string | null
          school_tahsil?: string | null
          school_village?: string | null
          state?: string | null
          tahsil?: string | null
          updated_at?: string
          user_id?: string
          village?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          class_group: string
          correct_option: number
          created_at: string
          id: string
          is_active: boolean | null
          options: Json
          points: number
          question_text: string
          time_limit: number
        }
        Insert: {
          class_group: string
          correct_option: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          options: Json
          points?: number
          question_text: string
          time_limit?: number
        }
        Update: {
          class_group?: string
          correct_option?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          options?: Json
          points?: number
          question_text?: string
          time_limit?: number
        }
        Relationships: []
      }
      scheduled_exam_questions: {
        Row: {
          created_at: string
          id: string
          question_id: string
          question_order: number
          scheduled_exam_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          question_order?: number
          scheduled_exam_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          question_order?: number
          scheduled_exam_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_exam_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "ai_generated_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_exam_questions_scheduled_exam_id_fkey"
            columns: ["scheduled_exam_id"]
            isOneToOne: false
            referencedRelation: "scheduled_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_exams: {
        Row: {
          class_id: string
          created_at: string
          exam_date: string
          exam_duration_minutes: number
          id: string
          schedule_id: string
          status: string
          total_questions: number
        }
        Insert: {
          class_id: string
          created_at?: string
          exam_date: string
          exam_duration_minutes?: number
          id?: string
          schedule_id: string
          status?: string
          total_questions?: number
        }
        Update: {
          class_id?: string
          created_at?: string
          exam_date?: string
          exam_duration_minutes?: number
          id?: string
          schedule_id?: string
          status?: string
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "syllabus_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_exams_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "exam_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarship_fund: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_order_id: string | null
          source: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_order_id?: string | null
          source: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_order_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_fund_payment_order_id_fkey"
            columns: ["payment_order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarship_winners: {
        Row: {
          category: string
          created_at: string
          exam_score: number | null
          final_score: number | null
          id: string
          payment_status: string
          prize_amount: number
          rank: number
          referral_bonus: number | null
          student_id: string
        }
        Insert: {
          category: string
          created_at?: string
          exam_score?: number | null
          final_score?: number | null
          id?: string
          payment_status?: string
          prize_amount: number
          rank: number
          referral_bonus?: number | null
          student_id: string
        }
        Update: {
          category?: string
          created_at?: string
          exam_score?: number | null
          final_score?: number | null
          id?: string
          payment_status?: string
          prize_amount?: number
          rank?: number
          referral_bonus?: number | null
          student_id?: string
        }
        Relationships: []
      }
      syllabus_classes: {
        Row: {
          class_name: string
          class_number: number
          created_at: string
          id: string
          is_active: boolean
        }
        Insert: {
          class_name: string
          class_number: number
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Update: {
          class_name?: string
          class_number?: number
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      syllabus_subjects: {
        Row: {
          class_id: string
          created_at: string
          id: string
          is_active: boolean
          subject_name: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          subject_name: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          subject_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "syllabus_subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "syllabus_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      syllabus_topics: {
        Row: {
          class_id: string
          created_at: string
          id: string
          status: string
          subject_id: string
          topic_name: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          status?: string
          subject_id: string
          topic_name: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          status?: string
          subject_id?: string
          topic_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "syllabus_topics_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "syllabus_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "syllabus_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_note: string | null
          amount: number
          bank_details: string | null
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
          upi_id: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          bank_details?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          upi_id?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          bank_details?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          upi_id?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_center_code: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "center" | "admin" | "super_admin"
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
    Enums: {
      app_role: ["student", "center", "admin", "super_admin"],
    },
  },
} as const
