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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity: {
        Row: {
          actor: string | null
          created_at: string
          household_id: string
          id: number
          kind: string
          payload: Json
          ref_id: string | null
        }
        Insert: {
          actor?: string | null
          created_at?: string
          household_id: string
          id?: never
          kind: string
          payload?: Json
          ref_id?: string | null
        }
        Update: {
          actor?: string | null
          created_at?: string
          household_id?: string
          id?: never
          kind?: string
          payload?: Json
          ref_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      chore_logs: {
        Row: {
          chore_id: string | null
          completed_at: string
          household_id: string
          id: string
          joint: boolean
          points: number
          rescue: boolean
          title: string
          user_id: string
        }
        Insert: {
          chore_id?: string | null
          completed_at?: string
          household_id: string
          id?: string
          joint?: boolean
          points: number
          rescue?: boolean
          title: string
          user_id: string
        }
        Update: {
          chore_id?: string | null
          completed_at?: string
          household_id?: string
          id?: string
          joint?: boolean
          points?: number
          rescue?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chore_logs_chore_id_fkey"
            columns: ["chore_id"]
            isOneToOne: false
            referencedRelation: "chores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_logs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chores: {
        Row: {
          archived_at: string | null
          assignee: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          effort: number
          household_id: string
          id: string
          is_joint: boolean
          recurrence: string
          rotate: boolean
          snooze_count: number
          title: string
        }
        Insert: {
          archived_at?: string | null
          assignee?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          effort?: number
          household_id: string
          id?: string
          is_joint?: boolean
          recurrence?: string
          rotate?: boolean
          snooze_count?: number
          title: string
        }
        Update: {
          archived_at?: string | null
          assignee?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          effort?: number
          household_id?: string
          id?: string
          is_joint?: boolean
          recurrence?: string
          rotate?: boolean
          snooze_count?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chores_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chores_household_id_assignee_fkey"
            columns: ["household_id", "assignee"]
            isOneToOne: false
            referencedRelation: "balances"
            referencedColumns: ["household_id", "user_id"]
          },
          {
            foreignKeyName: "chores_household_id_assignee_fkey"
            columns: ["household_id", "assignee"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["household_id", "user_id"]
          },
          {
            foreignKeyName: "chores_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      date_idea_marks: {
        Row: {
          done_on: string | null
          household_id: string
          idea_id: string
          rating: number | null
          saved: boolean
          updated_at: string
        }
        Insert: {
          done_on?: string | null
          household_id: string
          idea_id: string
          rating?: number | null
          saved?: boolean
          updated_at?: string
        }
        Update: {
          done_on?: string | null
          household_id?: string
          idea_id?: string
          rating?: number | null
          saved?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "date_idea_marks_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "date_idea_marks_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "date_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      date_ideas: {
        Row: {
          category: string
          cost_level: number
          created_at: string
          created_by: string | null
          description: string | null
          household_id: string | null
          id: string
          locale: string | null
          title: string
        }
        Insert: {
          category?: string
          cost_level?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          household_id?: string | null
          id?: string
          locale?: string | null
          title: string
        }
        Update: {
          category?: string
          cost_level?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          household_id?: string | null
          id?: string
          locale?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "date_ideas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "date_ideas_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean
          created_at: string
          created_by: string | null
          ends_at: string | null
          household_id: string
          id: string
          location: string | null
          notes: string | null
          reminder_minutes: number | null
          starts_at: string
          title: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          household_id: string
          id?: string
          location?: string | null
          notes?: string | null
          reminder_minutes?: number | null
          starts_at: string
          title: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          household_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          reminder_minutes?: number | null
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_shares: {
        Row: {
          expense_id: string
          household_id: string
          share_agorot: number
          user_id: string
        }
        Insert: {
          expense_id: string
          household_id: string
          share_agorot: number
          user_id: string
        }
        Update: {
          expense_id?: string
          household_id?: string
          share_agorot?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_shares_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_shares_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_agorot: number
          category: string | null
          created_at: string
          created_by: string | null
          household_id: string
          id: string
          paid_by: string
          receipt_path: string | null
          spent_on: string
          split_mode: string
          title: string
        }
        Insert: {
          amount_agorot: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          household_id: string
          id?: string
          paid_by: string
          receipt_path?: string | null
          spent_on: string
          split_mode: string
          title: string
        }
        Update: {
          amount_agorot?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          household_id?: string
          id?: string
          paid_by?: string
          receipt_path?: string | null
          spent_on?: string
          split_mode?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_contributions: {
        Row: {
          amount_agorot: number
          created_at: string
          goal_id: string
          household_id: string
          id: string
          user_id: string
        }
        Insert: {
          amount_agorot: number
          created_at?: string
          goal_id: string
          household_id: string
          id?: string
          user_id?: string
        }
        Update: {
          amount_agorot?: number
          created_at?: string
          goal_id?: string
          household_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          created_by: string | null
          done_at: string | null
          due_date: string | null
          emoji: string | null
          household_id: string
          id: string
          saved_agorot: number
          target_agorot: number | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          done_at?: string | null
          due_date?: string | null
          emoji?: string | null
          household_id: string
          id?: string
          saved_agorot?: number
          target_agorot?: number | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          done_at?: string | null
          due_date?: string | null
          emoji?: string | null
          household_id?: string
          id?: string
          saved_agorot?: number
          target_agorot?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          color_index: number
          household_id: string
          joined_at: string
          role: string
          share_percent: number | null
          user_id: string
        }
        Insert: {
          color_index?: number
          household_id: string
          joined_at?: string
          role?: string
          share_percent?: number | null
          user_id: string
        }
        Update: {
          color_index?: number
          household_id?: string
          joined_at?: string
          role?: string
          share_percent?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          birthday_heads_up: boolean | null
          created_at: string
          created_by: string | null
          id: string
          monthly_budget_agorot: number | null
          name: string
          split_mode: string
          timezone: string
          type: string
          updated_at: string
          weekly_reward: string | null
        }
        Insert: {
          birthday_heads_up?: boolean | null
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_budget_agorot?: number | null
          name: string
          split_mode?: string
          timezone?: string
          type: string
          updated_at?: string
          weekly_reward?: string | null
        }
        Update: {
          birthday_heads_up?: boolean | null
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_budget_agorot?: number | null
          name?: string
          split_mode?: string
          timezone?: string
          type?: string
          updated_at?: string
          weekly_reward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "households_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string
          household_id: string
          id: string
          max_uses: number
          revoked_at: string | null
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          household_id: string
          id?: string
          max_uses?: number
          revoked_at?: string | null
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          household_id?: string
          id?: string
          max_uses?: number
          revoked_at?: string | null
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      kudos: {
        Row: {
          created_at: string
          from_user: string
          household_id: string
          id: string
          log_id: string
          to_user: string
        }
        Insert: {
          created_at?: string
          from_user?: string
          household_id: string
          id?: string
          log_id: string
          to_user: string
        }
        Update: {
          created_at?: string
          from_user?: string
          household_id?: string
          id?: string
          log_id?: string
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "kudos_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "chore_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan: {
        Row: {
          cook: string | null
          created_at: string
          created_by: string | null
          day: string
          household_id: string
          id: string
          recipe_id: string | null
          slot: string
          title: string | null
        }
        Insert: {
          cook?: string | null
          created_at?: string
          created_by?: string | null
          day: string
          household_id: string
          id?: string
          recipe_id?: string | null
          slot: string
          title?: string | null
        }
        Update: {
          cook?: string | null
          created_at?: string
          created_by?: string | null
          day?: string
          household_id?: string
          id?: string
          recipe_id?: string | null
          slot?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_household_id_cook_fkey"
            columns: ["household_id", "cook"]
            isOneToOne: false
            referencedRelation: "balances"
            referencedColumns: ["household_id", "user_id"]
          },
          {
            foreignKeyName: "meal_plan_household_id_cook_fkey"
            columns: ["household_id", "cook"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["household_id", "user_id"]
          },
          {
            foreignKeyName: "meal_plan_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          body: string
          color_index: number
          created_at: string
          created_by: string | null
          household_id: string
          id: string
          pinned: boolean
          updated_at: string
        }
        Insert: {
          body: string
          color_index?: number
          created_at?: string
          created_by?: string | null
          household_id: string
          id?: string
          pinned?: boolean
          updated_at?: string
        }
        Update: {
          body?: string
          color_index?: number
          created_at?: string
          created_by?: string | null
          household_id?: string
          id?: string
          pinned?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_day: number | null
          birth_month: number | null
          created_at: string
          delete_after: string | null
          display_name: string
          id: string
          language: string
          reminder_time: string
          reminders_on: boolean
          status: string
          updated_at: string
        }
        Insert: {
          birth_day?: number | null
          birth_month?: number | null
          created_at?: string
          delete_after?: string | null
          display_name?: string
          id: string
          language?: string
          reminder_time?: string
          reminders_on?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          birth_day?: number | null
          birth_month?: number | null
          created_at?: string
          delete_after?: string | null
          display_name?: string
          id?: string
          language?: string
          reminder_time?: string
          reminders_on?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_log: {
        Row: {
          key: string
          sent_at: string
          user_id: string
        }
        Insert: {
          key: string
          sent_at?: string
          user_id: string
        }
        Update: {
          key?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          activity: boolean
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_ok_at: string | null
          p256dh: string
          reminders: boolean
          user_id: string
        }
        Insert: {
          activity?: boolean
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_ok_at?: string | null
          p256dh: string
          reminders?: boolean
          user_id?: string
        }
        Update: {
          activity?: boolean
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_ok_at?: string | null
          p256dh?: string
          reminders?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_items: {
        Row: {
          created_at: string
          expense_id: string
          household_id: string
          id: string
          name: string
          price_agorot: number
          quantity: number
        }
        Insert: {
          created_at?: string
          expense_id: string
          household_id: string
          id?: string
          name: string
          price_agorot: number
          quantity?: number
        }
        Update: {
          created_at?: string
          expense_id?: string
          household_id?: string
          id?: string
          name?: string
          price_agorot?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "receipt_items_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          household_id: string | null
          id: string
          ingredients: Json
          locale: string | null
          prep_minutes: number | null
          servings: number | null
          steps: string[]
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          household_id?: string | null
          id?: string
          ingredients?: Json
          locale?: string | null
          prep_minutes?: number | null
          servings?: number | null
          steps?: string[]
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          household_id?: string | null
          id?: string
          ingredients?: Json
          locale?: string | null
          prep_minutes?: number | null
          servings?: number | null
          steps?: string[]
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount_agorot: number
          created_at: string
          created_by: string | null
          from_user: string
          household_id: string
          id: string
          to_user: string
        }
        Insert: {
          amount_agorot: number
          created_at?: string
          created_by?: string | null
          from_user: string
          household_id: string
          id?: string
          to_user: string
        }
        Update: {
          amount_agorot?: number
          created_at?: string
          created_by?: string | null
          from_user?: string
          household_id?: string
          id?: string
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_category_memory: {
        Row: {
          category: string
          household_id: string
          name_key: string
          updated_at: string
        }
        Insert: {
          category: string
          household_id: string
          name_key: string
          updated_at?: string
        }
        Update: {
          category?: string
          household_id?: string
          name_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_category_memory_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_items: {
        Row: {
          added_by: string | null
          amount: number | null
          category: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string
          household_id: string
          id: string
          name: string
          quantity: string | null
          unit: string | null
        }
        Insert: {
          added_by?: string | null
          amount?: number | null
          category?: string | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          household_id: string
          id?: string
          name: string
          quantity?: string | null
          unit?: string | null
        }
        Update: {
          added_by?: string | null
          amount?: number | null
          category?: string | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          quantity?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_items_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      balances: {
        Row: {
          balance_agorot: number | null
          household_id: string | null
          user_id: string | null
        }
        Insert: {
          balance_agorot?: never
          household_id?: string | null
          user_id?: string | null
        }
        Update: {
          balance_agorot?: never
          household_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      month_spend: {
        Row: {
          category: string | null
          expenses: number | null
          household_id: string | null
          month: string | null
          total_agorot: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      week_scores: {
        Row: {
          chores_done: number | null
          household_id: string | null
          points: number | null
          rescues: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chore_logs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_expense: {
        Args: {
          p_amount_agorot: number
          p_category?: string
          p_household: string
          p_paid_by?: string
          p_participants?: string[]
          p_spent_on?: string
          p_title: string
        }
        Returns: string
      }
      add_recipe_to_shopping: {
        Args: { p_household: string; p_recipe: string }
        Returns: number
      }
      call_push: { Args: { p_body: Json }; Returns: undefined }
      cancel_account_deletion: { Args: never; Returns: undefined }
      complete_chore: {
        Args: { p_chore: string; p_with?: string[] }
        Returns: number
      }
      create_household: {
        Args: { p_name: string; p_type: string }
        Returns: string
      }
      create_invite: {
        Args: { p_household: string; p_max_uses?: number }
        Returns: string
      }
      household_scores: {
        Args: { p_household: string; p_period?: string }
        Returns: {
          chores_done: number
          points: number
          rescues: number
          user_id: string
        }[]
      }
      household_today: { Args: { hid: string }; Returns: string }
      is_birthday_on: {
        Args: { d: number; m: number; on_date: string }
        Returns: boolean
      }
      is_member: { Args: { hid: string }; Returns: boolean }
      is_member_text: { Args: { hid: string }; Returns: boolean }
      is_owner: { Args: { hid: string }; Returns: boolean }
      leave_household: { Args: { p_household: string }; Returns: undefined }
      log_birthdays: { Args: never; Returns: number }
      pause_account: { Args: never; Returns: undefined }
      purge_deleted_accounts: { Args: never; Returns: number }
      push_secret_ok: { Args: { p_secret: string }; Returns: boolean }
      redeem_invite: { Args: { p_code: string }; Returns: string }
      request_account_deletion: {
        Args: { p_immediate?: boolean }
        Returns: string
      }
      resume_account: { Args: never; Returns: undefined }
      save_push_subscription: {
        Args: {
          p_activity?: boolean
          p_auth: string
          p_endpoint: string
          p_p256dh: string
          p_reminders?: boolean
        }
        Returns: string
      }
      send_birthday_wish: {
        Args: { p_household: string; p_to: string }
        Returns: undefined
      }
      shares_household: { Args: { other: string }; Returns: boolean }
      snooze_chore: { Args: { p_chore: string }; Returns: string }
      suggest_settlements: {
        Args: { p_household: string }
        Returns: {
          amount_agorot: number
          from_user: string
          to_user: string
        }[]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
