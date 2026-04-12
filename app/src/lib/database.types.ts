export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      menu_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_available: boolean
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id: string
          is_available?: boolean
          name: string
          price_cents: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'menu_items_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'menu_categories'
            referencedColumns: ['id']
          }
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          item_name: string
          line_total_cents: number
          menu_item_id: string
          order_id: string
          quantity: number
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          line_total_cents: number
          menu_item_id: string
          order_id: string
          quantity: number
          unit_price_cents: number
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          line_total_cents?: number
          menu_item_id?: string
          order_id?: string
          quantity?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: 'order_items_menu_item_id_fkey'
            columns: ['menu_item_id']
            isOneToOne: false
            referencedRelation: 'menu_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          }
        ]
      }
      orders: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          note: string | null
          ordered_by_name: string
          ordered_by_phone: string
          session_id: string
          status: 'placed' | 'preparing' | 'served' | 'cancelled'
          table_id: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          note?: string | null
          ordered_by_name: string
          ordered_by_phone: string
          session_id: string
          status?: 'placed' | 'preparing' | 'served' | 'cancelled'
          table_id: string
          total_cents?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          note?: string | null
          ordered_by_name?: string
          ordered_by_phone?: string
          session_id?: string
          status?: 'placed' | 'preparing' | 'served' | 'cancelled'
          table_id?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'orders_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'table_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_table_id_fkey'
            columns: ['table_id']
            isOneToOne: false
            referencedRelation: 'tables'
            referencedColumns: ['id']
          }
        ]
      }
      staff_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          role: 'staff' | 'admin'
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          role: 'staff' | 'admin'
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          role?: 'staff' | 'admin'
          user_id?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          created_at: string
          id: string
          note: string | null
          request_type: 'payment' | 'assistance'
          resolved_at: string | null
          session_id: string
          status: 'open' | 'resolved'
          table_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          request_type: 'payment' | 'assistance'
          resolved_at?: string | null
          session_id: string
          status?: 'open' | 'resolved'
          table_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          request_type?: 'payment' | 'assistance'
          resolved_at?: string | null
          session_id?: string
          status?: 'open' | 'resolved'
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'service_requests_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'table_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_requests_table_id_fkey'
            columns: ['table_id']
            isOneToOne: false
            referencedRelation: 'tables'
            referencedColumns: ['id']
          }
        ]
      }
      table_sessions: {
        Row: {
          closed_at: string | null
          closed_reason: string | null
          created_at: string
          guest_name: string
          guest_phone: string | null
          id: string
          last_active_at: string
          session_pin: string
          started_at: string
          status: 'active' | 'closed'
          table_id: string
        }
        Insert: {
          closed_at?: string | null
          closed_reason?: string | null
          created_at?: string
          guest_name: string
          guest_phone?: string | null
          id?: string
          last_active_at?: string
          session_pin?: string
          started_at?: string
          status?: 'active' | 'closed'
          table_id: string
        }
        Update: {
          closed_at?: string | null
          closed_reason?: string | null
          created_at?: string
          guest_name?: string
          guest_phone?: string | null
          id?: string
          last_active_at?: string
          session_pin?: string
          started_at?: string
          status?: 'active' | 'closed'
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'table_sessions_table_id_fkey'
            columns: ['table_id']
            isOneToOne: false
            referencedRelation: 'tables'
            referencedColumns: ['id']
          }
        ]
      }
      tables: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
        }
        Insert: {
          created_at?: string
          id: string
          is_active?: boolean
          label: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
