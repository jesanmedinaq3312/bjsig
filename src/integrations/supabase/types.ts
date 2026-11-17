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
      activity_logs: {
        Row: {
          action: string | null
          amount: number
          cookie_data: Json | null
          created_at: string
          data: Json
          date: string | null
          details: Json | null
          device_id: string | null
          entity: string | null
          entity_id: string | null
          entity_label: string | null
          fingerprint: string | null
          id: string
          ip_hint: string | null
          label: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          page_path: string | null
          referrer: string | null
          session_duration: number | null
          session_id: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          user_agent: string | null
          user_email: string | null
          user_role: string | null
          viewport: string | null
          worker_rut: string | null
        }
        Insert: {
          action?: string | null
          amount?: number
          cookie_data?: Json | null
          created_at?: string
          data?: Json
          date?: string | null
          details?: Json | null
          device_id?: string | null
          entity?: string | null
          entity_id?: string | null
          entity_label?: string | null
          fingerprint?: string | null
          id?: string
          ip_hint?: string | null
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          page_path?: string | null
          referrer?: string | null
          session_duration?: number | null
          session_id?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_role?: string | null
          viewport?: string | null
          worker_rut?: string | null
        }
        Update: {
          action?: string | null
          amount?: number
          cookie_data?: Json | null
          created_at?: string
          data?: Json
          date?: string | null
          details?: Json | null
          device_id?: string | null
          entity?: string | null
          entity_id?: string | null
          entity_label?: string | null
          fingerprint?: string | null
          id?: string
          ip_hint?: string | null
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          page_path?: string | null
          referrer?: string | null
          session_duration?: number | null
          session_id?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_role?: string | null
          viewport?: string | null
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      allowed_emails: {
        Row: {
          access_expires_at: string | null
          active: boolean
          ad_synced: boolean
          created_at: string
          email: string
          id: string
          must_change_password: boolean
          password_set_at: string | null
          permissions: Json
          role: string
          tenant_id: string | null
          worker_rut: string | null
        }
        Insert: {
          access_expires_at?: string | null
          active?: boolean
          ad_synced?: boolean
          created_at?: string
          email: string
          id?: string
          must_change_password?: boolean
          password_set_at?: string | null
          permissions?: Json
          role?: string
          tenant_id?: string | null
          worker_rut?: string | null
        }
        Update: {
          access_expires_at?: string | null
          active?: boolean
          ad_synced?: boolean
          created_at?: string
          email?: string
          id?: string
          must_change_password?: boolean
          password_set_at?: string | null
          permissions?: Json
          role?: string
          tenant_id?: string | null
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allowed_emails_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ast_logs: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ast_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ast_logs_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      attendance_rectifications: {
        Row: {
          created_at: string
          id: string
          prev_hash: string | null
          proposed_at: string
          proposed_scan_type: string | null
          reason: string
          requested_by: string
          response_hash: string | null
          row_hash: string | null
          scan_event_id: string | null
          status: string
          tenant_id: string
          worker_comment: string | null
          worker_ip: string | null
          worker_response_at: string | null
          worker_rut: string
        }
        Insert: {
          created_at?: string
          id?: string
          prev_hash?: string | null
          proposed_at: string
          proposed_scan_type?: string | null
          reason: string
          requested_by?: string
          response_hash?: string | null
          row_hash?: string | null
          scan_event_id?: string | null
          status?: string
          tenant_id?: string
          worker_comment?: string | null
          worker_ip?: string | null
          worker_response_at?: string | null
          worker_rut: string
        }
        Update: {
          created_at?: string
          id?: string
          prev_hash?: string | null
          proposed_at?: string
          proposed_scan_type?: string | null
          reason?: string
          requested_by?: string
          response_hash?: string | null
          row_hash?: string | null
          scan_event_id?: string | null
          status?: string
          tenant_id?: string
          worker_comment?: string | null
          worker_ip?: string | null
          worker_response_at?: string | null
          worker_rut?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_rectifications_scan_event_id_fkey"
            columns: ["scan_event_id"]
            isOneToOne: false
            referencedRelation: "qr_scan_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_rectifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_reports: {
        Row: {
          created_at: string
          generated_by: string | null
          id: string
          period_end: string
          period_start: string
          period_type: string
          response_hash: string | null
          row_hash: string
          summary: Json
          tenant_id: string
          worker_comment: string | null
          worker_response_at: string | null
          worker_rut: string
          worker_status: string
        }
        Insert: {
          created_at?: string
          generated_by?: string | null
          id?: string
          period_end: string
          period_start: string
          period_type: string
          response_hash?: string | null
          row_hash: string
          summary?: Json
          tenant_id?: string
          worker_comment?: string | null
          worker_response_at?: string | null
          worker_rut: string
          worker_status?: string
        }
        Update: {
          created_at?: string
          generated_by?: string | null
          id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          response_hash?: string | null
          row_hash?: string
          summary?: Json
          tenant_id?: string
          worker_comment?: string | null
          worker_response_at?: string | null
          worker_rut?: string
          worker_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_time_sync: {
        Row: {
          checked_at: string
          error: string | null
          id: string
          official_time: string | null
          offset_ms: number | null
          source: string
          within_tolerance: boolean
        }
        Insert: {
          checked_at?: string
          error?: string | null
          id?: string
          official_time?: string | null
          offset_ms?: number | null
          source?: string
          within_tolerance?: boolean
        }
        Update: {
          checked_at?: string
          error?: string | null
          id?: string
          official_time?: string | null
          offset_ms?: number | null
          source?: string
          within_tolerance?: boolean
        }
        Relationships: []
      }
      brain_graph_layout: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          node_id: string
          pinned: boolean
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
          x: number
          y: number
          z: number
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          node_id: string
          pinned?: boolean
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
          x?: number
          y?: number
          z?: number
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          node_id?: string
          pinned?: boolean
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
          x?: number
          y?: number
          z?: number
        }
        Relationships: [
          {
            foreignKeyName: "brain_graph_layout_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_graph_layout_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      brain_graph_links: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          kind: string
          label: string | null
          name: string | null
          source: string
          status: string | null
          target: string
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          kind?: string
          label?: string | null
          name?: string | null
          source?: string
          status?: string | null
          target?: string
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          kind?: string
          label?: string | null
          name?: string | null
          source?: string
          status?: string | null
          target?: string
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brain_graph_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_graph_links_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      brain_graph_nodes: {
        Row: {
          amount: number
          category: string
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          lines: number
          name: string | null
          path: string
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          lines?: number
          name?: string | null
          path?: string
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          lines?: number
          name?: string | null
          path?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brain_graph_nodes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_graph_nodes_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      circular_acknowledgments: {
        Row: {
          acknowledged_at: string | null
          amount: number
          circular_id: string | null
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          amount?: number
          circular_id?: string | null
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          amount?: number
          circular_id?: string | null
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "circular_acknowledgments_circular_fk"
            columns: ["circular_id"]
            isOneToOne: false
            referencedRelation: "circulars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circular_acknowledgments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circular_acknowledgments_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      circulars: {
        Row: {
          ack_required: boolean | null
          amount: number
          body: string | null
          category: string | null
          created_at: string
          data: Json
          date: string | null
          department_id: string | null
          id: string
          label: string | null
          name: string | null
          published_at: string | null
          published_by: string | null
          status: string | null
          target_audience: string | null
          tenant_id: string
          title: string | null
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          ack_required?: boolean | null
          amount?: number
          body?: string | null
          category?: string | null
          created_at?: string
          data?: Json
          date?: string | null
          department_id?: string | null
          id?: string
          label?: string | null
          name?: string | null
          published_at?: string | null
          published_by?: string | null
          status?: string | null
          target_audience?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          ack_required?: boolean | null
          amount?: number
          body?: string | null
          category?: string | null
          created_at?: string
          data?: Json
          date?: string | null
          department_id?: string | null
          id?: string
          label?: string | null
          name?: string | null
          published_at?: string | null
          published_by?: string | null
          status?: string | null
          target_audience?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "circulars_department_fk"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circulars_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circulars_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      cloud_documents: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cloud_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cloud_documents_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      correction_requests: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "correction_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correction_requests_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      cphs_meetings: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cphs_meetings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cphs_meetings_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      customers: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      daily_shifts: {
        Row: {
          ast_signed: boolean
          attendance_status: string
          calculated_hht: number
          created_at: string
          date: string
          epp_inicio: Json
          epp_termino: Json
          id: string
          notes: string | null
          shift_name: string
          tenant_id: string
          worker_rut: string
        }
        Insert: {
          ast_signed?: boolean
          attendance_status?: string
          calculated_hht?: number
          created_at?: string
          date?: string
          epp_inicio?: Json
          epp_termino?: Json
          id?: string
          notes?: string | null
          shift_name?: string
          tenant_id: string
          worker_rut: string
        }
        Update: {
          ast_signed?: boolean
          attendance_status?: string
          calculated_hht?: number
          created_at?: string
          date?: string
          epp_inicio?: Json
          epp_termino?: Json
          id?: string
          notes?: string | null
          shift_name?: string
          tenant_id?: string
          worker_rut?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_shifts_tenant_id_worker_rut_fkey"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
          {
            foreignKeyName: "daily_shifts_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      data_consent: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_consent_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_consent_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      data_rights_requests: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_rights_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_rights_requests_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_department_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_department_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_department_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_parent_same_tenant_fk"
            columns: ["tenant_id", "parent_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      epp_deliveries: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          delivery_date: string | null
          id: string
          item_id: string | null
          label: string | null
          name: string | null
          quantity: number | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          delivery_date?: string | null
          id?: string
          item_id?: string | null
          label?: string | null
          name?: string | null
          quantity?: number | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          delivery_date?: string | null
          id?: string
          item_id?: string | null
          label?: string | null
          name?: string | null
          quantity?: number | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epp_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epp_deliveries_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      epp_items: {
        Row: {
          created_at: string
          data: Json
          id: string
          label: string | null
          name: string
          status: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          label?: string | null
          name?: string
          status?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          label?: string | null
          name?: string
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "epp_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      epp_logs: {
        Row: {
          amount: number
          condition: string | null
          created_at: string
          data: Json
          date: string | null
          delivery_date: string | null
          digital_signature: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          condition?: string | null
          created_at?: string
          data?: Json
          date?: string | null
          delivery_date?: string | null
          digital_signature?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          condition?: string | null
          created_at?: string
          data?: Json
          date?: string | null
          delivery_date?: string | null
          digital_signature?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epp_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epp_logs_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      epp_returns: {
        Row: {
          condition: string | null
          created_at: string
          delivery_id: string | null
          id: string
          item_id: string | null
          notes: string | null
          quantity: number
          return_date: string
          tenant_id: string
          worker_rut: string | null
        }
        Insert: {
          condition?: string | null
          created_at?: string
          delivery_id?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          quantity?: number
          return_date?: string
          tenant_id: string
          worker_rut?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string
          delivery_id?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          quantity?: number
          return_date?: string
          tenant_id?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epp_returns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epp_returns_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      epp_stock: {
        Row: {
          created_at: string
          data: Json
          id: string
          item_id: string | null
          min_quantity: number | null
          quantity: number
          size_label: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          item_id?: string | null
          min_quantity?: number | null
          quantity?: number
          size_label?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          item_id?: string | null
          min_quantity?: number | null
          quantity?: number
          size_label?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "epp_stock_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      external_services: {
        Row: {
          created_at: string
          data: Json
          id: string
          monthly_cost: number
          provider: string | null
          service_name: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          monthly_cost?: number
          provider?: string | null
          service_name: string
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          monthly_cost?: number
          provider?: string | null
          service_name?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      finiquito_records: {
        Row: {
          amount: number
          base_salary: number | null
          created_at: string
          created_by_email: string | null
          data: Json
          date: string | null
          end_date: string | null
          gratificacion: number | null
          hire_date: string | null
          id: string
          indemnizacion_anios_servicio: number | null
          indemnizacion_sustitutiva: number | null
          label: string | null
          months_of_service: number | null
          name: string | null
          notes: string | null
          reason: string | null
          status: string | null
          tenant_id: string
          termination_date: string | null
          termination_reason: string | null
          total_finiquito: number | null
          updated_at: string
          vacaciones_no_gozadas: number | null
          vacation_days_pending: number | null
          worker_name: string | null
          worker_rut: string | null
          years_of_service: number | null
        }
        Insert: {
          amount?: number
          base_salary?: number | null
          created_at?: string
          created_by_email?: string | null
          data?: Json
          date?: string | null
          end_date?: string | null
          gratificacion?: number | null
          hire_date?: string | null
          id?: string
          indemnizacion_anios_servicio?: number | null
          indemnizacion_sustitutiva?: number | null
          label?: string | null
          months_of_service?: number | null
          name?: string | null
          notes?: string | null
          reason?: string | null
          status?: string | null
          tenant_id: string
          termination_date?: string | null
          termination_reason?: string | null
          total_finiquito?: number | null
          updated_at?: string
          vacaciones_no_gozadas?: number | null
          vacation_days_pending?: number | null
          worker_name?: string | null
          worker_rut?: string | null
          years_of_service?: number | null
        }
        Update: {
          amount?: number
          base_salary?: number | null
          created_at?: string
          created_by_email?: string | null
          data?: Json
          date?: string | null
          end_date?: string | null
          gratificacion?: number | null
          hire_date?: string | null
          id?: string
          indemnizacion_anios_servicio?: number | null
          indemnizacion_sustitutiva?: number | null
          label?: string | null
          months_of_service?: number | null
          name?: string | null
          notes?: string | null
          reason?: string | null
          status?: string | null
          tenant_id?: string
          termination_date?: string | null
          termination_reason?: string | null
          total_finiquito?: number | null
          updated_at?: string
          vacaciones_no_gozadas?: number | null
          vacation_days_pending?: number | null
          worker_name?: string | null
          worker_rut?: string | null
          years_of_service?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finiquito_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finiquito_records_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      harassment_reports: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "harassment_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harassment_reports_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      hhc_plan: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          executed_hours: number
          id: string
          label: string | null
          name: string | null
          planned_hours: number
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          executed_hours?: number
          id?: string
          label?: string | null
          name?: string | null
          planned_hours?: number
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          executed_hours?: number
          id?: string
          label?: string | null
          name?: string | null
          planned_hours?: number
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hhc_plan_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hhc_plan_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      honeytokens: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "honeytokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "honeytokens_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      incidents_ds44: {
        Row: {
          category: string | null
          created_at: string
          days_charge: number
          days_lost: number
          description: string
          event_date: string
          id: string
          severity: string
          tenant_id: string
          type: string
          worker_rut: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          days_charge?: number
          days_lost?: number
          description: string
          event_date?: string
          id?: string
          severity?: string
          tenant_id: string
          type?: string
          worker_rut?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          days_charge?: number
          days_lost?: number
          description?: string
          event_date?: string
          id?: string
          severity?: string
          tenant_id?: string
          type?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_ds44_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_ds44_tenant_id_worker_rut_fkey"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
          {
            foreignKeyName: "incidents_ds44_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      internal_loans: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_loans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_loans_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          description: string | null
          exemption_flag: boolean | null
          id: string
          invoice_id: string | null
          label: string | null
          line_number: number | null
          line_subtotal: number | null
          line_total: number | null
          name: string | null
          quantity: number | null
          status: string | null
          tenant_id: string
          unit_price: number | null
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          description?: string | null
          exemption_flag?: boolean | null
          id?: string
          invoice_id?: string | null
          label?: string | null
          line_number?: number | null
          line_subtotal?: number | null
          line_total?: number | null
          name?: string | null
          quantity?: number | null
          status?: string | null
          tenant_id: string
          unit_price?: number | null
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          description?: string | null
          exemption_flag?: boolean | null
          id?: string
          invoice_id?: string | null
          label?: string | null
          line_number?: number | null
          line_subtotal?: number | null
          line_total?: number | null
          name?: string | null
          quantity?: number | null
          status?: string | null
          tenant_id?: string
          unit_price?: number | null
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_fk"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          data: Json
          date: string | null
          document_type: string | null
          due_date: string | null
          exempt_amount: number | null
          folio: number | null
          id: string
          issue_date: string | null
          label: string | null
          name: string | null
          notes: string | null
          payment_method: string | null
          quote_id: string | null
          sii_status: string | null
          sii_track_code: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number | null
          tenant_id: string
          total: number | null
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          data?: Json
          date?: string | null
          document_type?: string | null
          due_date?: string | null
          exempt_amount?: number | null
          folio?: number | null
          id?: string
          issue_date?: string | null
          label?: string | null
          name?: string | null
          notes?: string | null
          payment_method?: string | null
          quote_id?: string | null
          sii_status?: string | null
          sii_track_code?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_id: string
          total?: number | null
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          data?: Json
          date?: string | null
          document_type?: string | null
          due_date?: string | null
          exempt_amount?: number | null
          folio?: number | null
          id?: string
          issue_date?: string | null
          label?: string | null
          name?: string | null
          notes?: string | null
          payment_method?: string | null
          quote_id?: string | null
          sii_status?: string | null
          sii_track_code?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_id?: string
          total?: number | null
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_fk"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_fk"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      iper_entries: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "iper_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iper_entries_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      iso_audits: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "iso_audits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iso_audits_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          id: string
          identifier: string
          ip_hint: string | null
          success: boolean
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          identifier: string
          ip_hint?: string | null
          success?: boolean
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
          ip_hint?: string | null
          success?: boolean
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "login_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_licenses: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_licenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_licenses_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      payroll_items: {
        Row: {
          afp_deduction: number | null
          amount: number
          base_salary_amount: number | null
          bonus_amount: number | null
          bonuses_detail: Json | null
          created_at: string
          data: Json
          date: string | null
          days_absent: number | null
          days_license: number | null
          days_permission: number | null
          days_present: number | null
          deductions_detail: Json | null
          generated_at: string | null
          gross_income: number | null
          health_deduction: number | null
          id: string
          label: string | null
          meal_allowance_amount: number | null
          mobility_allowance_amount: number | null
          name: string | null
          net_pay: number | null
          other_deductions: number | null
          overtime_hours: number | null
          period_id: string | null
          regular_hours: number | null
          status: string | null
          tax_deduction: number | null
          taxable_income: number | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          afp_deduction?: number | null
          amount?: number
          base_salary_amount?: number | null
          bonus_amount?: number | null
          bonuses_detail?: Json | null
          created_at?: string
          data?: Json
          date?: string | null
          days_absent?: number | null
          days_license?: number | null
          days_permission?: number | null
          days_present?: number | null
          deductions_detail?: Json | null
          generated_at?: string | null
          gross_income?: number | null
          health_deduction?: number | null
          id?: string
          label?: string | null
          meal_allowance_amount?: number | null
          mobility_allowance_amount?: number | null
          name?: string | null
          net_pay?: number | null
          other_deductions?: number | null
          overtime_hours?: number | null
          period_id?: string | null
          regular_hours?: number | null
          status?: string | null
          tax_deduction?: number | null
          taxable_income?: number | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          afp_deduction?: number | null
          amount?: number
          base_salary_amount?: number | null
          bonus_amount?: number | null
          bonuses_detail?: Json | null
          created_at?: string
          data?: Json
          date?: string | null
          days_absent?: number | null
          days_license?: number | null
          days_permission?: number | null
          days_present?: number | null
          deductions_detail?: Json | null
          generated_at?: string | null
          gross_income?: number | null
          health_deduction?: number | null
          id?: string
          label?: string | null
          meal_allowance_amount?: number | null
          mobility_allowance_amount?: number | null
          name?: string | null
          net_pay?: number | null
          other_deductions?: number | null
          overtime_hours?: number | null
          period_id?: string | null
          regular_hours?: number | null
          status?: string | null
          tax_deduction?: number | null
          taxable_income?: number | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_period_same_tenant_fk"
            columns: ["tenant_id", "period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "payroll_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          end_date: string | null
          id: string
          label: string | null
          name: string | null
          notes: string | null
          period_label: string | null
          period_month: number | null
          period_year: number | null
          start_date: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          end_date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          notes?: string | null
          period_label?: string | null
          period_month?: number | null
          period_year?: number | null
          start_date?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          end_date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          notes?: string | null
          period_label?: string | null
          period_month?: number | null
          period_year?: number | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_periods_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      performance_evaluations: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_evaluations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_evaluations_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      performance_feedback: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_feedback_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_feedback_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      performance_objectives: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_objectives_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_objectives_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      public_landing_settings: {
        Row: {
          id: number
          updated_at: string
          visual_assets: Json
        }
        Insert: {
          id?: number
          updated_at?: string
          visual_assets?: Json
        }
        Update: {
          id?: number
          updated_at?: string
          visual_assets?: Json
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          description: string | null
          id: string
          label: string | null
          line_number: number | null
          line_total: number | null
          name: string | null
          purchase_order_id: string | null
          quantity: number | null
          received_qty: number | null
          status: string | null
          tenant_id: string
          unit_price: number | null
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          description?: string | null
          id?: string
          label?: string | null
          line_number?: number | null
          line_total?: number | null
          name?: string | null
          purchase_order_id?: string | null
          quantity?: number | null
          received_qty?: number | null
          status?: string | null
          tenant_id: string
          unit_price?: number | null
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          description?: string | null
          id?: string
          label?: string | null
          line_number?: number | null
          line_total?: number | null
          name?: string | null
          purchase_order_id?: string | null
          quantity?: number | null
          received_qty?: number | null
          status?: string | null
          tenant_id?: string
          unit_price?: number | null
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_order_fk"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          data: Json
          date: string | null
          expected_date: string | null
          id: string
          issue_date: string | null
          label: string | null
          name: string | null
          notes: string | null
          po_number: string | null
          received_amount: number | null
          status: string | null
          subtotal: number | null
          supplier_id: string | null
          tax_amount: number | null
          tax_rate: number | null
          tenant_id: string
          total: number | null
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          data?: Json
          date?: string | null
          expected_date?: string | null
          id?: string
          issue_date?: string | null
          label?: string | null
          name?: string | null
          notes?: string | null
          po_number?: string | null
          received_amount?: number | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_id: string
          total?: number | null
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          data?: Json
          date?: string | null
          expected_date?: string | null
          id?: string
          issue_date?: string | null
          label?: string | null
          name?: string | null
          notes?: string | null
          po_number?: string | null
          received_amount?: number | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_id?: string
          total?: number | null
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_fk"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      qr_scan_events: {
        Row: {
          amount: number
          created_at: string
          chain_sequence: number | null
          captured_scan_date: string | null
          captured_scan_time: string | null
          data: Json
          date: string | null
          device_id: string | null
          gps_accuracy: number | null
          gps_missing: boolean
          id: string
          idempotency_key: string | null
          label: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          notes: string | null
          official_offset_ms: number | null
          prev_hash: string | null
          receipt_code: string | null
          row_hash: string | null
          scan_date: string | null
          scan_time: string | null
          scan_type: string | null
          server_received_at: string | null
          status: string | null
          tenant_id: string
          time_source: string | null
          time_within_tolerance: boolean | null
          updated_at: string
          validated: boolean
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          chain_sequence?: number | null
          captured_scan_date?: string | null
          captured_scan_time?: string | null
          data?: Json
          date?: string | null
          device_id?: string | null
          gps_accuracy?: number | null
          gps_missing?: boolean
          id?: string
          idempotency_key?: string | null
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          notes?: string | null
          official_offset_ms?: number | null
          prev_hash?: string | null
          receipt_code?: string | null
          row_hash?: string | null
          scan_date?: string | null
          scan_time?: string | null
          scan_type?: string | null
          server_received_at?: string | null
          status?: string | null
          tenant_id: string
          time_source?: string | null
          time_within_tolerance?: boolean | null
          updated_at?: string
          validated?: boolean
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          chain_sequence?: number | null
          captured_scan_date?: string | null
          captured_scan_time?: string | null
          data?: Json
          date?: string | null
          device_id?: string | null
          gps_accuracy?: number | null
          gps_missing?: boolean
          id?: string
          idempotency_key?: string | null
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          notes?: string | null
          official_offset_ms?: number | null
          prev_hash?: string | null
          receipt_code?: string | null
          row_hash?: string | null
          scan_date?: string | null
          scan_time?: string | null
          scan_type?: string | null
          server_received_at?: string | null
          status?: string | null
          tenant_id?: string
          time_source?: string | null
          time_within_tolerance?: boolean | null
          updated_at?: string
          validated?: boolean
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_scan_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_scan_events_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      quote_items: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          description: string | null
          id: string
          label: string | null
          line_number: number | null
          line_total: number | null
          name: string | null
          quantity: number | null
          quote_id: string | null
          status: string | null
          tenant_id: string
          unit_price: number | null
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          description?: string | null
          id?: string
          label?: string | null
          line_number?: number | null
          line_total?: number | null
          name?: string | null
          quantity?: number | null
          quote_id?: string | null
          status?: string | null
          tenant_id: string
          unit_price?: number | null
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          description?: string | null
          id?: string
          label?: string | null
          line_number?: number | null
          line_total?: number | null
          name?: string | null
          quantity?: number | null
          quote_id?: string | null
          status?: string | null
          tenant_id?: string
          unit_price?: number | null
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_fk"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      quotes: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          data: Json
          date: string | null
          id: string
          issue_date: string | null
          label: string | null
          name: string | null
          notes: string | null
          quote_number: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number | null
          tenant_id: string
          total: number | null
          updated_at: string
          valid_until: string | null
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          data?: Json
          date?: string | null
          id?: string
          issue_date?: string | null
          label?: string | null
          name?: string | null
          notes?: string | null
          quote_number?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_id: string
          total?: number | null
          updated_at?: string
          valid_until?: string | null
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          data?: Json
          date?: string | null
          id?: string
          issue_date?: string | null
          label?: string | null
          name?: string | null
          notes?: string | null
          quote_number?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_id?: string
          total?: number | null
          updated_at?: string
          valid_until?: string | null
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      saas_billing_notices: {
        Row: {
          account_id: string | null
          created_at: string
          created_by_email: string | null
          description: string
          due_date: string
          folio: string
          id: string
          issue_date: string
          metadata: Json
          net_amount: number
          notes: string | null
          pdf_generated_at: string | null
          period_end: string
          period_start: string
          recipient_email: string | null
          recipient_name: string | null
          recipient_rut: string | null
          status: string
          tax_amount: number
          tax_rate: number
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          created_by_email?: string | null
          description?: string
          due_date: string
          folio: string
          id?: string
          issue_date?: string
          metadata?: Json
          net_amount?: number
          notes?: string | null
          pdf_generated_at?: string | null
          period_end: string
          period_start: string
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_rut?: string | null
          status?: string
          tax_amount?: number
          tax_rate?: number
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          created_by_email?: string | null
          description?: string
          due_date?: string
          folio?: string
          id?: string
          issue_date?: string
          metadata?: Json
          net_amount?: number
          notes?: string | null
          pdf_generated_at?: string | null
          period_end?: string
          period_start?: string
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_rut?: string | null
          status?: string
          tax_amount?: number
          tax_rate?: number
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_billing_notices_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "saas_customer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_billing_notices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_customer_accounts: {
        Row: {
          billing_address: string | null
          billing_email: string | null
          billing_phone: string | null
          company_rut: string | null
          created_at: string
          id: string
          iva_amount: number
          legal_representative_name: string | null
          legal_representative_rut: string | null
          monthly_amount: number
          next_payment_date: string | null
          notes: string | null
          payment_day: number | null
          payment_status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          billing_address?: string | null
          billing_email?: string | null
          billing_phone?: string | null
          company_rut?: string | null
          created_at?: string
          id?: string
          iva_amount?: number
          legal_representative_name?: string | null
          legal_representative_rut?: string | null
          monthly_amount?: number
          next_payment_date?: string | null
          notes?: string | null
          payment_day?: number | null
          payment_status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          billing_address?: string | null
          billing_email?: string | null
          billing_phone?: string | null
          company_rut?: string | null
          created_at?: string
          id?: string
          iva_amount?: number
          legal_representative_name?: string | null
          legal_representative_rut?: string | null
          monthly_amount?: number
          next_payment_date?: string | null
          notes?: string | null
          payment_day?: number | null
          payment_status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_customer_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_customer_notifications: {
        Row: {
          channel: string
          created_at: string
          created_by_email: string | null
          id: string
          message: string
          metadata: Json
          priority: string
          read_at: string | null
          read_by: string | null
          template_key: string
          tenant_id: string
          title: string
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by_email?: string | null
          id?: string
          message: string
          metadata?: Json
          priority?: string
          read_at?: string | null
          read_by?: string | null
          template_key: string
          tenant_id: string
          title?: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by_email?: string | null
          id?: string
          message?: string
          metadata?: Json
          priority?: string
          read_at?: string | null
          read_by?: string | null
          template_key?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_customer_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_data_assets: {
        Row: {
          contains_personal_data: boolean
          contains_sensitive_data: boolean
          created_at: string
          created_by: string | null
          data_category: string
          description: string | null
          has_backup: boolean
          id: string
          last_backup_at: string | null
          last_synced_at: string | null
          legal_hold: boolean
          location: string | null
          name: string
          owner_name: string | null
          record_count: number
          retention_days: number | null
          sensitivity_level: string
          source_system: string | null
          status: string
          storage_bytes: number
          sync_frequency: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contains_personal_data?: boolean
          contains_sensitive_data?: boolean
          created_at?: string
          created_by?: string | null
          data_category?: string
          description?: string | null
          has_backup?: boolean
          id?: string
          last_backup_at?: string | null
          last_synced_at?: string | null
          legal_hold?: boolean
          location?: string | null
          name: string
          owner_name?: string | null
          record_count?: number
          retention_days?: number | null
          sensitivity_level?: string
          source_system?: string | null
          status?: string
          storage_bytes?: number
          sync_frequency?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contains_personal_data?: boolean
          contains_sensitive_data?: boolean
          created_at?: string
          created_by?: string | null
          data_category?: string
          description?: string | null
          has_backup?: boolean
          id?: string
          last_backup_at?: string | null
          last_synced_at?: string | null
          legal_hold?: boolean
          location?: string | null
          name?: string
          owner_name?: string | null
          record_count?: number
          retention_days?: number | null
          sensitivity_level?: string
          source_system?: string | null
          status?: string
          storage_bytes?: number
          sync_frequency?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_data_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_data_audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          classification: string | null
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json
          outcome: string
          resource_id: string | null
          resource_type: string
          tenant_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          classification?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          outcome?: string
          resource_id?: string | null
          resource_type: string
          tenant_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          classification?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          outcome?: string
          resource_id?: string | null
          resource_type?: string
          tenant_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_data_audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_data_governance_profiles: {
        Row: {
          created_at: string
          created_by: string | null
          default_retention_days: number | null
          document_review_status: string
          emergency_contact: string | null
          has_personal_data: boolean
          has_sensitive_data: boolean
          id: string
          last_reviewed_at: string | null
          maturity_level: string
          notes: string | null
          security_contact: string | null
          storage_region: string | null
          tenant_id: string
          treatment_owner: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_retention_days?: number | null
          document_review_status?: string
          emergency_contact?: string | null
          has_personal_data?: boolean
          has_sensitive_data?: boolean
          id?: string
          last_reviewed_at?: string | null
          maturity_level?: string
          notes?: string | null
          security_contact?: string | null
          storage_region?: string | null
          tenant_id: string
          treatment_owner?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_retention_days?: number | null
          document_review_status?: string
          emergency_contact?: string | null
          has_personal_data?: boolean
          has_sensitive_data?: boolean
          id?: string
          last_reviewed_at?: string | null
          maturity_level?: string
          notes?: string | null
          security_contact?: string | null
          storage_region?: string | null
          tenant_id?: string
          treatment_owner?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_data_governance_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_data_incidents: {
        Row: {
          actions_taken: string | null
          asset_id: string | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string
          detected_at: string
          evidence_storage_path: string | null
          id: string
          resolved_at: string | null
          severity: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actions_taken?: string | null
          asset_id?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          detected_at?: string
          evidence_storage_path?: string | null
          id?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actions_taken?: string | null
          asset_id?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          detected_at?: string
          evidence_storage_path?: string | null
          id?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_data_incidents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "saas_data_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_data_incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_data_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          asset_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          evidence_storage_path: string | null
          id: string
          reason: string
          request_type: string
          requested_by: string | null
          result_summary: string | null
          scheduled_for: string | null
          scope_description: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          asset_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          evidence_storage_path?: string | null
          id?: string
          reason: string
          request_type: string
          requested_by?: string | null
          result_summary?: string | null
          scheduled_for?: string | null
          scope_description?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          asset_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          evidence_storage_path?: string | null
          id?: string
          reason?: string
          request_type?: string
          requested_by?: string | null
          result_summary?: string | null
          scheduled_for?: string | null
          scope_description?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_data_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "saas_data_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_data_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_demo_operators: {
        Row: {
          access_mode: string
          active: boolean
          created_at: string
          demo_tenant_id: string | null
          email: string
          full_name: string
          id: string
        }
        Insert: {
          access_mode?: string
          active?: boolean
          created_at?: string
          demo_tenant_id?: string | null
          email: string
          full_name: string
          id?: string
        }
        Update: {
          access_mode?: string
          active?: boolean
          created_at?: string
          demo_tenant_id?: string | null
          email?: string
          full_name?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_demo_operators_demo_tenant_id_fkey"
            columns: ["demo_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_ip_access_rules: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          label: string
          mode: string
          network: unknown
          notes: string | null
          priority: number
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          label: string
          mode: string
          network: unknown
          notes?: string | null
          priority?: number
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          label?: string
          mode?: string
          network?: unknown
          notes?: string | null
          priority?: number
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_ip_access_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_onboarding_deliveries: {
        Row: {
          created_at: string
          created_by_email: string | null
          error_message: string | null
          id: string
          provider: string | null
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          status: string
          subject: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by_email?: string | null
          error_message?: string | null
          id?: string
          provider?: string | null
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by_email?: string | null
          error_message?: string | null
          id?: string
          provider?: string | null
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_onboarding_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_onboarding_profiles: {
        Row: {
          access_path: string | null
          account_holder: string | null
          account_holder_rut: string | null
          account_number: string | null
          account_type: string | null
          alternate_email: string | null
          bank_name: string | null
          billing_email: string | null
          billing_legal_notice: string | null
          contact_name: string | null
          created_at: string
          help_path: string | null
          id: string
          manual_url: string | null
          primary_email: string | null
          provider_legal_name: string | null
          provider_rut: string | null
          support_email: string | null
          support_hours: string | null
          support_phone: string | null
          support_url: string | null
          support_whatsapp: string | null
          tenant_id: string
          updated_at: string
          updated_by_email: string | null
        }
        Insert: {
          access_path?: string | null
          account_holder?: string | null
          account_holder_rut?: string | null
          account_number?: string | null
          account_type?: string | null
          alternate_email?: string | null
          bank_name?: string | null
          billing_email?: string | null
          billing_legal_notice?: string | null
          contact_name?: string | null
          created_at?: string
          help_path?: string | null
          id?: string
          manual_url?: string | null
          primary_email?: string | null
          provider_legal_name?: string | null
          provider_rut?: string | null
          support_email?: string | null
          support_hours?: string | null
          support_phone?: string | null
          support_url?: string | null
          support_whatsapp?: string | null
          tenant_id: string
          updated_at?: string
          updated_by_email?: string | null
        }
        Update: {
          access_path?: string | null
          account_holder?: string | null
          account_holder_rut?: string | null
          account_number?: string | null
          account_type?: string | null
          alternate_email?: string | null
          bank_name?: string | null
          billing_email?: string | null
          billing_legal_notice?: string | null
          contact_name?: string | null
          created_at?: string
          help_path?: string | null
          id?: string
          manual_url?: string | null
          primary_email?: string | null
          provider_legal_name?: string | null
          provider_rut?: string | null
          support_email?: string | null
          support_hours?: string | null
          support_phone?: string | null
          support_url?: string | null
          support_whatsapp?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_onboarding_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_plans: {
        Row: {
          active: boolean
          code: string
          created_at: string
          default_view: string
          description: string | null
          feature_keys: Json
          id: string
          max_users: number | null
          name: string
          sort_order: number
          storage_limit_bytes: number | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          default_view?: string
          description?: string | null
          feature_keys?: Json
          id?: string
          max_users?: number | null
          name: string
          sort_order?: number
          storage_limit_bytes?: number | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          default_view?: string
          description?: string | null
          feature_keys?: Json
          id?: string
          max_users?: number | null
          name?: string
          sort_order?: number
          storage_limit_bytes?: number | null
        }
        Relationships: []
      }
      saas_public_landing_settings: {
        Row: {
          enabled: boolean
          hero_description: string
          hero_title: string
          primary_cta_label: string
          singleton: boolean
          updated_at: string
          updated_by: string | null
          whatsapp_phone: string
        }
        Insert: {
          enabled?: boolean
          hero_description?: string
          hero_title?: string
          primary_cta_label?: string
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
          whatsapp_phone?: string
        }
        Update: {
          enabled?: boolean
          hero_description?: string
          hero_title?: string
          primary_cta_label?: string
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
          whatsapp_phone?: string
        }
        Relationships: []
      }
      saas_tenant_contacts: {
        Row: {
          can_authorize_changes: boolean
          can_view_data: boolean
          contact_type: string
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_primary: boolean
          job_title: string | null
          phone: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          whatsapp: string | null
        }
        Insert: {
          can_authorize_changes?: boolean
          can_view_data?: boolean
          contact_type?: string
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          id?: string
          is_primary?: boolean
          job_title?: string | null
          phone?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          can_authorize_changes?: boolean
          can_view_data?: boolean
          contact_type?: string
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          is_primary?: boolean
          job_title?: string | null
          phone?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_tenant_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_tenant_contracts: {
        Row: {
          contract_url: string
          counterparty_name: string | null
          counterparty_rut: string | null
          created_at: string
          created_by_email: string | null
          expires_at: string | null
          id: string
          metadata: Json
          notes: string | null
          signed_at: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          contract_url: string
          counterparty_name?: string | null
          counterparty_rut?: string | null
          created_at?: string
          created_by_email?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          signed_at?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          contract_url?: string
          counterparty_name?: string | null
          counterparty_rut?: string | null
          created_at?: string
          created_by_email?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          signed_at?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_tenant_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_tenant_deployments: {
        Row: {
          reason: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          reason?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          reason?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_tenant_deployments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_tenant_feature_overrides: {
        Row: {
          enabled: boolean
          feature_key: string
          reason: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          enabled: boolean
          feature_key: string
          reason?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          feature_key?: string
          reason?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_tenant_feature_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_tenant_subscriptions: {
        Row: {
          created_at: string
          due_date: string | null
          plan: string
          plan_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          plan?: string
          plan_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          plan?: string
          plan_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_tenant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_tenant_usage_daily: {
        Row: {
          active_users: number
          api_calls: number
          calculated_at: string
          exports_count: number
          files_count: number
          id: string
          imports_count: number
          plan_storage_limit_bytes: number | null
          processing_errors: number
          processing_jobs: number
          records_count: number
          storage_bytes: number
          tenant_id: string
          usage_breakdown: Json
          usage_date: string
          webhook_calls: number
        }
        Insert: {
          active_users?: number
          api_calls?: number
          calculated_at?: string
          exports_count?: number
          files_count?: number
          id?: string
          imports_count?: number
          plan_storage_limit_bytes?: number | null
          processing_errors?: number
          processing_jobs?: number
          records_count?: number
          storage_bytes?: number
          tenant_id: string
          usage_breakdown?: Json
          usage_date: string
          webhook_calls?: number
        }
        Update: {
          active_users?: number
          api_calls?: number
          calculated_at?: string
          exports_count?: number
          files_count?: number
          id?: string
          imports_count?: number
          plan_storage_limit_bytes?: number | null
          processing_errors?: number
          processing_jobs?: number
          records_count?: number
          storage_bytes?: number
          tenant_id?: string
          usage_breakdown?: Json
          usage_date?: string
          webhook_calls?: number
        }
        Relationships: [
          {
            foreignKeyName: "saas_tenant_usage_daily_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_advances: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_advances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_advances_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      security_alerts: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_alerts_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      security_breach_reports: {
        Row: {
          affected_data_types: string[] | null
          affected_subjects_count: number | null
          amount: number
          breach_detected_at: string | null
          breach_occurred_at: string | null
          containment_measures: string | null
          created_at: string
          created_by_email: string | null
          csirt_deadline: string | null
          csirt_notified_at: string | null
          data: Json
          date: string | null
          description: string | null
          id: string
          investigation_notes: string | null
          label: string | null
          name: string | null
          resolution_notes: string | null
          severity: string | null
          status: string | null
          subjects_deadline: string | null
          subjects_notified_at: string | null
          tenant_id: string
          title: string | null
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          affected_data_types?: string[] | null
          affected_subjects_count?: number | null
          amount?: number
          breach_detected_at?: string | null
          breach_occurred_at?: string | null
          containment_measures?: string | null
          created_at?: string
          created_by_email?: string | null
          csirt_deadline?: string | null
          csirt_notified_at?: string | null
          data?: Json
          date?: string | null
          description?: string | null
          id?: string
          investigation_notes?: string | null
          label?: string | null
          name?: string | null
          resolution_notes?: string | null
          severity?: string | null
          status?: string | null
          subjects_deadline?: string | null
          subjects_notified_at?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          affected_data_types?: string[] | null
          affected_subjects_count?: number | null
          amount?: number
          breach_detected_at?: string | null
          breach_occurred_at?: string | null
          containment_measures?: string | null
          created_at?: string
          created_by_email?: string | null
          csirt_deadline?: string | null
          csirt_notified_at?: string | null
          data?: Json
          date?: string | null
          description?: string | null
          id?: string
          investigation_notes?: string | null
          label?: string | null
          name?: string | null
          resolution_notes?: string | null
          severity?: string | null
          status?: string | null
          subjects_deadline?: string | null
          subjects_notified_at?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_breach_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_breach_reports_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      security_talks: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_talks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_talks_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      shift_assignments: {
        Row: {
          active: boolean
          amount: number
          assigned_by_email: string
          change_reason: string | null
          created_at: string
          data: Json
          date: string | null
          days_of_week: number[] | null
          duration_type: string
          end_date: string | null
          id: string
          label: string | null
          name: string | null
          shift_definition_id: string | null
          shift_name: string
          start_date: string
          status: string | null
          swap_with_rut: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          active?: boolean
          amount?: number
          assigned_by_email?: string
          change_reason?: string | null
          created_at?: string
          data?: Json
          date?: string | null
          days_of_week?: number[] | null
          duration_type?: string
          end_date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          shift_definition_id?: string | null
          shift_name?: string
          start_date?: string
          status?: string | null
          swap_with_rut?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          active?: boolean
          amount?: number
          assigned_by_email?: string
          change_reason?: string | null
          created_at?: string
          data?: Json
          date?: string | null
          days_of_week?: number[] | null
          duration_type?: string
          end_date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          shift_definition_id?: string | null
          shift_name?: string
          start_date?: string
          status?: string | null
          swap_with_rut?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_definition_same_tenant_fk"
            columns: ["tenant_id", "shift_definition_id"]
            isOneToOne: false
            referencedRelation: "shift_definitions"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "shift_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      shift_change_logs: {
        Row: {
          amount: number
          change_type: string
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          new_duration_type: string | null
          new_end_date: string | null
          new_shift_name: string | null
          old_duration_type: string | null
          old_end_date: string | null
          old_shift_name: string | null
          status: string | null
          swap_with_rut: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          change_type?: string
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          new_duration_type?: string | null
          new_end_date?: string | null
          new_shift_name?: string | null
          old_duration_type?: string | null
          old_end_date?: string | null
          old_shift_name?: string | null
          status?: string | null
          swap_with_rut?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          change_type?: string
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          new_duration_type?: string | null
          new_end_date?: string | null
          new_shift_name?: string | null
          old_duration_type?: string | null
          old_end_date?: string | null
          old_shift_name?: string | null
          status?: string | null
          swap_with_rut?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_change_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_change_logs_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      shift_definitions: {
        Row: {
          active: boolean
          amount: number
          color: string | null
          created_at: string
          cycle: string
          data: Json
          date: string | null
          end_time: string | null
          id: string
          label: string | null
          name: string | null
          start_time: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          active?: boolean
          amount?: number
          color?: string | null
          created_at?: string
          cycle?: string
          data?: Json
          date?: string | null
          end_time?: string | null
          id?: string
          label?: string | null
          name?: string | null
          start_time?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          active?: boolean
          amount?: number
          color?: string | null
          created_at?: string
          cycle?: string
          data?: Json
          date?: string | null
          end_time?: string | null
          id?: string
          label?: string | null
          name?: string | null
          start_time?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_definitions_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      suppliers: {
        Row: {
          amount: number
          category: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          data: Json
          date: string | null
          id: string
          is_active: boolean | null
          label: string | null
          name: string | null
          notes: string | null
          payment_terms: string | null
          rut: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          category?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          name?: string | null
          notes?: string | null
          payment_terms?: string | null
          rut?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          name?: string | null
          notes?: string | null
          payment_terms?: string | null
          rut?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      system_config: {
        Row: {
          description: string | null
          key: string
          tenant_id: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          tenant_id: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          tenant_id?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_branding: {
        Row: {
          color_theme: string
          company_name: string
          glass_opacity: string
          landing_cta_label: string
          landing_enabled: boolean
          logo_url: string
          tenant_id: string
          updated_at: string
          visual_assets: Json
        }
        Insert: {
          color_theme?: string
          company_name?: string
          glass_opacity?: string
          landing_cta_label?: string
          landing_enabled?: boolean
          logo_url?: string
          tenant_id: string
          updated_at?: string
          visual_assets?: Json
        }
        Update: {
          color_theme?: string
          company_name?: string
          glass_opacity?: string
          landing_cta_label?: string
          landing_enabled?: boolean
          logo_url?: string
          tenant_id?: string
          updated_at?: string
          visual_assets?: Json
        }
        Relationships: [
          {
            foreignKeyName: "tenant_branding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_memberships: {
        Row: {
          active: boolean
          created_at: string
          permissions: Json
          role: string
          tenant_id: string
          user_email: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          permissions?: Json
          role?: string
          tenant_id: string
          user_email: string
        }
        Update: {
          active?: boolean
          created_at?: string
          permissions?: Json
          role?: string
          tenant_id?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_role_permission_templates: {
        Row: {
          created_at: string
          permissions: Json
          role: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          permissions?: Json
          role: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          permissions?: Json
          role?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_role_permission_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          created_at: string
          default_view: string
          max_users: number | null
          modules: Json
          plan: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_view?: string
          max_users?: number | null
          modules?: Json
          plan?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_view?: string
          max_users?: number | null
          modules?: Json
          plan?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          slug: string
          status: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: string
        }
        Relationships: []
      }
      training_attendance: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_attendance_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      trainings_ds44: {
        Row: {
          attendees_rut_list: string[]
          completed_hours: number
          created_at: string
          date: string
          hours: number
          id: string
          tenant_id: string
          topic: string
          trainer: string
        }
        Insert: {
          attendees_rut_list?: string[]
          completed_hours?: number
          created_at?: string
          date?: string
          hours?: number
          id?: string
          tenant_id: string
          topic: string
          trainer?: string
        }
        Update: {
          attendees_rut_list?: string[]
          completed_hours?: number
          created_at?: string
          date?: string
          hours?: number
          id?: string
          tenant_id?: string
          topic?: string
          trainer?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainings_ds44_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          created_by: string | null
          data: Json
          description: string | null
          id: string
          invoice_file_path: string | null
          invoice_number: string | null
          notes: string | null
          payment_method: string | null
          status: string | null
          supplier_id: string | null
          tenant_id: string
          transaction_date: string
          transaction_type: string | null
          type: string | null
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          description?: string | null
          id?: string
          invoice_file_path?: string | null
          invoice_number?: string | null
          notes?: string | null
          payment_method?: string | null
          status?: string | null
          supplier_id?: string | null
          tenant_id: string
          transaction_date?: string
          transaction_type?: string | null
          type?: string | null
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          description?: string | null
          id?: string
          invoice_file_path?: string | null
          invoice_number?: string | null
          notes?: string | null
          payment_method?: string | null
          status?: string | null
          supplier_id?: string | null
          tenant_id?: string
          transaction_date?: string
          transaction_type?: string | null
          type?: string | null
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treasury_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_transactions_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      user_tenant_context: {
        Row: {
          tenant_id: string | null
          updated_at: string
          user_email: string
        }
        Insert: {
          tenant_id?: string | null
          updated_at?: string
          user_email: string
        }
        Update: {
          tenant_id?: string | null
          updated_at?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenant_context_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vacation_balances: {
        Row: {
          amount: number
          carryover_days: number | null
          created_at: string
          data: Json
          date: string | null
          days_available: number | null
          id: string
          label: string | null
          name: string | null
          remaining_days: number | null
          status: string | null
          tenant_id: string
          total_days: number | null
          updated_at: string
          used_days: number | null
          worker_rut: string | null
          year: number | null
        }
        Insert: {
          amount?: number
          carryover_days?: number | null
          created_at?: string
          data?: Json
          date?: string | null
          days_available?: number | null
          id?: string
          label?: string | null
          name?: string | null
          remaining_days?: number | null
          status?: string | null
          tenant_id: string
          total_days?: number | null
          updated_at?: string
          used_days?: number | null
          worker_rut?: string | null
          year?: number | null
        }
        Update: {
          amount?: number
          carryover_days?: number | null
          created_at?: string
          data?: Json
          date?: string | null
          days_available?: number | null
          id?: string
          label?: string | null
          name?: string | null
          remaining_days?: number | null
          status?: string | null
          tenant_id?: string
          total_days?: number | null
          updated_at?: string
          used_days?: number | null
          worker_rut?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vacation_balances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_balances_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      vacation_requests: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by_email: string | null
          created_at: string
          data: Json
          date: string | null
          days_requested: number | null
          end_date: string | null
          id: string
          label: string | null
          name: string | null
          notes: string | null
          start_date: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
          year: number | null
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by_email?: string | null
          created_at?: string
          data?: Json
          date?: string | null
          days_requested?: number | null
          end_date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          notes?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
          year?: number | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by_email?: string | null
          created_at?: string
          data?: Json
          date?: string | null
          days_requested?: number | null
          end_date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          notes?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vacation_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_requests_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      worker_bank_accounts: {
        Row: {
          account_number: string | null
          account_type: string | null
          amount: number
          bank_name: string | null
          created_at: string
          data: Json
          date: string | null
          email_for_payments: string | null
          holder_name: string | null
          holder_rut: string | null
          id: string
          is_active: boolean | null
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          amount?: number
          bank_name?: string | null
          created_at?: string
          data?: Json
          date?: string | null
          email_for_payments?: string | null
          holder_name?: string | null
          holder_rut?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          amount?: number
          bank_name?: string | null
          created_at?: string
          data?: Json
          date?: string | null
          email_for_payments?: string | null
          holder_name?: string | null
          holder_rut?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_bank_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_bank_accounts_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      worker_discounts: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_discounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_discounts_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      worker_documents: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_documents_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      worker_payment_statements: {
        Row: {
          amount: number
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          name: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          worker_rut: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          worker_rut?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_payment_statements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_payment_statements_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      worker_requests: {
        Row: {
          admin_reply: string | null
          amount: number
          category: string | null
          created_at: string
          data: Json
          date: string | null
          id: string
          label: string | null
          message: string | null
          name: string | null
          replied_at: string | null
          replied_by_email: string | null
          status: string | null
          subject: string | null
          tenant_id: string
          updated_at: string
          validity: string | null
          validity_note: string | null
          worker_rut: string | null
        }
        Insert: {
          admin_reply?: string | null
          amount?: number
          category?: string | null
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          message?: string | null
          name?: string | null
          replied_at?: string | null
          replied_by_email?: string | null
          status?: string | null
          subject?: string | null
          tenant_id: string
          updated_at?: string
          validity?: string | null
          validity_note?: string | null
          worker_rut?: string | null
        }
        Update: {
          admin_reply?: string | null
          amount?: number
          category?: string | null
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          label?: string | null
          message?: string | null
          name?: string | null
          replied_at?: string | null
          replied_by_email?: string | null
          status?: string | null
          subject?: string | null
          tenant_id?: string
          updated_at?: string
          validity?: string | null
          validity_note?: string | null
          worker_rut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_requests_worker_same_tenant_fk"
            columns: ["tenant_id", "worker_rut"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["tenant_id", "rut"]
          },
        ]
      }
      workers: {
        Row: {
          address: string | null
          afp: string | null
          afp_rate: number | null
          apellidos: string | null
          base_salary: number
          birth_date: string | null
          bonus_target: number | null
          contract_end_date: string | null
          contract_start_date: string | null
          contract_status: string
          contract_type: string | null
          contract_url: string | null
          created_at: string
          department_id: string | null
          driver_license_exp_date: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          health_insurance: string | null
          health_rate: number | null
          hire_date: string | null
          hourly_rate: number
          id: string
          irl_signed_date: string | null
          meal_allowance: number | null
          mobility_allowance: number | null
          nationality: string | null
          nombres: string | null
          notes: string | null
          occupational_exam_exp_date: string | null
          overtime_rate: number | null
          phone: string | null
          photo_url: string | null
          position: string
          reports_to: string | null
          rut: string
          shift_cycle: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          afp?: string | null
          afp_rate?: number | null
          apellidos?: string | null
          base_salary?: number
          birth_date?: string | null
          bonus_target?: number | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          contract_status?: string
          contract_type?: string | null
          contract_url?: string | null
          created_at?: string
          department_id?: string | null
          driver_license_exp_date?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          health_insurance?: string | null
          health_rate?: number | null
          hire_date?: string | null
          hourly_rate?: number
          id?: string
          irl_signed_date?: string | null
          meal_allowance?: number | null
          mobility_allowance?: number | null
          nationality?: string | null
          nombres?: string | null
          notes?: string | null
          occupational_exam_exp_date?: string | null
          overtime_rate?: number | null
          phone?: string | null
          photo_url?: string | null
          position?: string
          reports_to?: string | null
          rut: string
          shift_cycle?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          afp?: string | null
          afp_rate?: number | null
          apellidos?: string | null
          base_salary?: number
          birth_date?: string | null
          bonus_target?: number | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          contract_status?: string
          contract_type?: string | null
          contract_url?: string | null
          created_at?: string
          department_id?: string | null
          driver_license_exp_date?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          health_insurance?: string | null
          health_rate?: number | null
          hire_date?: string | null
          hourly_rate?: number
          id?: string
          irl_signed_date?: string | null
          meal_allowance?: number | null
          mobility_allowance?: number | null
          nationality?: string | null
          nombres?: string | null
          notes?: string | null
          occupational_exam_exp_date?: string | null
          overtime_rate?: number | null
          phone?: string | null
          photo_url?: string | null
          position?: string
          reports_to?: string | null
          rut?: string
          shift_cycle?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workers_department_same_tenant_fk"
            columns: ["tenant_id", "department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "workers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acknowledge_saas_notification: {
        Args: { _notification_id: string }
        Returns: {
          channel: string
          created_at: string
          created_by_email: string | null
          id: string
          message: string
          metadata: Json
          priority: string
          read_at: string | null
          read_by: string | null
          template_key: string
          tenant_id: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "saas_customer_notifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_saas_plan: {
        Args: { _plan_id: string; _reason?: string; _tenant_id: string }
        Returns: {
          default_view: string
          effective_modules: Json
          max_users: number
          overrides: Json
          permissions: Json
          plan_code: string
          plan_features: Json
          plan_id: string
          role: string
          tenant_id: string
        }[]
      }
      apply_shift_assignment: {
        Args: {
          _days_of_week?: number[]
          _duration_type: string
          _end_date?: string
          _reason?: string
          _shift_definition_id: string
          _start_date: string
          _swap_with_rut?: string
          _worker_rut: string
        }
        Returns: {
          assignment: Database["public"]["Tables"]["shift_assignments"]["Row"]
          change_log: Database["public"]["Tables"]["shift_change_logs"]["Row"]
        }[]
      }
      attendance_summary: {
        Args: { _end: string; _rut: string; _start: string; _tenant: string }
        Returns: Json
      }
      attendance_time_tolerance_ms: { Args: never; Returns: number }
      attest_gps_session: {
        Args: {
          p_accuracy_m: number
          p_captured_at: string
          p_latitude: number
          p_longitude: number
        }
        Returns: Json
      }
      calculate_tenant_usage: {
        Args: { _tenant_id: string }
        Returns: {
          files_count: number
          records_count: number
          storage_bytes: number
        }[]
      }
      calculate_tenant_usage_breakdown: {
        Args: { _tenant_id: string }
        Returns: Json
      }
      check_allowed_email: {
        Args: { p_email: string }
        Returns: {
          allowed: boolean
          is_platform_developer: boolean
          is_worker: boolean
        }[]
      }
      check_login_rate_limit: {
        Args: {
          p_identifier: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_login_attempts: { Args: never; Returns: undefined }
      clear_active_tenant: { Args: never; Returns: undefined }
      compute_indicators: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          accident_count: number
          accident_ctp_count: number
          active_workers: number
          cobertura_epp: number
          cumplimiento_ds44: number
          days_charge: number
          days_lost: number
          ia: number
          man_hours: number
          tf: number
          tg: number
          total_workers: number
        }[]
      }
      compute_payroll_stats: {
        Args: never
        Returns: {
          items_count: number
          periods_count: number
          total_payroll: number
          workers_count: number
        }[]
      }
      create_saas_tenant: {
        Args: {
          _name: string
          _owner_email?: string
          _owner_permissions?: Json
          _slug: string
        }
        Returns: {
          active: boolean
          created_at: string
          id: string
          name: string
          slug: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "tenants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_tenant_id: { Args: never; Returns: string }
      current_user_email: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      current_worker_rut: { Args: never; Returns: string }
      deactivate_shift_assignment: {
        Args: { _assignment_id: string; _reason?: string }
        Returns: {
          assignment: Database["public"]["Tables"]["shift_assignments"]["Row"]
          change_log: Database["public"]["Tables"]["shift_change_logs"]["Row"]
        }[]
      }
      delete_worker_cascade: {
        Args: { p_tenant_id: string; p_worker_rut: string }
        Returns: undefined
      }
      dt_inspector_data: {
        Args: { _from: string; _kind: string; _rut?: string; _to: string }
        Returns: Json
      }
      enforce_gps_session_access: { Args: never; Returns: undefined }
      epp_adjust_stock: {
        Args: { p_delta: number; p_item_id: string; p_size_label: string }
        Returns: number
      }
      evaluate_saas_ip_access: {
        Args: { _ip: unknown; _tenant_id: string }
        Returns: {
          allowed: boolean
          decision: string
          matched_rule_id: string
          reason: string
        }[]
      }
      fetch_platform_operators: {
        Args: never
        Returns: {
          active: boolean
          email: string
          id: string
          permissions: Json
          tenant_ids: string[]
        }[]
      }
      fetch_public_landing_settings: { Args: never; Returns: Json }
      fetch_public_saas_landing: {
        Args: never
        Returns: {
          enabled: boolean
          hero_description: string
          hero_title: string
          primary_cta_label: string
          whatsapp_phone: string
        }[]
      }
      fetch_public_tenant_branding: {
        Args: { _slug: string }
        Returns: {
          color_theme: string
          company_name: string
          glass_opacity: string
          logo_url: string
          visual_assets: Json
        }[]
      }
      fetch_public_tenant_landing: {
        Args: { _slug: string }
        Returns: {
          color_theme: string
          company_name: string
          landing_cta_label: string
          logo_url: string
          visual_assets: Json
        }[]
      }
      fetch_saas_operational_events: {
        Args: never
        Returns: {
          action: string
          created_at: string
          details: Json
          entity: string
          entity_label: string
          tenant_id: string
        }[]
      }
      fetch_saas_plans: {
        Args: never
        Returns: {
          code: string
          description: string
          feature_keys: Json
          id: string
          max_users: number
          name: string
        }[]
      }
      fetch_saas_tenant_branding: {
        Args: never
        Returns: {
          color_theme: string
          company_name: string
          glass_opacity: string
          landing_cta_label: string
          landing_enabled: boolean
          logo_url: string
          tenant_id: string
          tenant_name: string
          visual_assets: Json
        }[]
      }
      fetch_saas_tenant_data_catalog: {
        Args: { _tenant_id?: string }
        Returns: {
          row_count: number
          table_name: string
          tenant_id: string
        }[]
      }
      fetch_saas_tenant_ip_history: {
        Args: { _tenant_id?: string }
        Returns: {
          ip_address: string
          observed_at: string
          outcome: string
          source: string
          tenant_id: string
        }[]
      }
      fetch_saas_tenant_overview: {
        Args: never
        Returns: {
          branch_manager_name: string
          branch_manager_worker_id: string
          deployment_status: string
          isolation_mode: string
          max_users: number
          member_count: number
          parent_tenant_id: string
          plan_code: string
          plan_name: string
          subscription_status: string
          tenant_active: boolean
          tenant_id: string
          tenant_name: string
          tenant_slug: string
          tenant_status: string
          tenant_type: string
        }[]
      }
      fetch_saas_tenant_trash: {
        Args: never
        Returns: {
          cut_at: string
          member_count: number
          tenant_active: boolean
          tenant_id: string
          tenant_name: string
          tenant_slug: string
          tenant_status: string
        }[]
      }
      fetch_saas_tenant_view_settings: {
        Args: never
        Returns: {
          default_view: string
          tenant_id: string
        }[]
      }
      fetch_saas_tenant_workers: {
        Args: { _tenant_id: string }
        Returns: {
          email: string
          full_name: string
          id: string
          position: string
          rut: string
        }[]
      }
      fetch_saas_worker_directory: {
        Args: { _tenant_id: string }
        Returns: {
          active: boolean
          email: string
          full_name: string
          id: string
          job_position: string
          rut: string
        }[]
      }
      fetch_tenant_role_templates: {
        Args: { _tenant_id: string }
        Returns: {
          created_at: string
          permissions: Json
          role: string
          tenant_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "tenant_role_permission_templates"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      generate_attendance_report: {
        Args: { _rut: string; _start: string; _type: string }
        Returns: string
      }
      get_effective_tenant_access: {
        Args: { _tenant_id: string }
        Returns: {
          default_view: string
          effective_modules: Json
          max_users: number
          overrides: Json
          permissions: Json
          plan_code: string
          plan_features: Json
          plan_id: string
          role: string
          tenant_id: string
        }[]
      }
      gps_gate_enabled: { Args: never; Returns: boolean }
      gps_session_is_verified: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_dt_inspector: { Args: never; Returns: boolean }
      is_platform_identity: { Args: { _email: string }; Returns: boolean }
      is_platform_owner: { Args: never; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      is_worker: { Args: never; Returns: boolean }
      mfa_required_for_current_user: { Args: never; Returns: boolean }
      my_tenants: {
        Args: never
        Returns: {
          id: string
          is_active: boolean
          name: string
          slug: string
          status: string
        }[]
      }
      provision_tenant_access: {
        Args: {
          _email: string
          _permissions?: Json
          _role: string
          _tenant_id: string
        }
        Returns: {
          access_expires_at: string | null
          active: boolean
          ad_synced: boolean
          created_at: string
          email: string
          id: string
          must_change_password: boolean
          password_set_at: string | null
          permissions: Json
          role: string
          tenant_id: string | null
          worker_rut: string | null
        }
        SetofOptions: {
          from: "*"
          to: "allowed_emails"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      provision_worker_access: {
        Args: {
          _email: string
          _permissions?: Json
          _tenant_id: string
          _worker_rut: string
        }
        Returns: {
          access_expires_at: string | null
          active: boolean
          ad_synced: boolean
          created_at: string
          email: string
          id: string
          must_change_password: boolean
          password_set_at: string | null
          permissions: Json
          role: string
          tenant_id: string | null
          worker_rut: string | null
        }
        SetofOptions: {
          from: "*"
          to: "allowed_emails"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_saas_notification: {
        Args: {
          _message: string
          _metadata?: Json
          _priority?: string
          _template_key: string
          _tenant_id: string
          _title: string
        }
        Returns: {
          channel: string
          created_at: string
          created_by_email: string | null
          id: string
          message: string
          metadata: Json
          priority: string
          read_at: string | null
          read_by: string | null
          template_key: string
          tenant_id: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "saas_customer_notifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_saas_data_audit: {
        Args: {
          _action: string
          _classification?: string
          _metadata?: Json
          _outcome?: string
          _resource_id?: string
          _resource_type: string
          _tenant_id: string
        }
        Returns: string
      }
      refresh_tenant_usage_daily: {
        Args: { _tenant_id?: string }
        Returns: {
          files_count: number
          plan_storage_limit_bytes: number
          records_count: number
          storage_bytes: number
          tenant_id: string
          usage_breakdown: Json
          usage_date: string
        }[]
      }
      replace_tenant_role_templates: {
        Args: { _templates: Json; _tenant_id: string }
        Returns: number
      }
      respond_attendance_rectification: {
        Args: { _accept: boolean; _comment?: string; _id: string; _ip?: string }
        Returns: undefined
      }
      respond_attendance_report: {
        Args: { _comment?: string; _conforme: boolean; _id: string }
        Returns: undefined
      }
      restore_saas_tenant: {
        Args: { _reason?: string; _tenant_id: string }
        Returns: {
          tenant_active: boolean
          tenant_id: string
          tenant_name: string
          tenant_status: string
        }[]
      }
      set_active_tenant: {
        Args: { _reason?: string; _tenant_id: string }
        Returns: undefined
      }
      set_saas_tenant_feature_override: {
        Args: {
          _enabled: boolean
          _feature_key: string
          _reason?: string
          _tenant_id: string
        }
        Returns: {
          enabled: boolean
          feature_key: string
          reason: string | null
          tenant_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "saas_tenant_feature_overrides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_saas_tenant_landing_enabled: {
        Args: { _enabled: boolean; _tenant_id: string }
        Returns: undefined
      }
      set_saas_tenant_lifecycle: {
        Args: { _reason?: string; _status: string; _tenant_id: string }
        Returns: {
          tenant_active: boolean
          tenant_id: string
          tenant_name: string
          tenant_status: string
        }[]
      }
      shift_actor_can_write: { Args: never; Returns: boolean }
      update_public_landing_settings: {
        Args: { _visual_assets: Json }
        Returns: undefined
      }
      update_saas_public_landing: {
        Args: {
          _enabled: boolean
          _hero_description: string
          _hero_title: string
          _primary_cta_label: string
          _whatsapp_phone: string
        }
        Returns: undefined
      }
      update_saas_tenant_branding:
        | {
            Args: {
              _color_theme: string
              _company_name: string
              _glass_opacity: string
              _landing_cta_label?: string
              _landing_enabled?: boolean
              _logo_url: string
              _tenant_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _color_theme: string
              _company_name: string
              _glass_opacity: string
              _landing_cta_label: string
              _landing_enabled: boolean
              _logo_url: string
              _tenant_id: string
              _visual_assets: Json
            }
            Returns: undefined
          }
      update_saas_tenant_default_view: {
        Args: { _default_view: string; _tenant_id: string }
        Returns: undefined
      }
      upsert_platform_operator: {
        Args: {
          _active?: boolean
          _email: string
          _permissions: Json
          _tenant_ids?: string[]
        }
        Returns: {
          active: boolean
          email: string
          permissions: Json
          tenant_ids: string[]
        }[]
      }
      verify_attendance_chain: { Args: never; Returns: Json }
      verify_attendance_receipt: { Args: { _code: string }; Returns: Json }
      verify_saas_log_isolation: {
        Args: never
        Returns: {
          check_name: string
          detail: string
          passed: boolean
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
