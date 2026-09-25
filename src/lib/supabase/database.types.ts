export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      box_pokemon: {
        Row: {
          atk_iv: number;
          charged_moves: string[];
          cp: number;
          created_at: string;
          def_iv: number;
          dex: number;
          fast_move: string | null;
          flag_best_buddy: boolean;
          flag_lucky: boolean;
          flag_purified: boolean;
          flag_shadow: boolean;
          flag_xl: boolean;
          form_label: string | null;
          hp_iv: number;
          id: string;
          level: number | null;
          note: string | null;
          screenshot_path: string | null;
          species_id: string;
          species_name: string;
          tags: string[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          atk_iv: number;
          charged_moves?: string[];
          cp: number;
          created_at?: string;
          def_iv: number;
          dex: number;
          fast_move?: string | null;
          flag_best_buddy?: boolean;
          flag_lucky?: boolean;
          flag_purified?: boolean;
          flag_shadow?: boolean;
          flag_xl?: boolean;
          form_label?: string | null;
          hp_iv: number;
          id?: string;
          level?: number | null;
          note?: string | null;
          screenshot_path?: string | null;
          species_id: string;
          species_name: string;
          tags?: string[];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          atk_iv?: number;
          charged_moves?: string[];
          cp?: number;
          created_at?: string;
          def_iv?: number;
          dex?: number;
          fast_move?: string | null;
          flag_best_buddy?: boolean;
          flag_lucky?: boolean;
          flag_purified?: boolean;
          flag_shadow?: boolean;
          flag_xl?: boolean;
          form_label?: string | null;
          hp_iv?: number;
          id?: string;
          level?: number | null;
          note?: string | null;
          screenshot_path?: string | null;
          species_id?: string;
          species_name?: string;
          tags?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          display_name: string | null;
          home_showcase: Json | null;
          id: string;
          migrated_local_box: boolean;
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string | null;
          home_showcase?: Json | null;
          id: string;
          migrated_local_box?: boolean;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string | null;
          home_showcase?: Json | null;
          id?: string;
          migrated_local_box?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      saved_teams: {
        Row: {
          closer: Json;
          created_at: string;
          cup: string;
          id: string;
          lead: Json;
          league_cp: number;
          name: string;
          switch: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          closer: Json;
          created_at?: string;
          cup?: string;
          id?: string;
          lead: Json;
          league_cp: number;
          name?: string;
          switch: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          closer?: Json;
          created_at?: string;
          cup?: string;
          id?: string;
          lead?: Json;
          league_cp?: number;
          name?: string;
          switch?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
