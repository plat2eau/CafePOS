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
          full_price_cents: number | null
          half_price_cents: number | null
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
          full_price_cents?: number | null
          half_price_cents?: number | null
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
          full_price_cents?: number | null
          half_price_cents?: number | null
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
      purchase_items: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_lines: {
        Row: {
          created_at: string
          id: string
          item_name: string
          line_total_cents: number
          purchase_id: string
          purchase_item_id: string
          quantity: number
          unit: 'kg' | 'g' | 'litre' | 'ml' | 'pcs' | 'pack' | 'box'
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          line_total_cents: number
          purchase_id: string
          purchase_item_id: string
          quantity: number
          unit: 'kg' | 'g' | 'litre' | 'ml' | 'pcs' | 'pack' | 'box'
          unit_price_cents: number
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          line_total_cents?: number
          purchase_id?: string
          purchase_item_id?: string
          quantity?: number
          unit?: 'kg' | 'g' | 'litre' | 'ml' | 'pcs' | 'pack' | 'box'
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: 'purchase_lines_purchase_id_fkey'
            columns: ['purchase_id']
            isOneToOne: false
            referencedRelation: 'purchases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchase_lines_purchase_item_id_fkey'
            columns: ['purchase_item_id']
            isOneToOne: false
            referencedRelation: 'purchase_items'
            referencedColumns: ['id']
          }
        ]
      }
      purchases: {
        Row: {
          created_at: string
          created_by: string | null
          discount_cents: number
          id: string
          invoice_number: string | null
          notes: string | null
          payment_method: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'other' | null
          payment_status: 'unpaid' | 'partial' | 'paid'
          purchase_date: string
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discount_cents?: number
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_method?: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'other' | null
          payment_status?: 'unpaid' | 'partial' | 'paid'
          purchase_date?: string
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discount_cents?: number
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_method?: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'other' | null
          payment_status?: 'unpaid' | 'partial' | 'paid'
          purchase_date?: string
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'purchases_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'staff_profiles'
            referencedColumns: ['user_id']
          },
          {
            foreignKeyName: 'purchases_vendor_id_fkey'
            columns: ['vendor_id']
            isOneToOne: false
            referencedRelation: 'vendors'
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
          menu_item_id: string | null
          order_id: string
          portion: 'half' | 'full' | null
          quantity: number
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          line_total_cents: number
          menu_item_id: string | null
          order_id: string
          portion?: 'half' | 'full' | null
          quantity: number
          unit_price_cents: number
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          line_total_cents?: number
          menu_item_id?: string | null
          order_id?: string
          portion?: 'half' | 'full' | null
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
          out_check_id: string | null
          ordered_by_name: string
          ordered_by_phone: string
          order_type: 'table' | 'out'
          session_id: string | null
          status: 'placed' | 'preparing' | 'served' | 'cancelled'
          table_id: string | null
          total_cents: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          note?: string | null
          out_check_id?: string | null
          ordered_by_name: string
          ordered_by_phone: string
          order_type?: 'table' | 'out'
          session_id?: string | null
          status?: 'placed' | 'preparing' | 'served' | 'cancelled'
          table_id?: string | null
          total_cents?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          note?: string | null
          out_check_id?: string | null
          ordered_by_name?: string
          ordered_by_phone?: string
          order_type?: 'table' | 'out'
          session_id?: string | null
          status?: 'placed' | 'preparing' | 'served' | 'cancelled'
          table_id?: string | null
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'orders_out_check_id_fkey'
            columns: ['out_check_id']
            isOneToOne: false
            referencedRelation: 'out_checks'
            referencedColumns: ['id']
          },
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
      out_checks: {
        Row: {
          closed_at: string | null
          created_at: string
          customer_name: string
          customer_phone: string | null
          id: string
          status: 'open' | 'closed'
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          status?: 'open' | 'closed'
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          status?: 'open' | 'closed'
        }
        Relationships: []
      }
      tab_accounts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      tab_charges: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          order_count: number
          out_check_id: string | null
          source_type: 'table_session' | 'out_check'
          tab_account_id: string
          table_session_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          order_count: number
          out_check_id?: string | null
          source_type: 'table_session' | 'out_check'
          tab_account_id: string
          table_session_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          order_count?: number
          out_check_id?: string | null
          source_type?: 'table_session' | 'out_check'
          tab_account_id?: string
          table_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tab_charges_out_check_id_fkey'
            columns: ['out_check_id']
            isOneToOne: false
            referencedRelation: 'out_checks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tab_charges_tab_account_id_fkey'
            columns: ['tab_account_id']
            isOneToOne: false
            referencedRelation: 'tab_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tab_charges_table_session_id_fkey'
            columns: ['table_session_id']
            isOneToOne: false
            referencedRelation: 'table_sessions'
            referencedColumns: ['id']
          }
        ]
      }
      tab_payments: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          tab_account_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          tab_account_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          tab_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tab_payments_tab_account_id_fkey'
            columns: ['tab_account_id']
            isOneToOne: false
            referencedRelation: 'tab_accounts'
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
      vendors: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
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
    Functions: {
      close_out_check: {
        Args: {
          p_out_check_id: string
        }
        Returns: undefined
      }
      transfer_out_check_to_tab: {
        Args: {
          p_out_check_id: string
          p_tab_account_id: string
        }
        Returns: undefined
      }
      transfer_table_session_to_tab: {
        Args: {
          p_session_id: string
          p_table_id: string
          p_tab_account_id: string
        }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
