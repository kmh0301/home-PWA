export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      account_events: {
        Row: {
          account_id: string;
          amount_cents: number;
          balance_after_cents: number;
          created_at: string;
          event_type: Database["public"]["Enums"]["account_event_type"];
          household_id: string;
          id: string;
          note: string | null;
          reference_id: string | null;
          reference_type: string | null;
          user_id: string;
        };
        Insert: {
          account_id: string;
          amount_cents: number;
          balance_after_cents: number;
          created_at?: string;
          event_type: Database["public"]["Enums"]["account_event_type"];
          household_id: string;
          id?: string;
          note?: string | null;
          reference_id?: string | null;
          reference_type?: string | null;
          user_id: string;
        };
        Update: Partial<{
          account_id: string;
          amount_cents: number;
          balance_after_cents: number;
          created_at: string;
          event_type: Database["public"]["Enums"]["account_event_type"];
          household_id: string;
          id: string;
          note: string | null;
          reference_id: string | null;
          reference_type: string | null;
          user_id: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "account_events_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "payment_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_events_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      household_invites: {
        Row: {
          code: string;
          created_at: string;
          created_by: string;
          expires_at: string;
          household_id: string;
          id: string;
          used_at: string | null;
          used_by: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by: string;
          expires_at: string;
          household_id: string;
          id?: string;
          used_at?: string | null;
          used_by?: string | null;
        };
        Update: Partial<{
          code: string;
          created_at: string;
          created_by: string;
          expires_at: string;
          household_id: string;
          id: string;
          used_at: string | null;
          used_by: string | null;
        }>;
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      household_members: {
        Row: {
          avatar_url: string | null;
          display_name: string;
          household_id: string;
          id: string;
          joined_at: string;
          notification_prefs: Json;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          display_name: string;
          household_id: string;
          id?: string;
          joined_at?: string;
          notification_prefs?: Json;
          user_id: string;
        };
        Update: Partial<{
          avatar_url: string | null;
          display_name: string;
          household_id: string;
          id: string;
          joined_at: string;
          notification_prefs: Json;
          user_id: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      households: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          owner_user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          owner_user_id?: string;
        };
        Update: Partial<{
          created_at: string;
          id: string;
          name: string;
          owner_user_id: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "households_owner_user_id_fkey";
            columns: ["owner_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_accounts: {
        Row: {
          balance_cents: number;
          created_at: string;
          credit_limit_cents: number | null;
          credit_used_cents: number | null;
          household_id: string;
          id: string;
          is_archived: boolean;
          name: string;
          type: Database["public"]["Enums"]["payment_account_type"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          balance_cents?: number;
          created_at?: string;
          credit_limit_cents?: number | null;
          credit_used_cents?: number | null;
          household_id: string;
          id?: string;
          is_archived?: boolean;
          name: string;
          type: Database["public"]["Enums"]["payment_account_type"];
          updated_at?: string;
          user_id: string;
        };
        Update: Partial<{
          balance_cents: number;
          created_at: string;
          credit_limit_cents: number | null;
          credit_used_cents: number | null;
          household_id: string;
          id: string;
          is_archived: boolean;
          name: string;
          type: Database["public"]["Enums"]["payment_account_type"];
          updated_at: string;
          user_id: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "payment_accounts_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      claim_invite: {
        Args: {
          p_code: string;
          p_display_name: string;
        };
        Returns: string;
      };
      get_user_household_ids: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      record_manual_adjustment: {
        Args: {
          p_account_id: string;
          p_household_id: string;
          p_new_balance_cents: number;
          p_note?: string | null;
        };
        Returns: undefined;
      };
      set_credit_card_used_balance: {
        Args: {
          p_account_id: string;
          p_credit_used_cents: number;
          p_household_id: string;
          p_note?: string | null;
        };
        Returns: undefined;
      };
      validate_invite_code: {
        Args: {
          p_code: string;
        };
        Returns: {
          expires_at: string;
          household_id: string;
          household_name: string;
          is_valid: boolean;
        }[];
      };
    };
    Enums: {
      account_event_type:
        | "expense"
        | "top_up"
        | "credit_repayment"
        | "refund"
        | "transfer_out"
        | "transfer_in"
        | "settlement_repayment"
        | "saving_transfer"
        | "manual_adjustment";
      payment_account_type: "alipay_hk" | "payme" | "cash" | "credit_card" | "custom";
    };
    CompositeTypes: Record<string, never>;
  };
};
