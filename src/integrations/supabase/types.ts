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
      contatos: {
        Row: {
          cargo: string
          created_at: string
          email: string
          id: string
          municipio_id: string | null
          nivel: string
          nome: string
          observacoes: string
          telefone: string
          updated_at: string
          whatsapp: boolean
        }
        Insert: {
          cargo?: string
          created_at?: string
          email?: string
          id?: string
          municipio_id?: string | null
          nivel?: string
          nome: string
          observacoes?: string
          telefone?: string
          updated_at?: string
          whatsapp?: boolean
        }
        Update: {
          cargo?: string
          created_at?: string
          email?: string
          id?: string
          municipio_id?: string | null
          nivel?: string
          nome?: string
          observacoes?: string
          telefone?: string
          updated_at?: string
          whatsapp?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "contatos_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_itens: {
        Row: {
          categoria: string
          created_at: string
          custo_unitario: number
          fornecedor: string | null
          id: string
          ideal: number
          imagem_url: string | null
          minimo: number
          nome: string
          saldo_atual: number
          unidade: string
          updated_at: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          custo_unitario?: number
          fornecedor?: string | null
          id?: string
          ideal?: number
          imagem_url?: string | null
          minimo?: number
          nome: string
          saldo_atual?: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          custo_unitario?: number
          fornecedor?: string | null
          id?: string
          ideal?: number
          imagem_url?: string | null
          minimo?: number
          nome?: string
          saldo_atual?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      kit_itens: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          kit_id: string
          quantidade: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type?: string
          kit_id: string
          quantidade?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          kit_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "kit_itens_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
        ]
      }
      kits: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          disponiveis: number
          id: string
          montados: number
          nome: string
          tipo: string
          updated_at: string
          usados: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          disponiveis?: number
          id?: string
          montados?: number
          nome: string
          tipo?: string
          updated_at?: string
          usados?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          disponiveis?: number
          id?: string
          montados?: number
          nome?: string
          tipo?: string
          updated_at?: string
          usados?: number
        }
        Relationships: []
      }
      municipios: {
        Row: {
          abertura: number
          created_at: string
          estado: string
          facilidade: number
          has_cliente: boolean
          ibge_codigo: string | null
          id: string
          nome: string
          potencial: number
          prioridade: string
          regiao: string | null
          relacionamento: number
          responsavel: string | null
          score: number
          status: string
          ultima_visita: string | null
          updated_at: string
        }
        Insert: {
          abertura?: number
          created_at?: string
          estado: string
          facilidade?: number
          has_cliente?: boolean
          ibge_codigo?: string | null
          id?: string
          nome: string
          potencial?: number
          prioridade?: string
          regiao?: string | null
          relacionamento?: number
          responsavel?: string | null
          score?: number
          status?: string
          ultima_visita?: string | null
          updated_at?: string
        }
        Update: {
          abertura?: number
          created_at?: string
          estado?: string
          facilidade?: number
          has_cliente?: boolean
          ibge_codigo?: string | null
          id?: string
          nome?: string
          potencial?: number
          prioridade?: string
          regiao?: string | null
          relacionamento?: number
          responsavel?: string | null
          score?: number
          status?: string
          ultima_visita?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      orgao_contatos: {
        Row: {
          contato_id: string
          created_at: string
          id: string
          orgao_id: string
          papel: string
        }
        Insert: {
          contato_id: string
          created_at?: string
          id?: string
          orgao_id: string
          papel?: string
        }
        Update: {
          contato_id?: string
          created_at?: string
          id?: string
          orgao_id?: string
          papel?: string
        }
        Relationships: [
          {
            foreignKeyName: "orgao_contatos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orgao_contatos_orgao_id_fkey"
            columns: ["orgao_id"]
            isOneToOne: false
            referencedRelation: "orgaos"
            referencedColumns: ["id"]
          },
        ]
      }
      orgaos: {
        Row: {
          created_at: string
          email: string
          endereco: string
          estado: string
          id: string
          municipio_id: string | null
          nome: string
          observacoes: string
          sigla: string
          telefone: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          endereco?: string
          estado: string
          id?: string
          municipio_id?: string | null
          nome: string
          observacoes?: string
          sigla?: string
          telefone?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          endereco?: string
          estado?: string
          id?: string
          municipio_id?: string | null
          nome?: string
          observacoes?: string
          sigla?: string
          telefone?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orgaos_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_itens: {
        Row: {
          created_at: string
          id: string
          item_id: string
          pack_id: string
          quantidade: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          pack_id: string
          quantidade?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          pack_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "pack_itens_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pack_itens_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
        ]
      }
      packs: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
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
    Enums: {},
  },
} as const
