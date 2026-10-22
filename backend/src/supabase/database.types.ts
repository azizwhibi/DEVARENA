// Generated from dedicated Supabase dev project qorlygdcfwnrrzvzulcz through MCP.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      duel_matches: {
        Row: {
          id: string;
          player1_id: string | null;
          player2_id: string | null;
          player1_score: number;
          player2_score: number;
          winner_id: string | null;
          rounds_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          player1_id?: string | null;
          player2_id?: string | null;
          player1_score?: number;
          player2_score?: number;
          winner_id?: string | null;
          rounds_data?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          player1_id?: string | null;
          player2_id?: string | null;
          player1_score?: number;
          player2_score?: number;
          winner_id?: string | null;
          rounds_data?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_recommendations: {
        Row: {
          content: Json;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          content: Json;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          content?: Json;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_recommendations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      attempts: {
        Row: {
          accuracy: number;
          challenge_id: string;
          created_at: string;
          duration_ms: number | null;
          id: string;
          is_validated: boolean;
          metadata: Json | null;
          submitted_code: string | null;
          user_id: string | null;
        };
        Insert: {
          accuracy: number;
          challenge_id: string;
          created_at?: string;
          duration_ms?: number | null;
          id?: string;
          is_validated?: boolean;
          metadata?: Json | null;
          submitted_code?: string | null;
          user_id?: string | null;
        };
        Update: {
          accuracy?: number;
          challenge_id?: string;
          created_at?: string;
          duration_ms?: number | null;
          id?: string;
          is_validated?: boolean;
          metadata?: Json | null;
          submitted_code?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'attempts_challenge_id_fkey';
            columns: ['challenge_id'];
            isOneToOne: false;
            referencedRelation: 'challenges';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          after: Json | null;
          before: Json | null;
          created_at: string;
          id: string;
          target_id: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          id?: string;
          target_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          id?: string;
          target_id?: string | null;
        };
        Relationships: [];
      };
      challenges: {
        Row: {
          difficulty: string;
          duration_seconds: number | null;
          id: string;
          title: string;
        };
        Insert: {
          difficulty: string;
          duration_seconds?: number | null;
          id?: string;
          title: string;
        };
        Update: {
          difficulty?: string;
          duration_seconds?: number | null;
          id?: string;
          title?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          country: string | null;
          created_at: string;
          email: string;
          id: string;
          institution: string | null;
          institution_key: string | null;
          role: string;
          status: string;
          updated_at: string;
          username: string;
          visibility: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          country?: string | null;
          created_at?: string;
          email: string;
          id: string;
          institution?: string | null;
          institution_key?: string | null;
          role?: string;
          status?: string;
          updated_at?: string;
          username: string;
          visibility?: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          country?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          institution?: string | null;
          institution_key?: string | null;
          role?: string;
          status?: string;
          updated_at?: string;
          username?: string;
          visibility?: string;
        };
        Relationships: [];
      };
      profile_technologies: {
        Row: {
          created_at: string;
          profile_id: string;
          technology_id: string;
        };
        Insert: {
          created_at?: string;
          profile_id: string;
          technology_id: string;
        };
        Update: {
          created_at?: string;
          profile_id?: string;
          technology_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_technologies_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_technologies_technology_id_fkey';
            columns: ['technology_id'];
            isOneToOne: false;
            referencedRelation: 'technologies';
            referencedColumns: ['id'];
          },
        ];
      };
      skills: {
        Row: {
          id: string;
          is_active: boolean;
          name: string;
          technology_id: string | null;
        };
        Insert: {
          id?: string;
          is_active?: boolean;
          name: string;
          technology_id?: string | null;
        };
        Update: {
          id?: string;
          is_active?: boolean;
          name?: string;
          technology_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'skills_technology_id_fkey';
            columns: ['technology_id'];
            isOneToOne: false;
            referencedRelation: 'technologies';
            referencedColumns: ['id'];
          },
        ];
      };
      technologies: {
        Row: {
          id: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          id?: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          id?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      user_skill_history: {
        Row: {
          id: string;
          level_score: number;
          recorded_at: string;
          skill_id: string;
          user_id: string;
          validated_attempts: number;
        };
        Insert: {
          id?: string;
          level_score: number;
          recorded_at?: string;
          skill_id: string;
          user_id: string;
          validated_attempts: number;
        };
        Update: {
          id?: string;
          level_score?: number;
          recorded_at?: string;
          skill_id?: string;
          user_id?: string;
          validated_attempts?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'user_skill_history_skill_id_fkey';
            columns: ['skill_id'];
            isOneToOne: false;
            referencedRelation: 'skills';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_skill_history_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      user_skill_progress: {
        Row: {
          level_score: number;
          scoring_version: string | null;
          skill_id: string;
          status: string;
          updated_at: string;
          user_id: string;
          validated_attempts: number;
        };
        Insert: {
          level_score?: number;
          scoring_version?: string | null;
          skill_id: string;
          status?: string;
          updated_at?: string;
          user_id: string;
          validated_attempts?: number;
        };
        Update: {
          level_score?: number;
          scoring_version?: string | null;
          skill_id?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
          validated_attempts?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'user_skill_progress_skill_id_fkey';
            columns: ['skill_id'];
            isOneToOne: false;
            referencedRelation: 'skills';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_skill_progress_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      update_profile: {
        Args: {
          p_id: string;
          p_patch?: Json;
          p_technology_ids?: string[] | null;
        };
        Returns: Database['public']['Tables']['profiles']['Row'][];
      };
      admin_set_role: {
        Args: {
          p_actor: string;
          p_target: string;
          p_role: string;
        };
        Returns: Database['public']['Tables']['profiles']['Row'][];
      };
      admin_set_status: {
        Args: {
          p_actor: string;
          p_target: string;
          p_status: string;
          p_reason: string;
        };
        Returns: Database['public']['Tables']['profiles']['Row'][];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
