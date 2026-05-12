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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agent_memory_bank: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          id: number
          memory_type: string
          metadata: Json | null
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: number
          memory_type: string
          metadata?: Json | null
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: number
          memory_type?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      bom_master: {
        Row: {
          "bom버전": string | null
          company: string | null
          created_at: string | null
          materialcode: string | null
          materialname: string | null
          prdcode: string | null
          price: number | null
          remerk: string | null
          sort: string | null
          usemount: number | null
          "구매처코드": string | null
          "생산품목명": string | null
          "품목구분": string | null
        }
        Insert: {
          "bom버전"?: string | null
          company?: string | null
          created_at?: string | null
          materialcode?: string | null
          materialname?: string | null
          prdcode?: string | null
          price?: number | null
          remerk?: string | null
          sort?: string | null
          usemount?: number | null
          "구매처코드"?: string | null
          "생산품목명"?: string | null
          "품목구분"?: string | null
        }
        Update: {
          "bom버전"?: string | null
          company?: string | null
          created_at?: string | null
          materialcode?: string | null
          materialname?: string | null
          prdcode?: string | null
          price?: number | null
          remerk?: string | null
          sort?: string | null
          usemount?: number | null
          "구매처코드"?: string | null
          "생산품목명"?: string | null
          "품목구분"?: string | null
        }
        Relationships: []
      }
      ceo_ai_analyses: {
        Row: {
          analysis_date: string
          analysis_text: string
          chat_history: Json | null
          created_at: string | null
          id: string
          summary_data: Json | null
          updated_at: string | null
        }
        Insert: {
          analysis_date: string
          analysis_text: string
          chat_history?: Json | null
          created_at?: string | null
          id?: string
          summary_data?: Json | null
          updated_at?: string | null
        }
        Update: {
          analysis_date?: string
          analysis_text?: string
          chat_history?: Json | null
          created_at?: string | null
          id?: string
          summary_data?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cm_coupang_fulfillment_centers: {
        Row: {
          address: string | null
          center_code: string
          center_name: string | null
          created_at: string | null
          id: number
          is_active: boolean | null
          manager_name: string | null
          manager_phone: string | null
          mobile: string | null
          phone: string | null
          return_address: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          center_code: string
          center_name?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          manager_name?: string | null
          manager_phone?: string | null
          mobile?: string | null
          phone?: string | null
          return_address?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          center_code?: string
          center_name?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          manager_name?: string | null
          manager_phone?: string | null
          mobile?: string | null
          phone?: string | null
          return_address?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cm_coupang_orders: {
        Row: {
          batch_date: string | null
          box_qty: number | null
          center_code: string | null
          confirmed_qty: number | null
          coupang_sku_id: string
          created_at: string | null
          expected_date: string | null
          expiry_date: string | null
          id: number
          is_deferred: boolean | null
          is_tax_exempt: boolean | null
          manufacturing_date: string | null
          order_date: string | null
          order_qty: number | null
          original_batch_date: string | null
          po_number: string
          po_status: string | null
          po_type: string | null
          process_status: string | null
          scheduled_ship_date: string | null
          shipped_qty: number | null
          shipped_supply_price: number | null
          shipped_total: number | null
          shipped_unit_price: number | null
          shipped_vat: number | null
          shipping_method: string | null
          shortage_reason: string | null
          sku_barcode: string | null
          sku_name: string | null
          supply_price: number | null
          unit_price: number | null
          updated_at: string | null
          upload_batch_id: string | null
          vat: number | null
        }
        Insert: {
          batch_date?: string | null
          box_qty?: number | null
          center_code?: string | null
          confirmed_qty?: number | null
          coupang_sku_id: string
          created_at?: string | null
          expected_date?: string | null
          expiry_date?: string | null
          id?: number
          is_deferred?: boolean | null
          is_tax_exempt?: boolean | null
          manufacturing_date?: string | null
          order_date?: string | null
          order_qty?: number | null
          original_batch_date?: string | null
          po_number: string
          po_status?: string | null
          po_type?: string | null
          process_status?: string | null
          scheduled_ship_date?: string | null
          shipped_qty?: number | null
          shipped_supply_price?: number | null
          shipped_total?: number | null
          shipped_unit_price?: number | null
          shipped_vat?: number | null
          shipping_method?: string | null
          shortage_reason?: string | null
          sku_barcode?: string | null
          sku_name?: string | null
          supply_price?: number | null
          unit_price?: number | null
          updated_at?: string | null
          upload_batch_id?: string | null
          vat?: number | null
        }
        Update: {
          batch_date?: string | null
          box_qty?: number | null
          center_code?: string | null
          confirmed_qty?: number | null
          coupang_sku_id?: string
          created_at?: string | null
          expected_date?: string | null
          expiry_date?: string | null
          id?: number
          is_deferred?: boolean | null
          is_tax_exempt?: boolean | null
          manufacturing_date?: string | null
          order_date?: string | null
          order_qty?: number | null
          original_batch_date?: string | null
          po_number?: string
          po_status?: string | null
          po_type?: string | null
          process_status?: string | null
          scheduled_ship_date?: string | null
          shipped_qty?: number | null
          shipped_supply_price?: number | null
          shipped_total?: number | null
          shipped_unit_price?: number | null
          shipped_vat?: number | null
          shipping_method?: string | null
          shortage_reason?: string | null
          sku_barcode?: string | null
          sku_name?: string | null
          supply_price?: number | null
          unit_price?: number | null
          updated_at?: string | null
          upload_batch_id?: string | null
          vat?: number | null
        }
        Relationships: []
      }
      cm_coupang_shipments: {
        Row: {
          box_qty: number
          box_seq: number
          center_code: string | null
          created_at: string | null
          erp_product_id: string | null
          erp_product_name: string | null
          id: number
          invoice_number: string | null
          order_date: string | null
          order_id: number
          po_number: string
          shipped_at: string | null
          sku_barcode: string | null
          sku_id: string
          sku_name: string | null
          total_boxes: number
          total_qty: number
          updated_at: string | null
        }
        Insert: {
          box_qty?: number
          box_seq?: number
          center_code?: string | null
          created_at?: string | null
          erp_product_id?: string | null
          erp_product_name?: string | null
          id?: number
          invoice_number?: string | null
          order_date?: string | null
          order_id: number
          po_number: string
          shipped_at?: string | null
          sku_barcode?: string | null
          sku_id: string
          sku_name?: string | null
          total_boxes?: number
          total_qty?: number
          updated_at?: string | null
        }
        Update: {
          box_qty?: number
          box_seq?: number
          center_code?: string | null
          created_at?: string | null
          erp_product_id?: string | null
          erp_product_name?: string | null
          id?: number
          invoice_number?: string | null
          order_date?: string | null
          order_id?: number
          po_number?: string
          shipped_at?: string | null
          sku_barcode?: string | null
          sku_id?: string
          sku_name?: string | null
          total_boxes?: number
          total_qty?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cm_coupang_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "cm_coupang_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cm_coupang_sku_mapping: {
        Row: {
          box_qty: number | null
          bundle_qty: number | null
          coupang_barcode: string | null
          coupang_name: string | null
          coupang_sku_id: string
          created_at: string | null
          erp_product_id: string | null
          erp_product_name: string | null
          expiry_months: number | null
          id: number
          is_active: boolean | null
          is_discontinued: boolean | null
          manufacturing_date: string | null
          memo: string | null
          production_year: string | null
          updated_at: string | null
          warehouse_code: string | null
          weight_g: number | null
        }
        Insert: {
          box_qty?: number | null
          bundle_qty?: number | null
          coupang_barcode?: string | null
          coupang_name?: string | null
          coupang_sku_id: string
          created_at?: string | null
          erp_product_id?: string | null
          erp_product_name?: string | null
          expiry_months?: number | null
          id?: number
          is_active?: boolean | null
          is_discontinued?: boolean | null
          manufacturing_date?: string | null
          memo?: string | null
          production_year?: string | null
          updated_at?: string | null
          warehouse_code?: string | null
          weight_g?: number | null
        }
        Update: {
          box_qty?: number | null
          bundle_qty?: number | null
          coupang_barcode?: string | null
          coupang_name?: string | null
          coupang_sku_id?: string
          created_at?: string | null
          erp_product_id?: string | null
          erp_product_name?: string | null
          expiry_months?: number | null
          id?: number
          is_active?: boolean | null
          is_discontinued?: boolean | null
          manufacturing_date?: string | null
          memo?: string | null
          production_year?: string | null
          updated_at?: string | null
          warehouse_code?: string | null
          weight_g?: number | null
        }
        Relationships: []
      }
      cm_erp_inventory: {
        Row: {
          bal_qty: number | null
          product_id: string
          updated_at: string | null
          warehouse_code: string
        }
        Insert: {
          bal_qty?: number | null
          product_id: string
          updated_at?: string | null
          warehouse_code: string
        }
        Update: {
          bal_qty?: number | null
          product_id?: string
          updated_at?: string | null
          warehouse_code?: string
        }
        Relationships: []
      }
      cm_erp_products: {
        Row: {
          bal_qty: number | null
          barcode: string | null
          box_qty: number | null
          created_at: string | null
          name: string
          product_id: string
          spec: string | null
          updated_at: string | null
          warehouse_code: string | null
        }
        Insert: {
          bal_qty?: number | null
          barcode?: string | null
          box_qty?: number | null
          created_at?: string | null
          name: string
          product_id: string
          spec?: string | null
          updated_at?: string | null
          warehouse_code?: string | null
        }
        Update: {
          bal_qty?: number | null
          barcode?: string | null
          box_qty?: number | null
          created_at?: string | null
          name?: string
          product_id?: string
          spec?: string | null
          updated_at?: string | null
          warehouse_code?: string | null
        }
        Relationships: []
      }
      cm_erp_products_staging: {
        Row: {
          bal_qty: number | null
          created_at: string | null
          name: string
          product_id: string
          spec: string | null
          warehouse_code: string | null
        }
        Insert: {
          bal_qty?: number | null
          created_at?: string | null
          name: string
          product_id: string
          spec?: string | null
          warehouse_code?: string | null
        }
        Update: {
          bal_qty?: number | null
          created_at?: string | null
          name?: string
          product_id?: string
          spec?: string | null
          warehouse_code?: string | null
        }
        Relationships: []
      }
      cm_export_history: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: number
          row_count: number | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: number
          row_count?: number | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: number
          row_count?: number | null
        }
        Relationships: []
      }
      cm_gift_promotions: {
        Row: {
          condition_kit_id: string | null
          end_date: string | null
          gift_product_id: string | null
          gift_qty: number | null
          is_active: boolean | null
          name: string | null
          promotion_id: number
          start_date: string | null
        }
        Insert: {
          condition_kit_id?: string | null
          end_date?: string | null
          gift_product_id?: string | null
          gift_qty?: number | null
          is_active?: boolean | null
          name?: string | null
          promotion_id?: number
          start_date?: string | null
        }
        Update: {
          condition_kit_id?: string | null
          end_date?: string | null
          gift_product_id?: string | null
          gift_qty?: number | null
          is_active?: boolean | null
          name?: string | null
          promotion_id?: number
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cm_gift_promotions_gift_product_id_fkey"
            columns: ["gift_product_id"]
            isOneToOne: false
            referencedRelation: "cm_erp_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "cm_gift_promotions_gift_product_id_fkey"
            columns: ["gift_product_id"]
            isOneToOne: false
            referencedRelation: "cm_lot_inventory"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "cm_gift_promotions_gift_product_id_fkey"
            columns: ["gift_product_id"]
            isOneToOne: false
            referencedRelation: "cm_lots_expiring_soon"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "cm_gift_promotions_gift_product_id_fkey"
            columns: ["gift_product_id"]
            isOneToOne: false
            referencedRelation: "cm_product_lot_fifo"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "cm_gift_promotions_gift_product_id_fkey"
            columns: ["gift_product_id"]
            isOneToOne: false
            referencedRelation: "cm_product_lots_array"
            referencedColumns: ["product_id"]
          },
        ]
      }
      cm_kit_bom_items: {
        Row: {
          id: number
          kit_id: string
          multiplier: number
          product_id: string | null
        }
        Insert: {
          id?: number
          kit_id: string
          multiplier?: number
          product_id?: string | null
        }
        Update: {
          id?: number
          kit_id?: string
          multiplier?: number
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cm_kit_bom_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cm_erp_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "cm_kit_bom_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cm_lot_inventory"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "cm_kit_bom_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cm_lots_expiring_soon"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "cm_kit_bom_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cm_product_lot_fifo"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "cm_kit_bom_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cm_product_lots_array"
            referencedColumns: ["product_id"]
          },
        ]
      }
      cm_lot_manufacturing_dates: {
        Row: {
          created_at: string | null
          id: string
          lot_number: string
          manufacturing_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lot_number: string
          manufacturing_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lot_number?: string
          manufacturing_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cm_order_gifts: {
        Row: {
          applied_rule_id: number | null
          created_at: string | null
          generated_order_id: number | null
          gift_kit_id: string
          gift_qty: number
          id: number
          is_confirmed: boolean | null
          order_line_id: number | null
          platform_name: string | null
          receiver_addr: string | null
          receiver_name: string | null
          receiver_phone: string | null
          receiver_phone2: string | null
          receiver_zip: string | null
          site_order_no: string | null
          source_order_ids: Json | null
        }
        Insert: {
          applied_rule_id?: number | null
          created_at?: string | null
          generated_order_id?: number | null
          gift_kit_id: string
          gift_qty: number
          id?: number
          is_confirmed?: boolean | null
          order_line_id?: number | null
          platform_name?: string | null
          receiver_addr?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          receiver_phone2?: string | null
          receiver_zip?: string | null
          site_order_no?: string | null
          source_order_ids?: Json | null
        }
        Update: {
          applied_rule_id?: number | null
          created_at?: string | null
          generated_order_id?: number | null
          gift_kit_id?: string
          gift_qty?: number
          id?: number
          is_confirmed?: boolean | null
          order_line_id?: number | null
          platform_name?: string | null
          receiver_addr?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          receiver_phone2?: string | null
          receiver_zip?: string | null
          site_order_no?: string | null
          source_order_ids?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "cm_order_gifts_applied_rule_id_fkey"
            columns: ["applied_rule_id"]
            isOneToOne: false
            referencedRelation: "cm_promo_rules"
            referencedColumns: ["rule_id"]
          },
          {
            foreignKeyName: "cm_order_gifts_applied_rule_id_fkey"
            columns: ["applied_rule_id"]
            isOneToOne: false
            referencedRelation: "cm_view_promo_daily_stats"
            referencedColumns: ["rule_id"]
          },
          {
            foreignKeyName: "cm_order_gifts_applied_rule_id_fkey"
            columns: ["applied_rule_id"]
            isOneToOne: false
            referencedRelation: "cm_view_promo_targets_pending"
            referencedColumns: ["rule_id"]
          },
          {
            foreignKeyName: "cm_order_gifts_generated_order_id_fkey"
            columns: ["generated_order_id"]
            isOneToOne: false
            referencedRelation: "cm_raw_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cm_order_gifts_generated_order_id_fkey"
            columns: ["generated_order_id"]
            isOneToOne: false
            referencedRelation: "cm_view_unmatched_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cm_order_gifts_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "cm_raw_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cm_order_gifts_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "cm_view_unmatched_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cm_order_gifts_order_line"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "cm_raw_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cm_order_gifts_order_line"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "cm_view_unmatched_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cm_product_master: {
        Row: {
          created_at: string | null
          name: string
          product_id: string
          spec: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          name: string
          product_id: string
          spec?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          name?: string
          product_id?: string
          spec?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cm_production_lots: {
        Row: {
          created_at: string | null
          expiry_date: string | null
          id: number
          lot_number: string
          produced_qty: number
          product_id: string
          production_date: string
        }
        Insert: {
          created_at?: string | null
          expiry_date?: string | null
          id?: number
          lot_number: string
          produced_qty: number
          product_id: string
          production_date: string
        }
        Update: {
          created_at?: string | null
          expiry_date?: string | null
          id?: number
          lot_number?: string
          produced_qty?: number
          product_id?: string
          production_date?: string
        }
        Relationships: []
      }
      cm_products_master: {
        Row: {
          first_seen_at: string | null
          last_seen_at: string | null
          platform_name: string
          product_name: string | null
          site_product_code: string
        }
        Insert: {
          first_seen_at?: string | null
          last_seen_at?: string | null
          platform_name: string
          product_name?: string | null
          site_product_code: string
        }
        Update: {
          first_seen_at?: string | null
          last_seen_at?: string | null
          platform_name?: string
          product_name?: string | null
          site_product_code?: string
        }
        Relationships: []
      }
      cm_promo_rules: {
        Row: {
          condition_qty: number | null
          created_at: string | null
          end_date: string
          gift_kit_id: string | null
          gift_qty: number | null
          match_condition_json: Json | null
          platform_name: string | null
          promo_group_id: string
          promo_name: string
          promo_type: string
          review_comment: string | null
          rule_id: number
          start_date: string
          target_kit_id: string
          target_kit_ids: string[] | null
        }
        Insert: {
          condition_qty?: number | null
          created_at?: string | null
          end_date: string
          gift_kit_id?: string | null
          gift_qty?: number | null
          match_condition_json?: Json | null
          platform_name?: string | null
          promo_group_id: string
          promo_name: string
          promo_type?: string
          review_comment?: string | null
          rule_id?: number
          start_date: string
          target_kit_id: string
          target_kit_ids?: string[] | null
        }
        Update: {
          condition_qty?: number | null
          created_at?: string | null
          end_date?: string
          gift_kit_id?: string | null
          gift_qty?: number | null
          match_condition_json?: Json | null
          platform_name?: string | null
          promo_group_id?: string
          promo_name?: string
          promo_type?: string
          review_comment?: string | null
          rule_id?: number
          start_date?: string
          target_kit_id?: string
          target_kit_ids?: string[] | null
        }
        Relationships: []
      }
      cm_raw_mapping_rules: {
        Row: {
          created_at: string | null
          kit_id: string | null
          raw_identifier: string
          rule_id: number
        }
        Insert: {
          created_at?: string | null
          kit_id?: string | null
          raw_identifier: string
          rule_id?: number
        }
        Update: {
          created_at?: string | null
          kit_id?: string | null
          raw_identifier?: string
          rule_id?: number
        }
        Relationships: []
      }
      cm_raw_order_lines: {
        Row: {
          add_option: string | null
          collected_at: string | null
          collector_id: string | null
          id: number
          is_processed: boolean | null
          master_product_code: string | null
          matched_kit_id: string | null
          option_text: string | null
          order_unique_code: string | null
          ordered_at: string | null
          paid_at: string | null
          platform_name: string | null
          process_status: string | null
          product_name: string | null
          promo_text: string | null
          qty: number | null
          receiver_addr: string | null
          receiver_name: string | null
          receiver_phone1: string | null
          receiver_phone2: string | null
          receiver_zip: string | null
          seller_id: string | null
          ship_method_reason: string | null
          ship_msg: string | null
          site_order_no: string | null
          site_product_code: string | null
          status: string | null
          status_changed_at: string | null
          total_qty_bundled: number | null
          tracking_no: string | null
          upload_date: string | null
        }
        Insert: {
          add_option?: string | null
          collected_at?: string | null
          collector_id?: string | null
          id?: number
          is_processed?: boolean | null
          master_product_code?: string | null
          matched_kit_id?: string | null
          option_text?: string | null
          order_unique_code?: string | null
          ordered_at?: string | null
          paid_at?: string | null
          platform_name?: string | null
          process_status?: string | null
          product_name?: string | null
          promo_text?: string | null
          qty?: number | null
          receiver_addr?: string | null
          receiver_name?: string | null
          receiver_phone1?: string | null
          receiver_phone2?: string | null
          receiver_zip?: string | null
          seller_id?: string | null
          ship_method_reason?: string | null
          ship_msg?: string | null
          site_order_no?: string | null
          site_product_code?: string | null
          status?: string | null
          status_changed_at?: string | null
          total_qty_bundled?: number | null
          tracking_no?: string | null
          upload_date?: string | null
        }
        Update: {
          add_option?: string | null
          collected_at?: string | null
          collector_id?: string | null
          id?: number
          is_processed?: boolean | null
          master_product_code?: string | null
          matched_kit_id?: string | null
          option_text?: string | null
          order_unique_code?: string | null
          ordered_at?: string | null
          paid_at?: string | null
          platform_name?: string | null
          process_status?: string | null
          product_name?: string | null
          promo_text?: string | null
          qty?: number | null
          receiver_addr?: string | null
          receiver_name?: string | null
          receiver_phone1?: string | null
          receiver_phone2?: string | null
          receiver_zip?: string | null
          seller_id?: string | null
          ship_method_reason?: string | null
          ship_msg?: string | null
          site_order_no?: string | null
          site_product_code?: string | null
          status?: string | null
          status_changed_at?: string | null
          total_qty_bundled?: number | null
          tracking_no?: string | null
          upload_date?: string | null
        }
        Relationships: []
      }
      cm_sales_platforms: {
        Row: {
          account_code: string | null
          created_at: string | null
          description: string | null
          pic_code: string | null
          platform_name: string
          type_code: string | null
        }
        Insert: {
          account_code?: string | null
          created_at?: string | null
          description?: string | null
          pic_code?: string | null
          platform_name: string
          type_code?: string | null
        }
        Update: {
          account_code?: string | null
          created_at?: string | null
          description?: string | null
          pic_code?: string | null
          platform_name?: string
          type_code?: string | null
        }
        Relationships: []
      }
      cms_product_master: {
        Row: {
          brand: string | null
          created_at: string | null
          id: string
          item_category: string | null
          item_name: string | null
          site_name: string
          site_product_code: string
          site_product_name: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          id?: string
          item_category?: string | null
          item_name?: string | null
          site_name: string
          site_product_code: string
          site_product_name?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          id?: string
          item_category?: string | null
          item_name?: string | null
          site_name?: string
          site_product_code?: string
          site_product_name?: string | null
        }
        Relationships: []
      }
      cms_sales_data: {
        Row: {
          brand: string | null
          created_at: string | null
          id: string
          item_category: string | null
          item_name: string | null
          marketing_data: Json | null
          product_code: string | null
          product_name_raw: string | null
          quantity: number | null
          revenue: number | null
          sale_date: string
          site_name: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          id?: string
          item_category?: string | null
          item_name?: string | null
          marketing_data?: Json | null
          product_code?: string | null
          product_name_raw?: string | null
          quantity?: number | null
          revenue?: number | null
          sale_date: string
          site_name?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          id?: string
          item_category?: string | null
          item_name?: string | null
          marketing_data?: Json | null
          product_code?: string | null
          product_name_raw?: string | null
          quantity?: number | null
          revenue?: number | null
          sale_date?: string
          site_name?: string | null
        }
        Relationships: []
      }
      labdoc_allergen_regulations: {
        Row: {
          allergen_name: string
          annex_ref: string | null
          cas_no: string | null
          created_at: string | null
          id: string
          inci_name: string
          threshold_leave_on: number | null
          threshold_rinse_off: number | null
        }
        Insert: {
          allergen_name: string
          annex_ref?: string | null
          cas_no?: string | null
          created_at?: string | null
          id?: string
          inci_name: string
          threshold_leave_on?: number | null
          threshold_rinse_off?: number | null
        }
        Update: {
          allergen_name?: string
          annex_ref?: string | null
          cas_no?: string | null
          created_at?: string | null
          id?: string
          inci_name?: string
          threshold_leave_on?: number | null
          threshold_rinse_off?: number | null
        }
        Relationships: []
      }
      labdoc_fragrance_allergen_contents: {
        Row: {
          allergen_name: string
          cas_no: string | null
          content_in_fragrance: number | null
          created_at: string | null
          fragrance_code: string
          fragrance_name: string | null
          id: string
          source_filename: string | null
          supplier: string | null
        }
        Insert: {
          allergen_name: string
          cas_no?: string | null
          content_in_fragrance?: number | null
          created_at?: string | null
          fragrance_code: string
          fragrance_name?: string | null
          id?: string
          source_filename?: string | null
          supplier?: string | null
        }
        Update: {
          allergen_name?: string
          cas_no?: string | null
          content_in_fragrance?: number | null
          created_at?: string | null
          fragrance_code?: string
          fragrance_name?: string | null
          id?: string
          source_filename?: string | null
          supplier?: string | null
        }
        Relationships: []
      }
      labdoc_ingredient_certificates: {
        Row: {
          approver: string | null
          created_at: string | null
          id: string
          ingredient_code: string
          ingredient_name: string
          judgment_date: string | null
          lot_no: string | null
          notes: string | null
          overall_judgment: string | null
          pdf_url: string | null
          receipt_date: string | null
          receipt_id: string | null
          receipt_qty: number | null
          results: Json | null
          reviewer: string | null
          supplier: string | null
          test_date: string | null
          test_no: string | null
          tester: string | null
          updated_at: string | null
        }
        Insert: {
          approver?: string | null
          created_at?: string | null
          id?: string
          ingredient_code: string
          ingredient_name: string
          judgment_date?: string | null
          lot_no?: string | null
          notes?: string | null
          overall_judgment?: string | null
          pdf_url?: string | null
          receipt_date?: string | null
          receipt_id?: string | null
          receipt_qty?: number | null
          results?: Json | null
          reviewer?: string | null
          supplier?: string | null
          test_date?: string | null
          test_no?: string | null
          tester?: string | null
          updated_at?: string | null
        }
        Update: {
          approver?: string | null
          created_at?: string | null
          id?: string
          ingredient_code?: string
          ingredient_name?: string
          judgment_date?: string | null
          lot_no?: string | null
          notes?: string | null
          overall_judgment?: string | null
          pdf_url?: string | null
          receipt_date?: string | null
          receipt_id?: string | null
          receipt_qty?: number | null
          results?: Json | null
          reviewer?: string | null
          supplier?: string | null
          test_date?: string | null
          test_no?: string | null
          tester?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labdoc_ingredient_certificates_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "labdoc_ingredient_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      labdoc_ingredient_components: {
        Row: {
          cas_number: string | null
          component_order: number
          composition_ratio: number | null
          country_of_origin: string | null
          created_at: string | null
          function: string | null
          id: string
          inci_name_en: string | null
          inci_name_kr: string | null
          ingredient_code: string
        }
        Insert: {
          cas_number?: string | null
          component_order: number
          composition_ratio?: number | null
          country_of_origin?: string | null
          created_at?: string | null
          function?: string | null
          id?: string
          inci_name_en?: string | null
          inci_name_kr?: string | null
          ingredient_code: string
        }
        Update: {
          cas_number?: string | null
          component_order?: number
          composition_ratio?: number | null
          country_of_origin?: string | null
          created_at?: string | null
          function?: string | null
          id?: string
          inci_name_en?: string | null
          inci_name_kr?: string | null
          ingredient_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "labdoc_components_ingredient_code_fkey"
            columns: ["ingredient_code"]
            isOneToOne: false
            referencedRelation: "labdoc_ingredient_summary"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "labdoc_components_ingredient_code_fkey"
            columns: ["ingredient_code"]
            isOneToOne: false
            referencedRelation: "labdoc_ingredients"
            referencedColumns: ["ingredient_code"]
          },
        ]
      }
      labdoc_ingredient_physical_properties: {
        Row: {
          id: string
          ingredient_code: string
          property_name: string
          property_name_en: string | null
          property_name_kr: string | null
          value_text: string | null
          value_min: number | null
          value_max: number | null
          unit: string | null
          source: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          ingredient_code: string
          property_name: string
          property_name_en?: string | null
          property_name_kr?: string | null
          value_text?: string | null
          value_min?: number | null
          value_max?: number | null
          unit?: string | null
          source?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          ingredient_code?: string
          property_name?: string
          property_name_en?: string | null
          property_name_kr?: string | null
          value_text?: string | null
          value_min?: number | null
          value_max?: number | null
          unit?: string | null
          source?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labdoc_ingredient_physical_properties_ingredient_code_fkey"
            columns: ["ingredient_code"]
            isOneToOne: false
            referencedRelation: "labdoc_ingredients"
            referencedColumns: ["ingredient_code"]
          },
        ]
      }
      labdoc_ingredient_receipts: {
        Row: {
          coa_reference: string | null
          created_at: string | null
          id: string
          ingredient_code: string
          ingredient_name: string
          lot_no: string | null
          notes: string | null
          receipt_date: string
          receipt_qty: number | null
          supplier: string | null
          test_no: string | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          coa_reference?: string | null
          created_at?: string | null
          id?: string
          ingredient_code: string
          ingredient_name: string
          lot_no?: string | null
          notes?: string | null
          receipt_date: string
          receipt_qty?: number | null
          supplier?: string | null
          test_no?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          coa_reference?: string | null
          created_at?: string | null
          id?: string
          ingredient_code?: string
          ingredient_name?: string
          lot_no?: string | null
          notes?: string | null
          receipt_date?: string
          receipt_qty?: number | null
          supplier?: string | null
          test_no?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: []
      }
      labdoc_ingredient_specs: {
        Row: {
          created_at: string | null
          id: string
          ingredient_code: string
          ingredient_name: string | null
          remarks: string | null
          result_date: string | null
          result_value: string | null
          spec_item: string
          spec_standard: string | null
          test_method: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_code: string
          ingredient_name?: string | null
          remarks?: string | null
          result_date?: string | null
          result_value?: string | null
          spec_item: string
          spec_standard?: string | null
          test_method?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_code?: string
          ingredient_name?: string | null
          remarks?: string | null
          result_date?: string | null
          result_value?: string | null
          spec_item?: string
          spec_standard?: string | null
          test_method?: string | null
        }
        Relationships: []
      }
      labdoc_ingredients: {
        Row: {
          coa_urls: string[] | null
          composition_urls: string[] | null
          created_at: string | null
          fragrance_urls: string[] | null
          id: string
          ingredient_code: string
          ingredient_name: string
          manufacturer: string | null
          msds_en_urls: string[] | null
          msds_kr_urls: string[] | null
          origin_country: string | null
          other_urls: string[] | null
          purchase_method: string | null
          purchase_type: string | null
          updated_at: string | null
        }
        Insert: {
          coa_urls?: string[] | null
          composition_urls?: string[] | null
          created_at?: string | null
          fragrance_urls?: string[] | null
          id?: string
          ingredient_code: string
          ingredient_name: string
          manufacturer?: string | null
          msds_en_urls?: string[] | null
          msds_kr_urls?: string[] | null
          origin_country?: string | null
          other_urls?: string[] | null
          purchase_method?: string | null
          purchase_type?: string | null
          updated_at?: string | null
        }
        Update: {
          coa_urls?: string[] | null
          composition_urls?: string[] | null
          created_at?: string | null
          fragrance_urls?: string[] | null
          id?: string
          ingredient_code?: string
          ingredient_name?: string
          manufacturer?: string | null
          msds_en_urls?: string[] | null
          msds_kr_urls?: string[] | null
          origin_country?: string | null
          other_urls?: string[] | null
          purchase_method?: string | null
          purchase_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      labdoc_manufacturing_process_steps: {
        Row: {
          checker: string | null
          created_at: string | null
          id: string
          process_id: string
          step_desc: string | null
          step_name: string | null
          step_num: number
          step_type: string | null
          work_time: string | null
        }
        Insert: {
          checker?: string | null
          created_at?: string | null
          id?: string
          process_id: string
          step_desc?: string | null
          step_name?: string | null
          step_num: number
          step_type?: string | null
          work_time?: string | null
        }
        Update: {
          checker?: string | null
          created_at?: string | null
          id?: string
          process_id?: string
          step_desc?: string | null
          step_name?: string | null
          step_num?: number
          step_type?: string | null
          work_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labdoc_manufacturing_process_steps_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "labdoc_manufacturing_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      labdoc_manufacturing_processes: {
        Row: {
          actual_qty: string | null
          approver_1: string | null
          approver_2: string | null
          approver_3: string | null
          batch_number: string | null
          batch_unit: string | null
          created_at: string | null
          dept_name: string | null
          id: string
          mfg_date: string | null
          notes_content: string | null
          operator: string | null
          product_code: string
          product_name: string | null
          source_filename: string | null
          special_notes: string | null
          step_count: number | null
          total_time: string | null
        }
        Insert: {
          actual_qty?: string | null
          approver_1?: string | null
          approver_2?: string | null
          approver_3?: string | null
          batch_number?: string | null
          batch_unit?: string | null
          created_at?: string | null
          dept_name?: string | null
          id?: string
          mfg_date?: string | null
          notes_content?: string | null
          operator?: string | null
          product_code: string
          product_name?: string | null
          source_filename?: string | null
          special_notes?: string | null
          step_count?: number | null
          total_time?: string | null
        }
        Update: {
          actual_qty?: string | null
          approver_1?: string | null
          approver_2?: string | null
          approver_3?: string | null
          batch_number?: string | null
          batch_unit?: string | null
          created_at?: string | null
          dept_name?: string | null
          id?: string
          mfg_date?: string | null
          notes_content?: string | null
          operator?: string | null
          product_code?: string
          product_name?: string | null
          source_filename?: string | null
          special_notes?: string | null
          step_count?: number | null
          total_time?: string | null
        }
        Relationships: []
      }
      labdoc_product_bom: {
        Row: {
          content_ratio: number | null
          created_at: string | null
          id: string
          ingredient_code: string
          product_code: string
          sequence_no: number
        }
        Insert: {
          content_ratio?: number | null
          created_at?: string | null
          id?: string
          ingredient_code: string
          product_code: string
          sequence_no: number
        }
        Update: {
          content_ratio?: number | null
          created_at?: string | null
          id?: string
          ingredient_code?: string
          product_code?: string
          sequence_no?: number
        }
        Relationships: []
      }
      labdoc_product_english_specs: {
        Row: {
          created_at: string | null
          id: string
          management_code: string
          product_code: string | null
          product_name: string | null
          result: string | null
          specification: string | null
          test_item: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          management_code: string
          product_code?: string | null
          product_name?: string | null
          result?: string | null
          specification?: string | null
          test_item: string
        }
        Update: {
          created_at?: string | null
          id?: string
          management_code?: string
          product_code?: string | null
          product_name?: string | null
          result?: string | null
          specification?: string | null
          test_item?: string
        }
        Relationships: []
      }
      labdoc_product_inci: {
        Row: {
          author: string | null
          created_at: string | null
          designated_at: string | null
          id: string
          inci_cpnp: string | null
          inci_en: string | null
          inci_fda: string | null
          inci_ko: string | null
          product_code: string
          updated_at: string | null
        }
        Insert: {
          author?: string | null
          created_at?: string | null
          designated_at?: string | null
          id?: string
          inci_cpnp?: string | null
          inci_en?: string | null
          inci_fda?: string | null
          inci_ko?: string | null
          product_code: string
          updated_at?: string | null
        }
        Update: {
          author?: string | null
          created_at?: string | null
          designated_at?: string | null
          id?: string
          inci_cpnp?: string | null
          inci_en?: string | null
          inci_fda?: string | null
          inci_ko?: string | null
          product_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labdoc_product_inci_product_code_fkey"
            columns: ["product_code"]
            isOneToOne: true
            referencedRelation: "labdoc_products"
            referencedColumns: ["product_code"]
          },
        ]
      }
      labdoc_product_qc_specs: {
        Row: {
          created_at: string | null
          id: string
          product_code: string
          qc_type: string
          result: string | null
          sequence_no: number | null
          specification: string | null
          specification_en: string | null
          test_item: string
          test_item_en: string | null
          test_method: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_code: string
          qc_type: string
          result?: string | null
          sequence_no?: number | null
          specification?: string | null
          specification_en?: string | null
          test_item: string
          test_item_en?: string | null
          test_method?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_code?: string
          qc_type?: string
          result?: string | null
          sequence_no?: number | null
          specification?: string | null
          specification_en?: string | null
          test_item?: string
          test_item_en?: string | null
          test_method?: string | null
        }
        Relationships: []
      }
      labdoc_product_msds_properties: {
        Row: {
          id: string
          product_code: string
          property_name: string
          property_name_en: string | null
          calculated_value: string | null
          calculated_numeric: number | null
          override_value: string | null
          calculation_method: string | null
          auto_calculated: boolean | null
          last_calculated_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          product_code: string
          property_name: string
          property_name_en?: string | null
          calculated_value?: string | null
          calculated_numeric?: number | null
          override_value?: string | null
          calculation_method?: string | null
          auto_calculated?: boolean | null
          last_calculated_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          product_code?: string
          property_name?: string
          property_name_en?: string | null
          calculated_value?: string | null
          calculated_numeric?: number | null
          override_value?: string | null
          calculation_method?: string | null
          auto_calculated?: boolean | null
          last_calculated_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labdoc_product_msds_properties_product_code_fkey"
            columns: ["product_code"]
            isOneToOne: false
            referencedRelation: "labdoc_products"
            referencedColumns: ["product_code"]
          },
        ]
      }
      labdoc_product_revisions: {
        Row: {
          created_at: string | null
          id: string
          product_code: string
          revision_content: string | null
          revision_date: string | null
          revision_no: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_code: string
          revision_content?: string | null
          revision_date?: string | null
          revision_no: number
        }
        Update: {
          created_at?: string | null
          id?: string
          product_code?: string
          revision_content?: string | null
          revision_date?: string | null
          revision_no?: number
        }
        Relationships: []
      }
      labdoc_product_subsidiary_materials: {
        Row: {
          created_at: string | null
          id: string
          management_code: string | null
          material_name: string
          material_spec: string | null
          product_code: string
          sequence_no: number | null
          vendor: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          management_code?: string | null
          material_name: string
          material_spec?: string | null
          product_code: string
          sequence_no?: number | null
          vendor?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          management_code?: string | null
          material_name?: string
          material_spec?: string | null
          product_code?: string
          sequence_no?: number | null
          vendor?: string | null
        }
        Relationships: []
      }
      labdoc_product_work_specs: {
        Row: {
          color: string | null
          contents_notes: string | null
          created_at: string | null
          fill_volume: string | null
          id: string
          label_volume: string | null
          management_code: string | null
          product_code: string
          product_name: string | null
          production_cautions: string | null
          remarks: string | null
          source_filename: string | null
        }
        Insert: {
          color?: string | null
          contents_notes?: string | null
          created_at?: string | null
          fill_volume?: string | null
          id?: string
          label_volume?: string | null
          management_code?: string | null
          product_code: string
          product_name?: string | null
          production_cautions?: string | null
          remarks?: string | null
          source_filename?: string | null
        }
        Update: {
          color?: string | null
          contents_notes?: string | null
          created_at?: string | null
          fill_volume?: string | null
          id?: string
          label_volume?: string | null
          management_code?: string | null
          product_code?: string
          product_name?: string | null
          production_cautions?: string | null
          remarks?: string | null
          source_filename?: string | null
        }
        Relationships: []
      }
      labdoc_products: {
        Row: {
          allergen_english: string | null
          allergen_korean: string | null
          appearance: string | null
          author: string | null
          cosmetic_type: string | null
          created_at: string | null
          created_date: string | null
          dosage: string | null
          english_name: string | null
           fill_volume: string | null
           formula_breakdown_csv_url: string | null
           formula_breakdown_pdf_url: string | null
           functional_claim: string | null
           id: string
           inci_summary_csv_url: string | null
           inci_summary_pdf_url: string | null
           ingredients_en_csv_url: string | null
           ingredients_en_pdf_url: string | null
           korean_name: string | null
          label_position: string | null
          label_volume: string | null
          management_code: string | null
          msds_alcohol_content: number | null
          msds_flammability: string | null
          msds_type: string | null
          p_product_code: string | null
          packaging_unit: string | null
          ph_standard: string | null
          product_code: string
          raw_material_report: number | null
          recommended_age: string | null
          recycling_grade: string | null
          remarks: string | null
          responsible_seller: number | null
          semi_product_code: string | null
          shelf_life: string | null
          source_file: string | null
          specific_gravity: number | null
          standardized_name: number | null
          storage_method: string | null
          updated_at: string | null
          usage_instructions: string | null
          usage_precautions: string | null
          viscosity_standard: string | null
        }
        Insert: {
          allergen_english?: string | null
          allergen_korean?: string | null
          appearance?: string | null
          author?: string | null
          cosmetic_type?: string | null
          created_at?: string | null
          created_date?: string | null
          dosage?: string | null
          english_name?: string | null
           fill_volume?: string | null
           formula_breakdown_csv_url?: string | null
           formula_breakdown_pdf_url?: string | null
           functional_claim?: string | null
           id?: string
           inci_summary_csv_url?: string | null
           inci_summary_pdf_url?: string | null
           ingredients_en_csv_url?: string | null
           ingredients_en_pdf_url?: string | null
           korean_name?: string | null
           label_position?: string | null
           label_volume?: string | null
            management_code?: string | null
            msds_alcohol_content?: number | null
            msds_flammability?: string | null
            msds_type?: string | null
            p_product_code?: string | null
           packaging_unit?: string | null
           ph_standard?: string | null
           product_code: string
           raw_material_report?: number | null
          recommended_age?: string | null
          recycling_grade?: string | null
          remarks?: string | null
          responsible_seller?: number | null
          semi_product_code?: string | null
          shelf_life?: string | null
          source_file?: string | null
          specific_gravity?: number | null
          standardized_name?: number | null
          storage_method?: string | null
          updated_at?: string | null
          usage_instructions?: string | null
          usage_precautions?: string | null
          viscosity_standard?: string | null
        }
        Update: {
          allergen_english?: string | null
          allergen_korean?: string | null
          appearance?: string | null
          author?: string | null
          cosmetic_type?: string | null
          created_at?: string | null
          created_date?: string | null
          dosage?: string | null
          english_name?: string | null
           fill_volume?: string | null
           formula_breakdown_csv_url?: string | null
           formula_breakdown_pdf_url?: string | null
           functional_claim?: string | null
           id?: string
           inci_summary_csv_url?: string | null
           inci_summary_pdf_url?: string | null
           ingredients_en_csv_url?: string | null
           ingredients_en_pdf_url?: string | null
           korean_name?: string | null
           label_position?: string | null
           label_volume?: string | null
            management_code?: string | null
            msds_alcohol_content?: number | null
            msds_flammability?: string | null
            msds_type?: string | null
            p_product_code?: string | null
           packaging_unit?: string | null
           ph_standard?: string | null
           product_code?: string
           raw_material_report?: number | null
          recommended_age?: string | null
          recycling_grade?: string | null
          remarks?: string | null
          responsible_seller?: number | null
          semi_product_code?: string | null
          shelf_life?: string | null
          source_file?: string | null
          specific_gravity?: number | null
          standardized_name?: number | null
          storage_method?: string | null
          updated_at?: string | null
          usage_instructions?: string | null
          usage_precautions?: string | null
          viscosity_standard?: string | null
        }
        Relationships: []
      }
      labdoc_msds_settings: {
        Row: {
          setting_key: string
          caution_threshold: number
          flammable_threshold: number
          updated_at: string
        }
        Insert: {
          setting_key: string
          caution_threshold?: number
          flammable_threshold?: number
          updated_at?: string
        }
        Update: {
          setting_key?: string
          caution_threshold?: number
          flammable_threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      labdoc_products_old: {
        Row: {
          bom_version: string | null
          category: string | null
          created_at: string | null
          notes: string | null
          p_product_code: string | null
          prdcode: string
          product_name: string
          semi_product_code: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          bom_version?: string | null
          category?: string | null
          created_at?: string | null
          notes?: string | null
          p_product_code?: string | null
          prdcode: string
          product_name: string
          semi_product_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          bom_version?: string | null
          category?: string | null
          created_at?: string | null
          notes?: string | null
          p_product_code?: string | null
          prdcode?: string
          product_name?: string
          semi_product_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      labdoc_test_certificates: {
        Row: {
          approver: string | null
          certificate_no: string
          created_at: string | null
          id: string
          judgment_date: string | null
          lot_no: string | null
          managed_item_qty: number | null
          manufacture_date: string | null
          manufacture_qty: string | null
          notes: string | null
          overall_judgment: string | null
          pdf_url: string | null
          product_code: string
          qc_type: string
          receiver: string | null
          requester: string | null
          results: Json
          sample_collection_date: string | null
          sample_collector: string | null
          sample_quantity: string | null
          test_date: string
          tester: string | null
          updated_at: string | null
        }
        Insert: {
          approver?: string | null
          certificate_no: string
          created_at?: string | null
          id?: string
          judgment_date?: string | null
          lot_no?: string | null
          managed_item_qty?: number | null
          manufacture_date?: string | null
          manufacture_qty?: string | null
          notes?: string | null
          overall_judgment?: string | null
          pdf_url?: string | null
          product_code: string
          qc_type: string
          receiver?: string | null
          requester?: string | null
          results?: Json
          sample_collection_date?: string | null
          sample_collector?: string | null
          sample_quantity?: string | null
          test_date?: string
          tester?: string | null
          updated_at?: string | null
        }
        Update: {
          approver?: string | null
          certificate_no?: string
          created_at?: string | null
          id?: string
          judgment_date?: string | null
          lot_no?: string | null
          managed_item_qty?: number | null
          manufacture_date?: string | null
          manufacture_qty?: string | null
          notes?: string | null
          overall_judgment?: string | null
          pdf_url?: string | null
          product_code?: string
          qc_type?: string
          receiver?: string | null
          requester?: string | null
          results?: Json
          sample_collection_date?: string | null
          sample_collector?: string | null
          sample_quantity?: string | null
          test_date?: string
          tester?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labdoc_test_certificates_product_code_fkey"
            columns: ["product_code"]
            isOneToOne: false
            referencedRelation: "labdoc_products"
            referencedColumns: ["product_code"]
          },
        ]
      }
      labdoc_test_specs: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          ingredient_code: string
          specification: string
          test_item: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          ingredient_code: string
          specification: string
          test_item: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          ingredient_code?: string
          specification?: string
          test_item?: string
        }
        Relationships: [
          {
            foreignKeyName: "labdoc_test_specs_ingredient_code_fkey"
            columns: ["ingredient_code"]
            isOneToOne: false
            referencedRelation: "labdoc_ingredient_summary"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "labdoc_test_specs_ingredient_code_fkey"
            columns: ["ingredient_code"]
            isOneToOne: false
            referencedRelation: "labdoc_ingredients"
            referencedColumns: ["ingredient_code"]
          },
        ]
      }
      meeting_logs: {
        Row: {
          content: Json
          created_at: string
          id: number
        }
        Insert: {
          content: Json
          created_at?: string
          id?: number
        }
        Update: {
          content?: Json
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      nu_clients: {
        Row: {
          birthdate: string | null
          contact: string | null
          created_at: string | null
          gender: string | null
          id: string
          name: string
          notes: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          birthdate?: string | null
          contact?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string
          name: string
          notes?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          birthdate?: string | null
          contact?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string
          name?: string
          notes?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      nu_consultations: {
        Row: {
          client_id: string | null
          consulted_at: string
          counselor_id: string | null
          created_at: string | null
          cta: string | null
          custom_sections: Json | null
          deleted_at: string | null
          health_indices: string | null
          heavy_metals: string | null
          id: string
          infographic_include: boolean | null
          minerals: string | null
          overall_reco: string | null
          status: string
          summary: string | null
          tags: string[] | null
          template_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          consulted_at: string
          counselor_id?: string | null
          created_at?: string | null
          cta?: string | null
          custom_sections?: Json | null
          deleted_at?: string | null
          health_indices?: string | null
          heavy_metals?: string | null
          id?: string
          infographic_include?: boolean | null
          minerals?: string | null
          overall_reco?: string | null
          status?: string
          summary?: string | null
          tags?: string[] | null
          template_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          consulted_at?: string
          counselor_id?: string | null
          created_at?: string | null
          cta?: string | null
          custom_sections?: Json | null
          deleted_at?: string | null
          health_indices?: string | null
          heavy_metals?: string | null
          id?: string
          infographic_include?: boolean | null
          minerals?: string | null
          overall_reco?: string | null
          status?: string
          summary?: string | null
          tags?: string[] | null
          template_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nu_consultations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "nu_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nu_consultations_counselor_id_fkey"
            columns: ["counselor_id"]
            isOneToOne: false
            referencedRelation: "nu_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nu_consultations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "nu_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      nu_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          schema: Json
          updated_at: string | null
          version: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          schema: Json
          updated_at?: string | null
          version?: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          schema?: Json
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      nu_users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_catalog: {
        Row: {
          banner_image: string | null
          benefits_embedding: string | null
          brand: string | null
          category: string
          collected_at: string | null
          core_benefits: string[] | null
          description_embedding: string | null
          differentiation: string[] | null
          discount_rate: number | null
          embedding_model: string | null
          embedding_updated_at: string | null
          enrichment_date: string | null
          first_discovered: string | null
          flags: string[] | null
          id: number
          is_best: boolean | null
          key_ingredients_with_benefits: string[] | null
          last_updated: string | null
          price: number | null
          product_code: string
          product_description: string | null
          product_embedding: string | null
          product_name: string
          product_url: string | null
          ranking: number | null
          review_count: number | null
          review_rating: number | null
          sale_price: number | null
          sub_category: string
          target_concerns: string[] | null
        }
        Insert: {
          banner_image?: string | null
          benefits_embedding?: string | null
          brand?: string | null
          category: string
          collected_at?: string | null
          core_benefits?: string[] | null
          description_embedding?: string | null
          differentiation?: string[] | null
          discount_rate?: number | null
          embedding_model?: string | null
          embedding_updated_at?: string | null
          enrichment_date?: string | null
          first_discovered?: string | null
          flags?: string[] | null
          id?: number
          is_best?: boolean | null
          key_ingredients_with_benefits?: string[] | null
          last_updated?: string | null
          price?: number | null
          product_code: string
          product_description?: string | null
          product_embedding?: string | null
          product_name: string
          product_url?: string | null
          ranking?: number | null
          review_count?: number | null
          review_rating?: number | null
          sale_price?: number | null
          sub_category: string
          target_concerns?: string[] | null
        }
        Update: {
          banner_image?: string | null
          benefits_embedding?: string | null
          brand?: string | null
          category?: string
          collected_at?: string | null
          core_benefits?: string[] | null
          description_embedding?: string | null
          differentiation?: string[] | null
          discount_rate?: number | null
          embedding_model?: string | null
          embedding_updated_at?: string | null
          enrichment_date?: string | null
          first_discovered?: string | null
          flags?: string[] | null
          id?: number
          is_best?: boolean | null
          key_ingredients_with_benefits?: string[] | null
          last_updated?: string | null
          price?: number | null
          product_code?: string
          product_description?: string | null
          product_embedding?: string | null
          product_name?: string
          product_url?: string | null
          ranking?: number | null
          review_count?: number | null
          review_rating?: number | null
          sale_price?: number | null
          sub_category?: string
          target_concerns?: string[] | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "rise_products_view"
            referencedColumns: ["id"]
          },
        ]
      }
      product_inci_master: {
        Row: {
          active_ingredients_list: string | null
          analysis_confidence: number | null
          analysis_error: string | null
          analysis_status: string | null
          analysis_timestamp: string | null
          brand: string | null
          category: string | null
          crawled_date: string | null
          created_at: string | null
          formulation_tech_specs: string | null
          id: string
          inci_count: number | null
          inci_full_list: string[] | null
          key_actives: string[] | null
          key_functions: Json | null
          processing_time_ms: number | null
          product_name: string
          product_positioning: string | null
          skin_efficacy_profile: string | null
          source_url: string | null
          subcategory: string | null
        }
        Insert: {
          active_ingredients_list?: string | null
          analysis_confidence?: number | null
          analysis_error?: string | null
          analysis_status?: string | null
          analysis_timestamp?: string | null
          brand?: string | null
          category?: string | null
          crawled_date?: string | null
          created_at?: string | null
          formulation_tech_specs?: string | null
          id?: string
          inci_count?: number | null
          inci_full_list?: string[] | null
          key_actives?: string[] | null
          key_functions?: Json | null
          processing_time_ms?: number | null
          product_name: string
          product_positioning?: string | null
          skin_efficacy_profile?: string | null
          source_url?: string | null
          subcategory?: string | null
        }
        Update: {
          active_ingredients_list?: string | null
          analysis_confidence?: number | null
          analysis_error?: string | null
          analysis_status?: string | null
          analysis_timestamp?: string | null
          brand?: string | null
          category?: string | null
          crawled_date?: string | null
          created_at?: string | null
          formulation_tech_specs?: string | null
          id?: string
          inci_count?: number | null
          inci_full_list?: string[] | null
          key_actives?: string[] | null
          key_functions?: Json | null
          processing_time_ms?: number | null
          product_name?: string
          product_positioning?: string | null
          skin_efficacy_profile?: string | null
          source_url?: string | null
          subcategory?: string | null
        }
        Relationships: []
      }
      rise_erp_inventory: {
        Row: {
          id: string
          product_code: string
          product_name: string | null
          qty: number | null
          spec: string | null
          updated_at: string | null
          warehouse_code: string
          warehouse_name: string | null
        }
        Insert: {
          id?: string
          product_code: string
          product_name?: string | null
          qty?: number | null
          spec?: string | null
          updated_at?: string | null
          warehouse_code: string
          warehouse_name?: string | null
        }
        Update: {
          id?: string
          product_code?: string
          product_name?: string | null
          qty?: number | null
          spec?: string | null
          updated_at?: string | null
          warehouse_code?: string
          warehouse_name?: string | null
        }
        Relationships: []
      }
      rise_erp_materials: {
        Row: {
          id: string
          material_code: string
          material_name: string | null
          qty: number | null
          spec: string | null
          updated_at: string | null
          warehouse_code: string
          warehouse_name: string | null
        }
        Insert: {
          id?: string
          material_code: string
          material_name?: string | null
          qty?: number | null
          spec?: string | null
          updated_at?: string | null
          warehouse_code: string
          warehouse_name?: string | null
        }
        Update: {
          id?: string
          material_code?: string
          material_name?: string | null
          qty?: number | null
          spec?: string | null
          updated_at?: string | null
          warehouse_code?: string
          warehouse_name?: string | null
        }
        Relationships: []
      }
      rise_purchase_orders: {
        Row: {
          actual_delivery: string | null
          confirmed_by: string | null
          created_at: string | null
          expected_delivery: string | null
          id: string
          material_code: string
          material_name: string | null
          memo: string | null
          order_date: string
          ordered_qty: number
          received_qty: number | null
          status: string
          supplier_id: string | null
          supply_amount: number | null
          unit_price: number | null
          updated_at: string | null
          vat_amount: number | null
        }
        Insert: {
          actual_delivery?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          expected_delivery?: string | null
          id?: string
          material_code: string
          material_name?: string | null
          memo?: string | null
          order_date: string
          ordered_qty: number
          received_qty?: number | null
          status?: string
          supplier_id?: string | null
          supply_amount?: number | null
          unit_price?: number | null
          updated_at?: string | null
          vat_amount?: number | null
        }
        Update: {
          actual_delivery?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          expected_delivery?: string | null
          id?: string
          material_code?: string
          material_name?: string | null
          memo?: string | null
          order_date?: string
          ordered_qty?: number
          received_qty?: number | null
          status?: string
          supplier_id?: string | null
          supply_amount?: number | null
          unit_price?: number | null
          updated_at?: string | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rise_purchase_orders_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rise_purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "rise_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      rise_suppliers: {
        Row: {
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      risework_calendar_events: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          end_date: string
          event_type: string
          id: string
          is_all_day: boolean
          member_id: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_date: string
          event_type?: string
          id?: string
          is_all_day?: boolean
          member_id?: string | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_date?: string
          event_type?: string
          id?: string
          is_all_day?: boolean
          member_id?: string | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risework_calendar_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "risework_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      risework_daily_tasks: {
        Row: {
          created_at: string
          date: string
          id: string
          member_id: string
          note: string | null
          position: number
          source_task_id: string | null
          source_type: string | null
          status: string
          title: string
          updated_at: string
          work_category: string | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          member_id: string
          note?: string | null
          position?: number
          source_task_id?: string | null
          source_type?: string | null
          status?: string
          title: string
          updated_at?: string
          work_category?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          member_id?: string
          note?: string | null
          position?: number
          source_task_id?: string | null
          source_type?: string | null
          status?: string
          title?: string
          updated_at?: string
          work_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risework_daily_tasks_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "risework_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      risework_projects: {
        Row: {
          brand: string
          color: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_closed: boolean
          name: string
          note: string | null
          owner_id: string | null
          position: number
          project_code: string | null
          season: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          brand: string
          color?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_closed?: boolean
          name: string
          note?: string | null
          owner_id?: string | null
          position?: number
          project_code?: string | null
          season?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          brand?: string
          color?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_closed?: boolean
          name?: string
          note?: string | null
          owner_id?: string | null
          position?: number
          project_code?: string | null
          season?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risework_projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "risework_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      risework_task_files: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          task_id: string
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          task_id: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          task_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risework_task_files_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "risework_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risework_task_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "risework_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      risework_tasks: {
        Row: {
          assignee_ids: string[]
          created_at: string
          end_date: string | null
          expected_date: string | null
          id: string
          is_closed: boolean
          link: string | null
          note: string | null
          order_date: string | null
          parent_id: string | null
          position: number
          priority: string | null
          progress: number | null
          project_id: string
          quantity: number | null
          start_date: string | null
          status: string
          team: string
          title: string
          updated_at: string
          vendor: string | null
          work_category: string | null
          work_type: string | null
        }
        Insert: {
          assignee_ids?: string[]
          created_at?: string
          end_date?: string | null
          expected_date?: string | null
          id?: string
          is_closed?: boolean
          link?: string | null
          note?: string | null
          order_date?: string | null
          parent_id?: string | null
          position?: number
          priority?: string | null
          progress?: number | null
          project_id: string
          quantity?: number | null
          start_date?: string | null
          status?: string
          team?: string
          title: string
          updated_at?: string
          vendor?: string | null
          work_category?: string | null
          work_type?: string | null
        }
        Update: {
          assignee_ids?: string[]
          created_at?: string
          end_date?: string | null
          expected_date?: string | null
          id?: string
          is_closed?: boolean
          link?: string | null
          note?: string | null
          order_date?: string | null
          parent_id?: string | null
          position?: number
          priority?: string | null
          progress?: number | null
          project_id?: string
          quantity?: number | null
          start_date?: string | null
          status?: string
          team?: string
          title?: string
          updated_at?: string
          vendor?: string | null
          work_category?: string | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risework_tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "risework_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risework_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "risework_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      risework_team_members: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          position: string | null
          role: string
          team: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          position?: string | null
          role?: string
          team: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          position?: string | null
          role?: string
          team?: string
        }
        Relationships: [
          {
            foreignKeyName: "risework_team_members_auth_user_id_fkey"
            columns: ["auth_user_id"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          resource?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      ru_invoices: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string
          packing_list_id: string
          product_code: string
          product_name: string | null
          qty: number
          unit_price: number | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string
          packing_list_id: string
          product_code: string
          product_name?: string | null
          qty: number
          unit_price?: number | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string
          packing_list_id?: string
          product_code?: string
          product_name?: string | null
          qty?: number
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ru_invoices_packing_list_id_fkey"
            columns: ["packing_list_id"]
            isOneToOne: false
            referencedRelation: "ru_packing_lists"
            referencedColumns: ["pl_number"]
          },
        ]
      }
      ru_order_items: {
        Row: {
          availability_note: string | null
          availability_status: string | null
          commission: number | null
          commission_total: number | null
          confirmed_qty: number | null
          created_at: string | null
          destination: string | null
          id: string
          order_id: string
          pcs_per_ctn: number | null
          product_code: string
          product_name: string | null
          remarks: string | null
          requested_qty: number
          subtotal: number | null
          supply_price: number | null
          supply_total: number | null
          unit_price: number | null
        }
        Insert: {
          availability_note?: string | null
          availability_status?: string | null
          commission?: number | null
          commission_total?: number | null
          confirmed_qty?: number | null
          created_at?: string | null
          destination?: string | null
          id?: string
          order_id: string
          pcs_per_ctn?: number | null
          product_code: string
          product_name?: string | null
          remarks?: string | null
          requested_qty: number
          subtotal?: number | null
          supply_price?: number | null
          supply_total?: number | null
          unit_price?: number | null
        }
        Update: {
          availability_note?: string | null
          availability_status?: string | null
          commission?: number | null
          commission_total?: number | null
          confirmed_qty?: number | null
          created_at?: string | null
          destination?: string | null
          id?: string
          order_id?: string
          pcs_per_ctn?: number | null
          product_code?: string
          product_name?: string | null
          remarks?: string | null
          requested_qty?: number
          subtotal?: number | null
          supply_price?: number | null
          supply_total?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ru_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ru_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ru_orders: {
        Row: {
          buyer_id: string | null
          buyer_name: string | null
          completed_at: string | null
          created_at: string | null
          desired_delivery: string | null
          destination: string | null
          history: Json | null
          id: string
          order_date: string | null
          order_number: string
          remarks: string | null
          status: string | null
          total_amount: number | null
          total_cartons: number | null
          total_qty: number | null
          updated_at: string | null
        }
        Insert: {
          buyer_id?: string | null
          buyer_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          desired_delivery?: string | null
          destination?: string | null
          history?: Json | null
          id?: string
          order_date?: string | null
          order_number: string
          remarks?: string | null
          status?: string | null
          total_amount?: number | null
          total_cartons?: number | null
          total_qty?: number | null
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string | null
          buyer_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          desired_delivery?: string | null
          destination?: string | null
          history?: Json | null
          id?: string
          order_date?: string | null
          order_number?: string
          remarks?: string | null
          status?: string | null
          total_amount?: number | null
          total_cartons?: number | null
          total_qty?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ru_orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "ru_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ru_packing_items: {
        Row: {
          cartons: number | null
          cbm: number | null
          created_at: string | null
          gw_kg: number | null
          id: string
          nw_kg: number | null
          packing_list_id: string
          pallet_number: number | null
          pallets: number | null
          product_code: string
          product_name: string | null
          qty: number
        }
        Insert: {
          cartons?: number | null
          cbm?: number | null
          created_at?: string | null
          gw_kg?: number | null
          id?: string
          nw_kg?: number | null
          packing_list_id: string
          pallet_number?: number | null
          pallets?: number | null
          product_code: string
          product_name?: string | null
          qty: number
        }
        Update: {
          cartons?: number | null
          cbm?: number | null
          created_at?: string | null
          gw_kg?: number | null
          id?: string
          nw_kg?: number | null
          packing_list_id?: string
          pallet_number?: number | null
          pallets?: number | null
          product_code?: string
          product_name?: string | null
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "ru_packing_items_packing_list_id_fkey"
            columns: ["packing_list_id"]
            isOneToOne: false
            referencedRelation: "ru_packing_lists"
            referencedColumns: ["pl_number"]
          },
        ]
      }
      ru_packing_lists: {
        Row: {
          commodity_desc: string | null
          consignee_address: string | null
          consignee_email: string | null
          consignee_name: string | null
          consignee_tel: string | null
          created_at: string | null
          created_date: string | null
          departure_date: string | null
          destination: string | null
          exporter_address: string | null
          exporter_fax: string | null
          exporter_name: string | null
          exporter_tel: string | null
          hs_code: string | null
          invoice_date: string | null
          invoice_number: string | null
          main_item: string | null
          manufacturer: string | null
          order_id: string
          payment_term: string | null
          pl_number: string
          shipping_port: string | null
          total_amount: number | null
          total_cartons: number | null
          total_cbm: number | null
          total_gw_kg: number | null
          total_nw_kg: number | null
          total_pallets: number | null
          total_qty: number | null
          vessel_flight: string | null
        }
        Insert: {
          commodity_desc?: string | null
          consignee_address?: string | null
          consignee_email?: string | null
          consignee_name?: string | null
          consignee_tel?: string | null
          created_at?: string | null
          created_date?: string | null
          departure_date?: string | null
          destination?: string | null
          exporter_address?: string | null
          exporter_fax?: string | null
          exporter_name?: string | null
          exporter_tel?: string | null
          hs_code?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          main_item?: string | null
          manufacturer?: string | null
          order_id: string
          payment_term?: string | null
          pl_number: string
          shipping_port?: string | null
          total_amount?: number | null
          total_cartons?: number | null
          total_cbm?: number | null
          total_gw_kg?: number | null
          total_nw_kg?: number | null
          total_pallets?: number | null
          total_qty?: number | null
          vessel_flight?: string | null
        }
        Update: {
          commodity_desc?: string | null
          consignee_address?: string | null
          consignee_email?: string | null
          consignee_name?: string | null
          consignee_tel?: string | null
          created_at?: string | null
          created_date?: string | null
          departure_date?: string | null
          destination?: string | null
          exporter_address?: string | null
          exporter_fax?: string | null
          exporter_name?: string | null
          exporter_tel?: string | null
          hs_code?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          main_item?: string | null
          manufacturer?: string | null
          order_id?: string
          payment_term?: string | null
          pl_number?: string
          shipping_port?: string | null
          total_amount?: number | null
          total_cartons?: number | null
          total_cbm?: number | null
          total_gw_kg?: number | null
          total_nw_kg?: number | null
          total_pallets?: number | null
          total_qty?: number | null
          vessel_flight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ru_packing_lists_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ru_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ru_prices: {
        Row: {
          commission: number
          created_at: string | null
          effective_date: string | null
          final_price: number
          id: string
          product_code: string
          supply_price: number
        }
        Insert: {
          commission?: number
          created_at?: string | null
          effective_date?: string | null
          final_price?: number
          id?: string
          product_code: string
          supply_price?: number
        }
        Update: {
          commission?: number
          created_at?: string | null
          effective_date?: string | null
          final_price?: number
          id?: string
          product_code?: string
          supply_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "ru_prices_product_code_fkey"
            columns: ["product_code"]
            isOneToOne: false
            referencedRelation: "ru_products"
            referencedColumns: ["product_code"]
          },
        ]
      }
      ru_products: {
        Row: {
          barcode: string | null
          brand: string | null
          category: string | null
          cbm: number | null
          created_at: string | null
          depth_cm: number | null
          height_cm: number | null
          hscode: string | null
          id: string
          name_en: string | null
          name_ko: string
          name_ru: string | null
          pcs_per_carton: number | null
          product_code: string
          remarks: string | null
          status: string | null
          updated_at: string | null
          volume: string | null
          weight_kg: number | null
          width_cm: number | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          cbm?: number | null
          created_at?: string | null
          depth_cm?: number | null
          height_cm?: number | null
          hscode?: string | null
          id?: string
          name_en?: string | null
          name_ko: string
          name_ru?: string | null
          pcs_per_carton?: number | null
          product_code: string
          remarks?: string | null
          status?: string | null
          updated_at?: string | null
          volume?: string | null
          weight_kg?: number | null
          width_cm?: number | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          cbm?: number | null
          created_at?: string | null
          depth_cm?: number | null
          height_cm?: number | null
          hscode?: string | null
          id?: string
          name_en?: string | null
          name_ko?: string
          name_ru?: string | null
          pcs_per_carton?: number | null
          product_code?: string
          remarks?: string | null
          status?: string | null
          updated_at?: string | null
          volume?: string | null
          weight_kg?: number | null
          width_cm?: number | null
        }
        Relationships: []
      }
      ru_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          org_name: string | null
          phone: string | null
          region_code: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          org_name?: string | null
          phone?: string | null
          region_code?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          org_name?: string | null
          phone?: string | null
          region_code?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tiktok_posts: {
        Row: {
          created_at: string | null
          id: number
          posting_date: string | null
          product: string | null
          status: string | null
          title: string | null
          url_clip: string | null
          url_thumbnail: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          posting_date?: string | null
          product?: string | null
          status?: string | null
          title?: string | null
          url_clip?: string | null
          url_thumbnail?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          posting_date?: string | null
          product?: string | null
          status?: string | null
          title?: string | null
          url_clip?: string | null
          url_thumbnail?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          department: string | null
          display_name: string | null
          email: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      vectors_formula: {
        Row: {
          embedding: string | null
          id: number
          "main_efficacy _EN": string | null
          "main_efficacy _KR": string | null
          "제형 분류_EN": string | null
          "제형 분류_KR": string | null
          "제형명": string | null
          "제형명_en": string | null
        }
        Insert: {
          embedding?: string | null
          id?: number
          "main_efficacy _EN"?: string | null
          "main_efficacy _KR"?: string | null
          "제형 분류_EN"?: string | null
          "제형 분류_KR"?: string | null
          "제형명"?: string | null
          "제형명_en"?: string | null
        }
        Update: {
          embedding?: string | null
          id?: number
          "main_efficacy _EN"?: string | null
          "main_efficacy _KR"?: string | null
          "제형 분류_EN"?: string | null
          "제형 분류_KR"?: string | null
          "제형명"?: string | null
          "제형명_en"?: string | null
        }
        Relationships: []
      }
      vectors_ingredient: {
        Row: {
          clinical_studies_summary: string | null
          conclusion: string | null
          cosmetic_applications_and_commercial_products: string | null
          efficacy_en: string | null
          efficacy_kr: string | null
          embedding: string | null
          id: number
          inci_definition: string | null
          inci_name_en: string | null
          ingredient_en: string | null
          ingredient_kr: string | null
          key_mechanisms: string | null
          "Last updated": string | null
          skin_benefits: string | null
        }
        Insert: {
          clinical_studies_summary?: string | null
          conclusion?: string | null
          cosmetic_applications_and_commercial_products?: string | null
          efficacy_en?: string | null
          efficacy_kr?: string | null
          embedding?: string | null
          id?: number
          inci_definition?: string | null
          inci_name_en?: string | null
          ingredient_en?: string | null
          ingredient_kr?: string | null
          key_mechanisms?: string | null
          "Last updated"?: string | null
          skin_benefits?: string | null
        }
        Update: {
          clinical_studies_summary?: string | null
          conclusion?: string | null
          cosmetic_applications_and_commercial_products?: string | null
          efficacy_en?: string | null
          efficacy_kr?: string | null
          embedding?: string | null
          id?: number
          inci_definition?: string | null
          inci_name_en?: string | null
          ingredient_en?: string | null
          ingredient_kr?: string | null
          key_mechanisms?: string | null
          "Last updated"?: string | null
          skin_benefits?: string | null
        }
        Relationships: []
      }
      vive_result: {
        Row: {
          "00_user_input": string | null
          "01_output.embedding_query": string | null
          "02_comp_branding": string | null
          "02_comp_formulation_agent": string | null
          "02_comp_ingredient": string | null
          "02_comp_visual": string | null
          "02_compression": Json | null
          "03_report_branding": Json | null
          "03_report_formula": Json | null
          bubble_id: string | null
          created_at: string
          id: number
        }
        Insert: {
          "00_user_input"?: string | null
          "01_output.embedding_query"?: string | null
          "02_comp_branding"?: string | null
          "02_comp_formulation_agent"?: string | null
          "02_comp_ingredient"?: string | null
          "02_comp_visual"?: string | null
          "02_compression"?: Json | null
          "03_report_branding"?: Json | null
          "03_report_formula"?: Json | null
          bubble_id?: string | null
          created_at?: string
          id?: number
        }
        Update: {
          "00_user_input"?: string | null
          "01_output.embedding_query"?: string | null
          "02_comp_branding"?: string | null
          "02_comp_formulation_agent"?: string | null
          "02_comp_ingredient"?: string | null
          "02_comp_visual"?: string | null
          "02_compression"?: Json | null
          "03_report_branding"?: Json | null
          "03_report_formula"?: Json | null
          bubble_id?: string | null
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      vp_creative_formula: {
        Row: {
          base_formula_id: number | null
          bubble_id: string | null
          category: string | null
          content_embedding: string | null
          created_at: string | null
          embedding_model: string | null
          embedding_updated_at: string | null
          features_embedding: string | null
          generation_prompt_version: string | null
          id: number
          image_prompt: string | null
          image_url: string | null
          ingredients_embedding: string | null
          key_features: string | null
          key_features_en: string | null
          main_ingredients: string | null
          main_ingredients_en: string | null
          title_en: string | null
          title_kr: string | null
          type: string | null
          updated_at: string | null
          usage_instructions: string | null
          usage_instructions_en: string | null
        }
        Insert: {
          base_formula_id?: number | null
          bubble_id?: string | null
          category?: string | null
          content_embedding?: string | null
          created_at?: string | null
          embedding_model?: string | null
          embedding_updated_at?: string | null
          features_embedding?: string | null
          generation_prompt_version?: string | null
          id?: number
          image_prompt?: string | null
          image_url?: string | null
          ingredients_embedding?: string | null
          key_features?: string | null
          key_features_en?: string | null
          main_ingredients?: string | null
          main_ingredients_en?: string | null
          title_en?: string | null
          title_kr?: string | null
          type?: string | null
          updated_at?: string | null
          usage_instructions?: string | null
          usage_instructions_en?: string | null
        }
        Update: {
          base_formula_id?: number | null
          bubble_id?: string | null
          category?: string | null
          content_embedding?: string | null
          created_at?: string | null
          embedding_model?: string | null
          embedding_updated_at?: string | null
          features_embedding?: string | null
          generation_prompt_version?: string | null
          id?: number
          image_prompt?: string | null
          image_url?: string | null
          ingredients_embedding?: string | null
          key_features?: string | null
          key_features_en?: string | null
          main_ingredients?: string | null
          main_ingredients_en?: string | null
          title_en?: string | null
          title_kr?: string | null
          type?: string | null
          updated_at?: string | null
          usage_instructions?: string | null
          usage_instructions_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vp_creative_formula_base_formula_id_fkey"
            columns: ["base_formula_id"]
            isOneToOne: false
            referencedRelation: "vp_formula"
            referencedColumns: ["id"]
          },
        ]
      }
      vp_formula: {
        Row: {
          category_main: string | null
          category_sub: string | null
          crawl_batch_id: string | null
          crawl_date: string | null
          created_at: string | null
          formula_name_en: string | null
          formula_name_kr: string | null
          formulation_type: string | null
          id: number
          ingredients_text: string | null
          is_creative: boolean | null
          main_benefits: string | null
          search_keywords: string[] | null
          source_url: string | null
          updated_at: string | null
        }
        Insert: {
          category_main?: string | null
          category_sub?: string | null
          crawl_batch_id?: string | null
          crawl_date?: string | null
          created_at?: string | null
          formula_name_en?: string | null
          formula_name_kr?: string | null
          formulation_type?: string | null
          id?: number
          ingredients_text?: string | null
          is_creative?: boolean | null
          main_benefits?: string | null
          search_keywords?: string[] | null
          source_url?: string | null
          updated_at?: string | null
        }
        Update: {
          category_main?: string | null
          category_sub?: string | null
          crawl_batch_id?: string | null
          crawl_date?: string | null
          created_at?: string | null
          formula_name_en?: string | null
          formula_name_kr?: string | null
          formulation_type?: string | null
          id?: number
          ingredients_text?: string | null
          is_creative?: boolean | null
          main_benefits?: string | null
          search_keywords?: string[] | null
          source_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vp_formula_ingredients: {
        Row: {
          addition_order: number | null
          addition_phase: string | null
          compatibility_notes: string | null
          concentration_max: number | null
          concentration_min: number | null
          concentration_typical: number | null
          cost_per_kg: number | null
          created_at: string | null
          formula_id: number | null
          function_in_formula: string | null
          grade_type: string | null
          id: number
          inci_name: string | null
          ingredient_id: number | null
          ingredient_name_en: string | null
          ingredient_name_kr: string | null
          is_active_ingredient: boolean | null
          is_key_ingredient: boolean | null
          regulatory_restrictions: string | null
          storage_conditions: string | null
          substitution_options: Json | null
          supplier_info: string | null
          updated_at: string | null
        }
        Insert: {
          addition_order?: number | null
          addition_phase?: string | null
          compatibility_notes?: string | null
          concentration_max?: number | null
          concentration_min?: number | null
          concentration_typical?: number | null
          cost_per_kg?: number | null
          created_at?: string | null
          formula_id?: number | null
          function_in_formula?: string | null
          grade_type?: string | null
          id?: number
          inci_name?: string | null
          ingredient_id?: number | null
          ingredient_name_en?: string | null
          ingredient_name_kr?: string | null
          is_active_ingredient?: boolean | null
          is_key_ingredient?: boolean | null
          regulatory_restrictions?: string | null
          storage_conditions?: string | null
          substitution_options?: Json | null
          supplier_info?: string | null
          updated_at?: string | null
        }
        Update: {
          addition_order?: number | null
          addition_phase?: string | null
          compatibility_notes?: string | null
          concentration_max?: number | null
          concentration_min?: number | null
          concentration_typical?: number | null
          cost_per_kg?: number | null
          created_at?: string | null
          formula_id?: number | null
          function_in_formula?: string | null
          grade_type?: string | null
          id?: number
          inci_name?: string | null
          ingredient_id?: number | null
          ingredient_name_en?: string | null
          ingredient_name_kr?: string | null
          is_active_ingredient?: boolean | null
          is_key_ingredient?: boolean | null
          regulatory_restrictions?: string | null
          storage_conditions?: string | null
          substitution_options?: Json | null
          supplier_info?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vp_formula_ingredients_formula_id_fkey"
            columns: ["formula_id"]
            isOneToOne: false
            referencedRelation: "vp_formula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vp_formula_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "vp_ingredient"
            referencedColumns: ["id"]
          },
        ]
      }
      vp_ingredient: {
        Row: {
          activity_original: string | null
          benefits_embedding: string | null
          bubble_id: string | null
          category: string | null
          category_all: string | null
          category_all_en: string | null
          category_embedding: string | null
          category_en: string | null
          clinical_embedding: string | null
          clinical_studies_summary: string | null
          company: string | null
          created: string | null
          embedding_model: string | null
          embedding_updated_at: string | null
          id: number
          image_prmpt: string | null
          image_url: string | null
          inci: string | null
          ingredient_en: string | null
          ingredient_kr: string | null
          skin_benefits: string | null
          source: string | null
          tagline: string | null
          url: string | null
          usp: string | null
          usp_embedding: string | null
        }
        Insert: {
          activity_original?: string | null
          benefits_embedding?: string | null
          bubble_id?: string | null
          category?: string | null
          category_all?: string | null
          category_all_en?: string | null
          category_embedding?: string | null
          category_en?: string | null
          clinical_embedding?: string | null
          clinical_studies_summary?: string | null
          company?: string | null
          created?: string | null
          embedding_model?: string | null
          embedding_updated_at?: string | null
          id?: number
          image_prmpt?: string | null
          image_url?: string | null
          inci?: string | null
          ingredient_en?: string | null
          ingredient_kr?: string | null
          skin_benefits?: string | null
          source?: string | null
          tagline?: string | null
          url?: string | null
          usp?: string | null
          usp_embedding?: string | null
        }
        Update: {
          activity_original?: string | null
          benefits_embedding?: string | null
          bubble_id?: string | null
          category?: string | null
          category_all?: string | null
          category_all_en?: string | null
          category_embedding?: string | null
          category_en?: string | null
          clinical_embedding?: string | null
          clinical_studies_summary?: string | null
          company?: string | null
          created?: string | null
          embedding_model?: string | null
          embedding_updated_at?: string | null
          id?: number
          image_prmpt?: string | null
          image_url?: string | null
          inci?: string | null
          ingredient_en?: string | null
          ingredient_kr?: string | null
          skin_benefits?: string | null
          source?: string | null
          tagline?: string | null
          url?: string | null
          usp?: string | null
          usp_embedding?: string | null
        }
        Relationships: []
      }
      vp_productlink: {
        Row: {
          created_at: string
          id: number
          llink: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          llink?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          llink?: string | null
        }
        Relationships: []
      }
      work_requests: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          closed_at: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          history: Json | null
          id: string
          metadata: Json | null
          priority: string | null
          replies: Json | null
          resolved_at: string | null
          source: Json | null
          status: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          closed_at?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          history?: Json | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          replies?: Json | null
          resolved_at?: string | null
          source?: Json | null
          status?: string | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          closed_at?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          history?: Json | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          replies?: Json | null
          resolved_at?: string | null
          source?: Json | null
          status?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      // ── LAB: Ingredient Intelligence tables (added manually) ──
      lab_inci_matches: {
        Row: {
          id: string
          inci_name_normalized: string
          incidecoder_slug: string | null
          vectors_ingredient_id: number | null
          vp_ingredient_id: number | null
          match_method: string
          match_confidence: number
          is_verified: boolean
          verified_by: string | null
          verified_at: string | null
          korean_name: string | null
          mfds_registered: boolean | null
          mfds_restricted: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          inci_name_normalized: string
          incidecoder_slug?: string | null
          vectors_ingredient_id?: number | null
          vp_ingredient_id?: number | null
          match_method?: string
          match_confidence?: number
          is_verified?: boolean
          verified_by?: string | null
          verified_at?: string | null
          korean_name?: string | null
          mfds_registered?: boolean | null
          mfds_restricted?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          inci_name_normalized?: string
          incidecoder_slug?: string | null
          vectors_ingredient_id?: number | null
          vp_ingredient_id?: number | null
          match_method?: string
          match_confidence?: number
          is_verified?: boolean
          verified_by?: string | null
          verified_at?: string | null
          korean_name?: string | null
          mfds_registered?: boolean | null
          mfds_restricted?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      lab_regulations: {
        Row: {
          id: string
          inci_name: string | null
          korean_name: string | null
          cas_number: string | null
          ec_number: string | null
          regulation_source: string
          regulation_type: string
          annex: string | null
          reference_number: string | null
          max_concentration: string | null
          restricted_body_parts: string | null
          conditions: string | null
          warnings: string | null
          chemical_iupac_name: string | null
          identified_ingredients: string | null
          regulation_ref: string | null
          status: string | null
          effective_date: string | null
          update_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          inci_name?: string | null
          korean_name?: string | null
          cas_number?: string | null
          ec_number?: string | null
          regulation_source: string
          regulation_type: string
          annex?: string | null
          reference_number?: string | null
          max_concentration?: string | null
          restricted_body_parts?: string | null
          conditions?: string | null
          warnings?: string | null
          chemical_iupac_name?: string | null
          identified_ingredients?: string | null
          regulation_ref?: string | null
          status?: string | null
          effective_date?: string | null
          update_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          inci_name?: string | null
          korean_name?: string | null
          cas_number?: string | null
          ec_number?: string | null
          regulation_source?: string
          regulation_type?: string
          annex?: string | null
          reference_number?: string | null
          max_concentration?: string | null
          restricted_body_parts?: string | null
          conditions?: string | null
          warnings?: string | null
          chemical_iupac_name?: string | null
          identified_ingredients?: string | null
          regulation_ref?: string | null
          status?: string | null
          effective_date?: string | null
          update_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      lab_ingredients: {
        Row: {
          slug: string
          name: string
          rating: string | null
          functions: string[] | null
          also_called: string[] | null
          quick_facts: string[] | null
          details: string | null
          cosing_cas_number: string | null
          cosing_ec_number: string | null
          cosing_description: string | null
          cosing_chemical_iupac_name: string | null
          created_at: string | null
        }
        Insert: {
          slug: string
          name: string
          rating?: string | null
          functions?: string[] | null
          also_called?: string[] | null
          quick_facts?: string[] | null
          details?: string | null
          cosing_cas_number?: string | null
          cosing_ec_number?: string | null
          cosing_description?: string | null
          cosing_chemical_iupac_name?: string | null
          created_at?: string | null
        }
        Update: {
          slug?: string
          name?: string
          rating?: string | null
          functions?: string[] | null
          also_called?: string[] | null
          quick_facts?: string[] | null
          details?: string | null
          cosing_cas_number?: string | null
          cosing_ec_number?: string | null
          cosing_description?: string | null
          cosing_chemical_iupac_name?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      lab_products: {
        Row: {
          slug: string
          brand: string | null
          brand_slug: string | null
          product_name: string | null
          description: string | null
          ingredients_list: Json | null
          highlights: string[] | null
          ingredients_by_function: Json | null
          skim_through: Json | null
          source_url: string | null
          scraped_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          slug: string
          brand?: string | null
          brand_slug?: string | null
          product_name?: string | null
          description?: string | null
          ingredients_list?: Json | null
          highlights?: string[] | null
          ingredients_by_function?: Json | null
          skim_through?: Json | null
          source_url?: string | null
          scraped_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          slug?: string
          brand?: string | null
          brand_slug?: string | null
          product_name?: string | null
          description?: string | null
          ingredients_list?: Json | null
          highlights?: string[] | null
          ingredients_by_function?: Json | null
          skim_through?: Json | null
          source_url?: string | null
          scraped_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lab_ingredient_product: {
        Row: {
          ingredient_slug: string
          product_slug: string
        }
        Insert: {
          ingredient_slug: string
          product_slug: string
        }
        Update: {
          ingredient_slug?: string
          product_slug?: string
        }
        Relationships: []
      }
      lab_categories: {
        Row: {
          id: number
          name: string
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          created_at?: string | null
        }
        Relationships: []
      }
      lab_research_reports: {
        Row: {
          id: string
          subject_type: string
          subject_identifier: string
          subject_name: string | null
          report_type: string
          report_title: string
          report_status: string
          report_content: Json
          report_markdown: string | null
          report_summary: string | null
          model_used: string | null
          skills_used: string[] | null
          input_context: Json | null
          token_usage: Json | null
          generation_time_ms: number | null
          related_ingredients: string[] | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subject_type: string
          subject_identifier: string
          subject_name?: string | null
          report_type: string
          report_title: string
          report_status?: string
          report_content?: Json
          report_markdown?: string | null
          report_summary?: string | null
          model_used?: string | null
          skills_used?: string[] | null
          input_context?: Json | null
          token_usage?: Json | null
          generation_time_ms?: number | null
          related_ingredients?: string[] | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subject_type?: string
          subject_identifier?: string
          subject_name?: string | null
          report_type?: string
          report_title?: string
          report_status?: string
          report_content?: Json
          report_markdown?: string | null
          report_summary?: string | null
          model_used?: string | null
          skills_used?: string[] | null
          input_context?: Json | null
          token_usage?: Json | null
          generation_time_ms?: number | null
          related_ingredients?: string[] | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      cm_lot_inventory: {
        Row: {
          current_stock: number | null
          expiry_date: string | null
          id: number | null
          lot_number: string | null
          produced_qty: number | null
          product_id: string | null
          product_name: string | null
          production_date: string | null
          remaining_qty: number | null
          status: string | null
        }
        Relationships: []
      }
      cm_lots_expiring_soon: {
        Row: {
          current_stock: number | null
          expiry_date: string | null
          id: number | null
          lot_number: string | null
          produced_qty: number | null
          product_id: string | null
          product_name: string | null
          production_date: string | null
          remaining_qty: number | null
          status: string | null
        }
        Relationships: []
      }
      cm_product_lot_fifo: {
        Row: {
          current_stock: number | null
          lot_numbers: string[] | null
          lot_statuses: string[] | null
          produced_quantities: number[] | null
          product_id: string | null
          product_name: string | null
          remaining_quantities: number[] | null
          total_remaining: number | null
        }
        Relationships: []
      }
      cm_product_lots_array: {
        Row: {
          current_stock: number | null
          lot_dates: string[] | null
          lot_expiries: string[] | null
          lot_numbers: string[] | null
          lot_quantities: number[] | null
          product_id: string | null
          product_name: string | null
          total_produced: number | null
        }
        Relationships: []
      }
      cm_view_gift_summary: {
        Row: {
          created_at: string | null
          gift_kit_id: string | null
          gift_qty: number | null
          id: number | null
          promo_name: string | null
          receiver_name: string | null
          site_order_no: string | null
        }
        Relationships: []
      }
      cm_view_latest_batch_result: {
        Row: {
          add_option: string | null
          collected_at: string | null
          collector_id: string | null
          master_product_code: string | null
          option_text_standardized: string | null
          order_unique_code: string | null
          ordered_at: string | null
          paid_at: string | null
          platform_name: string | null
          product_name: string | null
          promo_text: string | null
          qty: number | null
          receiver_addr: string | null
          receiver_name: string | null
          receiver_phone1: string | null
          receiver_phone2: string | null
          receiver_zip: string | null
          seller_id: string | null
          ship_method_reason: string | null
          ship_msg: string | null
          site_order_no: string | null
          site_product_code: string | null
          status: string | null
          status_changed_at: string | null
          total_qty_bundled: number | null
          tracking_no: string | null
          upload_date: string | null
        }
        Insert: {
          add_option?: string | null
          collected_at?: string | null
          collector_id?: string | null
          master_product_code?: string | null
          option_text_standardized?: never
          order_unique_code?: string | null
          ordered_at?: string | null
          paid_at?: string | null
          platform_name?: string | null
          product_name?: string | null
          promo_text?: string | null
          qty?: number | null
          receiver_addr?: string | null
          receiver_name?: string | null
          receiver_phone1?: string | null
          receiver_phone2?: string | null
          receiver_zip?: string | null
          seller_id?: string | null
          ship_method_reason?: string | null
          ship_msg?: string | null
          site_order_no?: string | null
          site_product_code?: string | null
          status?: string | null
          status_changed_at?: string | null
          total_qty_bundled?: number | null
          tracking_no?: string | null
          upload_date?: string | null
        }
        Update: {
          add_option?: string | null
          collected_at?: string | null
          collector_id?: string | null
          master_product_code?: string | null
          option_text_standardized?: never
          order_unique_code?: string | null
          ordered_at?: string | null
          paid_at?: string | null
          platform_name?: string | null
          product_name?: string | null
          promo_text?: string | null
          qty?: number | null
          receiver_addr?: string | null
          receiver_name?: string | null
          receiver_phone1?: string | null
          receiver_phone2?: string | null
          receiver_zip?: string | null
          seller_id?: string | null
          ship_method_reason?: string | null
          ship_msg?: string | null
          site_order_no?: string | null
          site_product_code?: string | null
          status?: string | null
          status_changed_at?: string | null
          total_qty_bundled?: number | null
          tracking_no?: string | null
          upload_date?: string | null
        }
        Relationships: []
      }
      cm_view_missing_bom_summary: {
        Row: {
          affected_orders: number | null
          matched_kit_id: string | null
        }
        Relationships: []
      }
      cm_view_missing_rules_summary: {
        Row: {
          first_seen: string | null
          missing_count: number | null
          option_text: string | null
          product_name: string | null
        }
        Relationships: []
      }
      cm_view_playauto_result: {
        Row: {
          add_option: string | null
          collected_at: string | null
          collector_id: string | null
          master_product_code: string | null
          option_text_standardized: string | null
          order_unique_code: string | null
          ordered_at: string | null
          paid_at: string | null
          platform_name: string | null
          product_name: string | null
          promo_text: string | null
          qty: number | null
          receiver_addr: string | null
          receiver_name: string | null
          receiver_phone1: string | null
          receiver_phone2: string | null
          receiver_zip: string | null
          seller_id: string | null
          ship_method_reason: string | null
          ship_msg: string | null
          site_order_no: string | null
          site_product_code: string | null
          status: string | null
          status_changed_at: string | null
          total_qty_bundled: number | null
          tracking_no: string | null
          upload_date: string | null
        }
        Insert: {
          add_option?: string | null
          collected_at?: string | null
          collector_id?: string | null
          master_product_code?: string | null
          option_text_standardized?: never
          order_unique_code?: string | null
          ordered_at?: string | null
          paid_at?: string | null
          platform_name?: string | null
          product_name?: string | null
          promo_text?: string | null
          qty?: number | null
          receiver_addr?: string | null
          receiver_name?: string | null
          receiver_phone1?: string | null
          receiver_phone2?: string | null
          receiver_zip?: string | null
          seller_id?: string | null
          ship_method_reason?: string | null
          ship_msg?: string | null
          site_order_no?: string | null
          site_product_code?: string | null
          status?: string | null
          status_changed_at?: string | null
          total_qty_bundled?: number | null
          tracking_no?: string | null
          upload_date?: string | null
        }
        Update: {
          add_option?: string | null
          collected_at?: string | null
          collector_id?: string | null
          master_product_code?: string | null
          option_text_standardized?: never
          order_unique_code?: string | null
          ordered_at?: string | null
          paid_at?: string | null
          platform_name?: string | null
          product_name?: string | null
          promo_text?: string | null
          qty?: number | null
          receiver_addr?: string | null
          receiver_name?: string | null
          receiver_phone1?: string | null
          receiver_phone2?: string | null
          receiver_zip?: string | null
          seller_id?: string | null
          ship_method_reason?: string | null
          ship_msg?: string | null
          site_order_no?: string | null
          site_product_code?: string | null
          status?: string | null
          status_changed_at?: string | null
          total_qty_bundled?: number | null
          tracking_no?: string | null
          upload_date?: string | null
        }
        Relationships: []
      }
      cm_view_promo_daily_stats: {
        Row: {
          daily_qty: number | null
          rule_id: number | null
          stats_date: string | null
        }
        Relationships: []
      }
      cm_view_promo_targets_pending: {
        Row: {
          pending_order_count: number | null
          pending_total_qty: number | null
          promo_name: string | null
          rule_id: number | null
        }
        Relationships: []
      }
      cm_view_unmatched_orders: {
        Row: {
          id: number | null
          option_text: string | null
          platform_name: string | null
          product_name: string | null
          qty: number | null
          upload_date: string | null
        }
        Insert: {
          id?: number | null
          option_text?: string | null
          platform_name?: string | null
          product_name?: string | null
          qty?: number | null
          upload_date?: string | null
        }
        Update: {
          id?: number | null
          option_text?: string | null
          platform_name?: string | null
          product_name?: string | null
          qty?: number | null
          upload_date?: string | null
        }
        Relationships: []
      }
      cms_view_unclassified_items: {
        Row: {
          sales_count: number | null
          site_name: string | null
          site_product_code: string | null
          site_product_name: string | null
          total_revenue: number | null
        }
        Relationships: []
      }
      labdoc_ingredient_summary: {
        Row: {
          code: string | null
          component_count: number | null
          inci_names: string[] | null
          manufacturer: string | null
          name: string | null
          supplier: string | null
          total_ratio: number | null
        }
        Relationships: []
      }
      meeting_analyses: {
        Row: {
          agenda: Json | null
          created_at: string | null
          created_by: string | null
          deep_analysis: Json | null
          generated_at: string | null
          id: string | null
          meeting_date: string | null
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          agenda?: Json | null
          created_at?: string | null
          created_by?: string | null
          deep_analysis?: Json | null
          generated_at?: string | null
          id?: string | null
          meeting_date?: string | null
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          agenda?: Json | null
          created_at?: string | null
          created_by?: string | null
          deep_analysis?: Json | null
          generated_at?: string | null
          id?: string | null
          meeting_date?: string | null
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mv_monthly_delivery_stats: {
        Row: {
          month_key: string | null
          platform_name: string | null
          total_qty: number | null
          unique_delivery_count: number | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          artwork_revision_requests: Json | null
          artwork_revision_required: boolean | null
          artwork_url: string | null
          created_at: string | null
          created_by: string | null
          dropbox_folder_path: string | null
          dropbox_shared_link: string | null
          due_date: string | null
          id: string | null
          invoice_image_url: string | null
          lab_review_required: boolean | null
          material_type: string | null
          min_order_qty: number | null
          notes: string | null
          order_date: string | null
          order_number: string | null
          order_number_backup: string | null
          order_seq: number | null
          product_code: string | null
          product_name: string | null
          quantity: number | null
          raw_material_lot: string | null
          received_by: string | null
          received_date: string | null
          received_qty: number | null
          revised_artwork_file_link: string | null
          slip_date: string | null
          slip_number: string | null
          status: string | null
          supplier_code: string | null
          supplier_name: string | null
          supply_amount: number | null
          total_amount: number | null
          unit_price: number | null
          updated_at: string | null
          vat_amount: number | null
        }
        Insert: {
          artwork_revision_requests?: Json | null
          artwork_revision_required?: boolean | null
          artwork_url?: string | null
          created_at?: string | null
          created_by?: string | null
          dropbox_folder_path?: string | null
          dropbox_shared_link?: string | null
          due_date?: string | null
          id?: string | null
          invoice_image_url?: string | null
          lab_review_required?: boolean | null
          material_type?: string | null
          min_order_qty?: number | null
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          order_number_backup?: string | null
          order_seq?: number | null
          product_code?: string | null
          product_name?: string | null
          quantity?: number | null
          raw_material_lot?: string | null
          received_by?: string | null
          received_date?: string | null
          received_qty?: number | null
          revised_artwork_file_link?: string | null
          slip_date?: string | null
          slip_number?: string | null
          status?: string | null
          supplier_code?: string | null
          supplier_name?: string | null
          supply_amount?: number | null
          total_amount?: number | null
          unit_price?: number | null
          updated_at?: string | null
          vat_amount?: number | null
        }
        Update: {
          artwork_revision_requests?: Json | null
          artwork_revision_required?: boolean | null
          artwork_url?: string | null
          created_at?: string | null
          created_by?: string | null
          dropbox_folder_path?: string | null
          dropbox_shared_link?: string | null
          due_date?: string | null
          id?: string | null
          invoice_image_url?: string | null
          lab_review_required?: boolean | null
          material_type?: string | null
          min_order_qty?: number | null
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          order_number_backup?: string | null
          order_seq?: number | null
          product_code?: string | null
          product_name?: string | null
          quantity?: number | null
          raw_material_lot?: string | null
          received_by?: string | null
          received_date?: string | null
          received_qty?: number | null
          revised_artwork_file_link?: string | null
          slip_date?: string | null
          slip_number?: string | null
          status?: string | null
          supplier_code?: string | null
          supplier_name?: string | null
          supply_amount?: number | null
          total_amount?: number | null
          unit_price?: number | null
          updated_at?: string | null
          vat_amount?: number | null
        }
        Relationships: []
      }
      rise_calendar_schedules_view: {
        Row: {
          completed_qty: number | null
          id: string | null
          instruction_file_url: string | null
          is_additional: boolean | null
          lot_no: string | null
          lot_number: string | null
          notes: string | null
          plan_completed_qty: number | null
          plan_id: string | null
          plan_notes: string | null
          plan_planned_qty: number | null
          plan_status: string | null
          product_category: string | null
          product_code: string | null
          product_name: string | null
          production_plan_id: string | null
          scheduled_date: string | null
          scheduled_qty: number | null
          status: string | null
          work_type: string | null
        }
        Relationships: []
      }
      rise_equipments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rise_lots_view: {
        Row: {
          bubble_id: string | null
          created_at: string | null
          end_time: string | null
          id: string | null
          lot_category: string | null
          lot_number: string | null
          manufacturing_cost: number | null
          metadata: Json | null
          product_code: string | null
          product_id: string | null
          production_date: string | null
          quantity: number | null
          remarks: string | null
          reporter: string | null
          sequence_no: number | null
          start_time: string | null
          status: string | null
          updated_at: string | null
          weighing_instruction_url: string | null
        }
        Insert: {
          bubble_id?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string | null
          lot_category?: string | null
          lot_number?: string | null
          manufacturing_cost?: number | null
          metadata?: Json | null
          product_code?: string | null
          product_id?: string | null
          production_date?: string | null
          quantity?: number | null
          remarks?: string | null
          reporter?: string | null
          sequence_no?: number | null
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
          weighing_instruction_url?: string | null
        }
        Update: {
          bubble_id?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string | null
          lot_category?: string | null
          lot_number?: string | null
          manufacturing_cost?: number | null
          metadata?: Json | null
          product_code?: string | null
          product_id?: string | null
          production_date?: string | null
          quantity?: number | null
          remarks?: string | null
          reporter?: string | null
          sequence_no?: number | null
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
          weighing_instruction_url?: string | null
        }
        Relationships: []
      }
      rise_production_plans_view: {
        Row: {
          bubble_schedule_id: string | null
          completed_qty: number | null
          created_at: string | null
          first_planned_date: string | null
          id: string | null
          instruction_file_url: string | null
          lot_id: string | null
          lot_no: string | null
          metadata: Json | null
          notes: string | null
          planned_qty: number | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          status: string | null
          updated_at: string | null
          work_type: string | null
        }
        Insert: {
          bubble_schedule_id?: never
          completed_qty?: number | null
          created_at?: string | null
          first_planned_date?: string | null
          id?: string | null
          instruction_file_url?: string | null
          lot_id?: string | null
          lot_no?: string | null
          metadata?: never
          notes?: string | null
          planned_qty?: number | null
          product_code?: string | null
          product_id?: string | null
          product_name?: string | null
          status?: string | null
          updated_at?: string | null
          work_type?: string | null
        }
        Update: {
          bubble_schedule_id?: never
          completed_qty?: number | null
          created_at?: string | null
          first_planned_date?: string | null
          id?: string | null
          instruction_file_url?: string | null
          lot_id?: string | null
          lot_no?: string | null
          metadata?: never
          notes?: string | null
          planned_qty?: number | null
          product_code?: string | null
          product_id?: string | null
          product_name?: string | null
          status?: string | null
          updated_at?: string | null
          work_type?: string | null
        }
        Relationships: []
      }
      rise_products: {
        Row: {
          brand: string | null
          category: string | null
          code: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          specification: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          code?: string | null
          id?: never
          is_active?: boolean | null
          name?: string | null
          specification?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          code?: string | null
          id?: never
          is_active?: boolean | null
          name?: string | null
          specification?: string | null
        }
        Relationships: []
      }
      rise_products_view: {
        Row: {
          bom: Json | null
          category: string | null
          code: string | null
          created_at: string | null
          default_supplier: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          specs: Json | null
          standard: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          bom?: Json | null
          category?: string | null
          code?: string | null
          created_at?: string | null
          default_supplier?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          specs?: Json | null
          standard?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          bom?: Json | null
          category?: string | null
          code?: string | null
          created_at?: string | null
          default_supplier?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          specs?: Json | null
          standard?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rise_schedules_full: {
        Row: {
          duration_minutes: number | null
          end_time: string | null
          equipment: string | null
          id: string | null
          is_completed: boolean | null
          lot_no: string | null
          man_hours: number | null
          notes: string | null
          operation_name: string | null
          plan_completed_qty: number | null
          plan_id: string | null
          plan_notes: string | null
          plan_progress: number | null
          plan_status: string | null
          plan_target_qty: number | null
          product_category: string | null
          product_code: string | null
          product_name: string | null
          production_plan_id: string | null
          qty: number | null
          scheduled_date: string | null
          scheduled_qty: number | null
          start_time: string | null
          status: string | null
          work_type: string | null
          worker_count: number | null
          workers: Json | null
        }
        Relationships: []
      }
      rise_work_operations: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          end_time: string | null
          equipment: string | null
          id: string | null
          is_completed: boolean | null
          man_hours: number | null
          metadata: Json | null
          notes: string | null
          operation_name: string | null
          product_code: string | null
          production_plan_id: string | null
          quantity: number | null
          scheduled_qty: number | null
          start_time: string | null
          updated_at: string | null
          work_date: string | null
          worker_count: number | null
          workers: Json | null
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          equipment?: string | null
          id?: string | null
          is_completed?: boolean | null
          man_hours?: number | null
          metadata?: Json | null
          notes?: string | null
          operation_name?: string | null
          product_code?: string | null
          production_plan_id?: string | null
          quantity?: number | null
          scheduled_qty?: number | null
          start_time?: string | null
          updated_at?: string | null
          work_date?: string | null
          worker_count?: number | null
          workers?: Json | null
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          equipment?: string | null
          id?: string | null
          is_completed?: boolean | null
          man_hours?: number | null
          metadata?: Json | null
          notes?: string | null
          operation_name?: string | null
          product_code?: string | null
          production_plan_id?: string | null
          quantity?: number | null
          scheduled_qty?: number | null
          start_time?: string | null
          updated_at?: string | null
          work_date?: string | null
          worker_count?: number | null
          workers?: Json | null
        }
        Relationships: []
      }
      rise_workers: {
        Row: {
          created_at: string | null
          department: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          phone: string | null
          position: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rise_workers_v2: {
        Row: {
          created_at: string | null
          department: string | null
          display_order: number | null
          id: string | null
          is_active: boolean | null
          name: string | null
          phone: string | null
          position: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          display_order?: number | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          display_order?: number | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ru_current_prices: {
        Row: {
          commission: number | null
          effective_date: string | null
          final_price: number | null
          product_code: string | null
          supply_price: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ru_prices_product_code_fkey"
            columns: ["product_code"]
            isOneToOne: false
            referencedRelation: "ru_products"
            referencedColumns: ["product_code"]
          },
        ]
      }
      users_with_roles: {
        Row: {
          created_at: string | null
          department: string | null
          display_name: string | null
          email: string | null
          id: string | null
          last_sign_in_at: string | null
          name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: []
      }
      v_distributed_work_efficiency: {
        Row: {
          completed_qty: number | null
          core_work_pct: number | null
          distribution_grade: string | null
          first_work_date: string | null
          last_work_date: string | null
          lead_time_days: number | null
          min_per_thousand: number | null
          plan_id: string | null
          prep_work_pct: number | null
          product_code: string | null
          product_name: string | null
          status: string | null
          target_date: string | null
          target_qty: number | null
          total_man_minutes: number | null
          total_operations: number | null
          unique_sub_ops: number | null
          work_days_span: number | null
          work_type: string | null
        }
        Relationships: []
      }
      v_distribution_summary: {
        Row: {
          avg_core_pct: number | null
          avg_days_span: number | null
          avg_min_per_thousand: number | null
          avg_operations: number | null
          avg_prep_pct: number | null
          avg_sub_ops: number | null
          distribution_grade: string | null
          plan_count: number | null
          work_type: string | null
        }
        Relationships: []
      }
      v_manufacturing_lots_full: {
        Row: {
          bubble_id: string | null
          created_at: string | null
          end_time: string | null
          id: string | null
          lot_category: string | null
          lot_number: string | null
          manufacturing_cost: number | null
          metadata: Json | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          product_spec: string | null
          production_date: string | null
          quantity: number | null
          remarks: string | null
          reporter: string | null
          sequence_no: number | null
          start_time: string | null
          status: string | null
          updated_at: string | null
          weighing_instruction_url: string | null
        }
        Relationships: []
      }
      v_meeting_action_items: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string | null
          meeting_date: string | null
          notes: string | null
          owner: string | null
          priority: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          meeting_date?: string | null
          notes?: string | null
          owner?: string | null
          priority?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          meeting_date?: string | null
          notes?: string | null
          owner?: string | null
          priority?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_product_efficiency_stats: {
        Row: {
          cum_min_per_thousand: number | null
          product_code: string | null
          total_op_count: number | null
          total_qty: number | null
          work_type: string | null
          yearly_stats: Json | null
        }
        Relationships: []
      }
      v_product_operation_efficiency_stats: {
        Row: {
          avg_man_minutes_per_op: number | null
          cum_min_per_thousand: number | null
          operation_name: string | null
          product_code: string | null
          total_op_count: number | null
          total_qty: number | null
          work_type: string | null
          yearly_stats: Json | null
        }
        Relationships: []
      }
      v_production_plans_v2_full: {
        Row: {
          completed_qty: number | null
          created_at: string | null
          end_time: string | null
          group_completed_qty: number | null
          id: string | null
          instruction_file_url: string | null
          is_parent: boolean | null
          lot_count: number | null
          lot_id: string | null
          lot_no: string | null
          notes: string | null
          operation_count: number | null
          original_unique_id: string | null
          product_category: string | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          production_date: string | null
          progress_rate: number | null
          reporter: string | null
          start_time: string | null
          status: string | null
          target_date: string | null
          target_qty: number | null
          updated_at: string | null
          work_message: string | null
          work_type: string | null
        }
        Relationships: []
      }
      v_sub_operation_efficiency: {
        Row: {
          avg_man_minutes_per_op: number | null
          cum_min_per_thousand: number | null
          product_code: string | null
          sub_operation: string | null
          total_op_count: number | null
          total_qty: number | null
          work_type: string | null
          yearly_stats: Json | null
        }
        Relationships: []
      }
      v_work_operations_v2_full: {
        Row: {
          actual_duration_minutes: number | null
          completed_qty: number | null
          created_at: string | null
          duration_minutes: number | null
          end_time: string | null
          equipment: string | null
          estimated_minutes: number | null
          id: string | null
          is_completed: boolean | null
          lot_no: string | null
          man_hours: number | null
          notes: string | null
          operation_name: string | null
          original_product_code: string | null
          plan_status: string | null
          plan_target_date: string | null
          product_category: string | null
          product_code: string | null
          product_name: string | null
          production_plan_id: string | null
          scheduled_qty: number | null
          start_time: string | null
          status: string | null
          sub_operation: string | null
          target_qty: number | null
          updated_at: string | null
          work_date: string | null
          work_type: string | null
          worker_count: number | null
          workers: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_credits: {
        Args: {
          p_amount: number
          p_description: string
          p_transaction_type?: string
          p_user_id: string
        }
        Returns: undefined
      }
      add_lot_entry_v2: {
        Args: {
          p_completed_qty?: number
          p_lot_no: string
          p_notes?: string
          p_parent_plan_id: string
        }
        Returns: string
      }
      analyze_all_tables: {
        Args: never
        Returns: {
          last_activity: string
          row_count: number
          size: string
          status: string
          table_name: string
          total_operations: number
        }[]
      }
      apply_mapping_rule: {
        Args: { _kit_id: string; _raw_identifier: string }
        Returns: number
      }
      batch_reorder_projects: {
        Args: { ids: string[]; positions: number[] }
        Returns: undefined
      }
      batch_reorder_tasks: {
        Args: { ids: string[]; positions: number[] }
        Returns: undefined
      }
      bulk_insert_orders: { Args: { orders: Json }; Returns: Json }
      cleanup_expired_cache: { Args: never; Returns: number }
      cm_calculate_lot_remaining: {
        Args: { p_product_id: string }
        Returns: {
          expiry_date: string
          id: number
          lot_number: string
          produced_qty: number
          production_date: string
          remaining_qty: number
          status: string
        }[]
      }
      complete_manufacturing_report: {
        Args: {
          p_end_time: string
          p_lot_id: string
          p_remarks?: string
          p_reporter: string
          p_start_time: string
        }
        Returns: boolean
      }
      complete_production_plan_v2: {
        Args: {
          p_completed_qty: number
          p_id: string
          p_lot_no?: string
          p_notes?: string
        }
        Returns: boolean
      }
      complete_work_operations: {
        Args: { p_completed_qty: number; p_production_plan_id: string }
        Returns: undefined
      }
      create_production_plan_v2: {
        Args: {
          p_notes?: string
          p_product_code: string
          p_target_date: string
          p_target_qty: number
          p_work_type: string
        }
        Returns: string
      }
      deduct_credits: {
        Args: { p_amount: number; p_description: string; p_user_id: string }
        Returns: undefined
      }
      delete_production_plan_v2: { Args: { p_id: string }; Returns: boolean }
      delete_work_operation_v2: { Args: { p_id: string }; Returns: boolean }
      execute_readonly_query: { Args: { query_text: string }; Returns: Json }
      find_ingredients_by_names: {
        Args: { ingredients: string[] }
        Returns: {
          clinical_studies_summary: string
          conclusion: string
          cosmetic_applications_and_commercial_products: string
          efficacy_en: string
          efficacy_kr: string
          id: number
          inci_definition: string
          inci_name_en: string
          ingredient_en: string
          ingredient_kr: string
          key_mechanisms: string
          "Last updated": string
          skin_benefits: string
        }[]
      }
      find_similar_ingredients: {
        Args: { input_ingredient: string; topn?: number }
        Returns: {
          distance: number
          efficacy_en: string
          efficacy_kr: string
          ingredient_en: string
          ingredient_kr: string
        }[]
      }
      fn_apply_promotions: { Args: never; Returns: Json }
      fn_confirm_gift_drafts: { Args: { p_gift_ids: number[] }; Returns: Json }
      fn_generate_gift_drafts: { Args: { p_rule_id?: number }; Returns: Json }
      fn_get_coupang_order_summary: {
        Args: { p_expected_date?: string; p_process_status?: string }
        Returns: {
          center_code: string
          confirmed_count: number
          confirmed_qty: number
          pending_count: number
          total_orders: number
          total_qty: number
        }[]
      }
      fn_get_dispatch_summary: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          platform_name: string
          product_id: string
          product_name: string
          product_spec: string
          total_qty: number
        }[]
      }
      fn_get_pending_promo_summary:
        | {
            Args: never
            Returns: {
              date_range: string
              pending_order_count: number
              promo_name: string
              rule_id: number
            }[]
          }
        | {
            Args: { p_lookup_end?: string; p_lookup_start?: string }
            Returns: {
              date_range: string
              pending_order_count: number
              promo_name: string
              rule_id: number
            }[]
          }
      fn_match_order_kits: { Args: never; Returns: undefined }
      fn_parse_flexible_date: { Args: { p_date_str: string }; Returns: string }
      fn_parse_mixed_date: { Args: { p_date_str: string }; Returns: string }
      get_comprehensive_recommendations_fixed: {
        Args: { input_formula: string; input_ingredient: string; topn?: number }
        Returns: Json
      }
      get_daily_shipments: {
        Args: { end_date: string; start_date: string }
        Returns: {
          day_key: string
          shipment_count: number
        }[]
      }
      get_dashboard_stats_v2: {
        Args: { start_date: string }
        Returns: {
          month_key: string
          platform_name: string
          total_qty: number
          unique_delivery_count: number
        }[]
      }
      get_distinct_kit_ids: {
        Args: never
        Returns: {
          kit_id: string
        }[]
      }
      get_ingredients_by_efficacy: {
        Args: { efficacy1: string; efficacy2?: string; topn?: number }
        Returns: Json
      }
      get_monthly_delivery_stats: {
        Args: { target_month: string }
        Returns: {
          daily_total: number
          monthly_cumul: number
          stat_date: string
          top_platforms: Json
        }[]
      }
      get_next_lot_sequence: { Args: { p_category: string }; Returns: number }
      get_operation_suggestions: {
        Args: { p_product_code: string }
        Returns: {
          avg_duration: number
          equipment: string
          operation_name: string
          sample_count: number
        }[]
      }
      get_product_brands: {
        Args: never
        Returns: {
          brand: string
        }[]
      }
      get_product_lot_category: {
        Args: { p_product_code: string }
        Returns: string
      }
      get_purchases_for_erp: {
        Args: { purchase_ids: string[] }
        Returns: {
          id: string
          product_code: string
          product_name: string
          quantity: number
          received_date: string
          supplier_code: string
          supplier_name: string
          supply_amount: number
          unit_price: number
          vat_amount: number
        }[]
      }
      get_recommendations_final: {
        Args: { input_formula: string; input_ingredient: string; topn?: number }
        Returns: Json
      }
      get_related_plans_for_material: {
        Args: { material_code_param: string }
        Returns: {
          plan_id: string
          product_code: string
          product_name: string
          required_qty: number
          status: string
          target_date: string
          target_qty: number
          work_type: string
        }[]
      }
      get_rise_work_schedules: {
        Args: { date_end: string; date_start: string }
        Returns: {
          completed_qty: number
          id: string
          instruction_file_url: string
          is_additional: boolean
          notes: string
          plan_completed_qty: number
          plan_id: string
          plan_notes: string
          plan_status: string
          planned_qty: number
          product_category: string
          product_code: string
          product_name: string
          production_plan_id: string
          scheduled_date: string
          scheduled_qty: number
          status: string
          work_type: string
        }[]
      }
      get_robust_recommendations: {
        Args: { input_formula: string; input_ingredient: string; topn?: number }
        Returns: Json
      }
      get_similar_ingredients_by_benefits: {
        Args: { ingredient_name: string; similarity_limit?: number }
        Returns: {
          id: number
          ingredient_en: string
          ingredient_kr: string
          similarity_score: number
          skin_benefits: string
        }[]
      }
      get_smart_recommendations: {
        Args: { input_formula: string; input_ingredient: string; topn?: number }
        Returns: Json
      }
      get_standard_category: {
        Args: { input_text: string }
        Returns: {
          category: string
          subcategory: string
        }[]
      }
      get_top_products_exploded: {
        Args: { limit_count?: number; start_date: string }
        Returns: {
          product_id: string
          product_name: string
          total_qty: number
        }[]
      }
      get_user_permissions: {
        Args: { user_uuid: string }
        Returns: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          resource: string
        }[]
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      grant_credits: {
        Args: {
          p_admin_id: string
          p_amount: number
          p_description: string
          p_user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: {
          check_resource: string
          permission_type?: string
          user_uuid: string
        }
        Returns: boolean
      }
      insert_lot: {
        Args: {
          p_lot_category: string
          p_lot_number: string
          p_product_code: string
          p_production_date: string
          p_quantity: number
          p_sequence_no: number
        }
        Returns: string
      }
      insert_production_plan_report: {
        Args: {
          p_lot_no: string
          p_notes?: string
          p_product_code: string
          p_product_id: string
          p_product_name: string
          p_status?: string
          p_target_date: string
          p_target_qty: number
          p_work_type: string
        }
        Returns: Json
      }
      match_formulas_by_embedding: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          id: number
          image_url: string
          key_features: string
          main_ingredients: string
          similarity: number
          title_en: string
          title_kr: string
          type: string
          usage_instructions: string
        }[]
      }
      match_ingredients_by_embedding: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          id: number
          inci: string
          ingredient_en: string
          ingredient_kr: string
          similarity: number
          skin_benefits: string
        }[]
      }
      move_daily_tasks: {
        Args: { p_dates: string[]; p_ids: string[]; p_positions: number[] }
        Returns: undefined
      }
      op_inventory_check: {
        Args: { p_keyword: string }
        Returns: {
          current_stock: number
          item_name: string
          safety_stock: number
        }[]
      }
      op_promotion_history: {
        Args: { p_keyword: string }
        Returns: {
          end_date: string
          promo_name: string
          review_comment: string
          start_date: string
        }[]
      }
      op_sales_trend: {
        Args: { p_end_date: string; p_keyword?: string; p_start_date: string }
        Returns: {
          sale_date: string
          top_item: string
          total_qty: number
          total_revenue: number
        }[]
      }
      recommend_ingredients_by_benefits: {
        Args: { main_benefits: string; product_name?: string }
        Returns: {
          category: string
          inci_name: string
          ingredient_name_en: string
          ingredient_name_kr: string
          match_reason: string
          rank_no: number
          relevance_score: number
          skin_benefits: string
        }[]
      }
      recommend_ingredients_by_benefits_random: {
        Args: {
          main_benefits: string
          product_name?: string
          random_factor?: number
        }
        Returns: {
          category: string
          inci_name: string
          ingredient_name_en: string
          ingredient_name_kr: string
          match_reason: string
          random_boost: number
          rank_no: number
          relevance_score: number
          skin_benefits: string
        }[]
      }
      recommend_ingredients_by_benefits_random_image: {
        Args: {
          exclude_ingredients?: string
          main_benefits: string
          random_factor?: number
        }
        Returns: {
          category: string
          category_all_en: string
          clinical_studies_summary: string
          image_url: string
          inci: string
          ingredient_en: string
          ingredient_kr: string
          match_reason: string
          random_boost: number
          rank_no: number
          relevance_score: number
          skin_benefits: string
        }[]
      }
      recommend_ingredients_enhanced: {
        Args: { main_benefits: string; product_name?: string }
        Returns: {
          category: string
          inci_name: string
          ingredient_name_en: string
          ingredient_name_kr: string
          keyword_score: number
          match_reason: string
          rank_no: number
          skin_benefits: string
          total_score: number
          vector_score: number
        }[]
      }
      refresh_dashboard_stats: { Args: never; Returns: undefined }
      reopen_manufacturing_report: {
        Args: { p_lot_id: string }
        Returns: boolean
      }
      reopen_production_plan_v2: { Args: { p_id: string }; Returns: boolean }
      rise_calculate_material_requirements: {
        Args: { p_end_date: string; p_start_date: string; p_work_type?: string }
        Returns: {
          balance: number
          current_stock: number
          material_code: string
          material_id: string
          material_name: string
          total_required: number
        }[]
      }
      rise_generate_lot_number: { Args: { category: string }; Returns: string }
      rise_get_user_role: { Args: never; Returns: string }
      rise_sync_bom: {
        Args: never
        Returns: {
          bom_deleted: number
          bom_inserted: number
          bom_updated: number
          materials_created: number
          products_created: number
        }[]
      }
      ru_generate_order_number: {
        Args: { p_region_code: string }
        Returns: string
      }
      search_by_text: {
        Args: { intent_category?: string; query_text: string }
        Returns: {
          item_category: string
          item_id: string
          item_name: string
          metadata: Json
          ranking_score: number
          relevance_score: number
          source_type: string
        }[]
      }
      search_integrated_insights: {
        Args: {
          ingredient_limit?: number
          intent_category?: string
          intent_keywords: string[]
          market_limit?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          item_category: string
          item_id: string
          item_name: string
          metadata: Json
          ranking_score: number
          relevance_score: number
          source_type: string
        }[]
      }
      search_market_trends: {
        Args: {
          brand_filter?: string
          category_filter?: string
          intent_type?: string
          min_rating?: number
          min_reviews?: number
          query_embedding: string
          search_limit?: number
        }
        Returns: {
          brand: string
          category: string
          core_benefits: string[]
          is_best: boolean
          key_ingredients: string[]
          match_reason: string
          price: number
          product_code: string
          product_name: string
          ranking: number
          relevance_type: string
          review_count: number
          review_rating: number
          similarity_score: number
        }[]
      }
      search_products_advanced: {
        Args: { query_embedding: string; search_params: Json }
        Returns: {
          brand: string
          category: string
          core_benefits: string[]
          is_best: boolean
          key_ingredients: string[]
          match_reason: string
          price: number
          product_code: string
          product_name: string
          ranking: number
          review_count: number
          review_rating: number
          similarity_score: number
          sub_category: string
          total_score: number
        }[]
      }
      search_products_by_benefits: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          brand: string
          core_benefits: string[]
          id: number
          product_name: string
          similarity: number
          target_concerns: string[]
        }[]
      }
      search_products_by_embedding:
        | {
            Args: {
              category_filter?: string
              limit_count?: number
              query_embedding: string
            }
            Returns: {
              brand: string
              category: string
              price: number
              product_code: string
              product_name: string
              review_count: number
              review_rating: number
              similarity_score: number
            }[]
          }
        | {
            Args: {
              category_filter?: string
              limit_count?: number
              min_rating?: number
              min_reviews?: number
              query_embedding: string
              subcategory_filter?: string
            }
            Returns: {
              brand: string
              category: string
              category_match_boost: number
              is_best: boolean
              price: number
              product_code: string
              product_name: string
              ranking: number
              review_count: number
              review_rating: number
              similarity_score: number
              sub_category: string
            }[]
          }
        | {
            Args: {
              match_count: number
              match_threshold: number
              query_embedding: string
            }
            Returns: {
              brand: string
              core_benefits: string[]
              differentiation: string[]
              id: number
              product_description: string
              product_name: string
              similarity: number
            }[]
          }
      search_similar_benefits: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          id: number
          ingredient_en: string
          ingredient_kr: string
          similarity: number
          skin_benefits: string
        }[]
      }
      search_similar_category: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category_all_en: string
          id: number
          ingredient_en: string
          ingredient_kr: string
          similarity: number
        }[]
      }
      search_similar_clinical: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          clinical_studies_summary: string
          id: number
          ingredient_en: string
          ingredient_kr: string
          similarity: number
        }[]
      }
      search_similar_ingredients: {
        Args: {
          max_results?: number
          query_embedding?: string
          query_text: string
          similarity_threshold?: number
        }
        Returns: {
          efficacy_en: string
          efficacy_kr: string
          id: number
          ingredient_en: string
          ingredient_kr: string
          research_data: Json
          safety_score: number
          scientific_rating: number
          similarity: number
        }[]
      }
      set_user_admin: { Args: { p_user_id: string }; Returns: undefined }
      sync_erp_products: { Args: never; Returns: Json }
      transfer_remaining_qty_v2: {
        Args: {
          p_operation_id: string
          p_remaining_qty?: number
          p_target_date: string
        }
        Returns: string
      }
      update_ingredient_research: {
        Args: {
          p_ingredient_id: number
          p_research_data: Json
          p_safety_score?: number
          p_scientific_rating?: number
          p_sources?: string[]
        }
        Returns: boolean
      }
      update_lot_weighing_url: {
        Args: { p_lot_number: string; p_weighing_url: string }
        Returns: undefined
      }
      update_manufacturing_report: {
        Args: {
          p_end_time?: string
          p_lot_id: string
          p_remarks?: string
          p_reporter?: string
          p_start_time?: string
        }
        Returns: boolean
      }
      update_operations_by_plan_date: {
        Args: {
          p_is_completed: boolean
          p_production_plan_id: string
          p_scheduled_qty: number
          p_work_date: string
        }
        Returns: undefined
      }
      update_plan_target_date: {
        Args: { p_plan_id: string; p_target_date: string }
        Returns: boolean
      }
      update_production_plan_report: {
        Args: {
          p_completed_qty?: number
          p_end_time?: string
          p_lot_no?: string
          p_notes?: string
          p_plan_id: string
          p_reporter?: string
          p_start_time?: string
          p_status?: string
        }
        Returns: Json
      }
      update_production_plan_v2: {
        Args: {
          p_id: string
          p_notes?: string
          p_target_date: string
          p_target_qty: number
          p_work_type: string
        }
        Returns: boolean
      }
      update_production_report: {
        Args: {
          p_completed_qty?: number
          p_id: string
          p_lot_no?: string
          p_notes?: string
        }
        Returns: boolean
      }
      upsert_work_operation: {
        Args: {
          p_duration_minutes?: number
          p_end_time?: string
          p_equipment?: string
          p_id?: string
          p_is_completed?: boolean
          p_man_hours?: number
          p_notes?: string
          p_operation_name?: string
          p_product_code?: string
          p_production_plan_id?: string
          p_quantity?: number
          p_scheduled_qty?: number
          p_start_time?: string
          p_work_date?: string
          p_worker_count?: number
          p_workers?: Json
        }
        Returns: string
      }
      upsert_work_operation_v2: {
        Args: {
          p_completed_qty?: number
          p_duration_minutes?: number
          p_end_time?: string
          p_equipment?: string
          p_estimated_minutes?: number
          p_id?: string
          p_is_completed?: boolean
          p_notes?: string
          p_operation_name?: string
          p_product_code?: string
          p_production_plan_id?: string
          p_scheduled_qty?: number
          p_start_time?: string
          p_status?: string
          p_work_date?: string
          p_worker_count?: number
          p_workers?: Json
        }
        Returns: string
      }
      uuid_generate_v1: { Args: never; Returns: string }
      uuid_generate_v1mc: { Args: never; Returns: string }
      uuid_generate_v3: {
        Args: { name: string; namespace: string }
        Returns: string
      }
      uuid_generate_v4: { Args: never; Returns: string }
      uuid_generate_v5: {
        Args: { name: string; namespace: string }
        Returns: string
      }
      uuid_nil: { Args: never; Returns: string }
      uuid_ns_dns: { Args: never; Returns: string }
      uuid_ns_oid: { Args: never; Returns: string }
      uuid_ns_url: { Args: never; Returns: string }
      uuid_ns_x500: { Args: never; Returns: string }
      validate_research_quality: {
        Args: { p_research_data: Json }
        Returns: number
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "monitoring"
        | "pending"
        | "production_manager"
        | "materials_manager"
        | "manufacturing_team"
        | "viewer"
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
      app_role: [
        "admin",
        "monitoring",
        "pending",
        "production_manager",
        "materials_manager",
        "manufacturing_team",
        "viewer",
      ],
    },
  },
} as const
