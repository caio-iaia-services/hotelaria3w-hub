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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      fornecedores: {
        Row: {
          a_receber: number | null
          bairro: string | null
          catalogos: Json | null
          cep: string | null
          cidade: string | null
          cnpj: string
          codigo: string | null
          comissao_vendas: number | null
          complemento: string | null
          condicoes_pagamento: Json | null
          contatos: Json | null
          contrato: string | null
          created_at: string
          data_inicio: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          gestao: string | null
          id: string
          linhas_produtos: string[] | null
          logotipo_url: string | null
          nome_fantasia: string
          num_orcamentos: number | null
          num_vendas: number | null
          numero: string | null
          observacoes: string | null
          orcamento_medio: number | null
          pendentes: number | null
          produtos_servicos: string | null
          razao_social: string
          segmentos_atuacao: string[] | null
          site: string | null
          site_2: string | null
          status: string
          telefone: string | null
          termos_fabricante: string | null
          tipo: string
          updated_at: string
          venda_media: number | null
          volume_orcamentos: number | null
          volume_vendas: number | null
          whatsapp: string | null
        }
        Insert: {
          a_receber?: number | null
          bairro?: string | null
          catalogos?: Json | null
          cep?: string | null
          cidade?: string | null
          cnpj: string
          codigo?: string | null
          comissao_vendas?: number | null
          complemento?: string | null
          condicoes_pagamento?: Json | null
          contatos?: Json | null
          contrato?: string | null
          created_at?: string
          data_inicio?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          gestao?: string | null
          id?: string
          linhas_produtos?: string[] | null
          logotipo_url?: string | null
          nome_fantasia: string
          num_orcamentos?: number | null
          num_vendas?: number | null
          numero?: string | null
          observacoes?: string | null
          orcamento_medio?: number | null
          pendentes?: number | null
          produtos_servicos?: string | null
          razao_social: string
          segmentos_atuacao?: string[] | null
          site?: string | null
          site_2?: string | null
          status?: string
          telefone?: string | null
          termos_fabricante?: string | null
          tipo?: string
          updated_at?: string
          venda_media?: number | null
          volume_orcamentos?: number | null
          volume_vendas?: number | null
          whatsapp?: string | null
        }
        Update: {
          a_receber?: number | null
          bairro?: string | null
          catalogos?: Json | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          codigo?: string | null
          comissao_vendas?: number | null
          complemento?: string | null
          condicoes_pagamento?: Json | null
          contatos?: Json | null
          contrato?: string | null
          created_at?: string
          data_inicio?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          gestao?: string | null
          id?: string
          linhas_produtos?: string[] | null
          logotipo_url?: string | null
          nome_fantasia?: string
          num_orcamentos?: number | null
          num_vendas?: number | null
          numero?: string | null
          observacoes?: string | null
          orcamento_medio?: number | null
          pendentes?: number | null
          produtos_servicos?: string | null
          razao_social?: string
          segmentos_atuacao?: string[] | null
          site?: string | null
          site_2?: string | null
          status?: string
          telefone?: string | null
          termos_fabricante?: string | null
          tipo?: string
          updated_at?: string
          venda_media?: number | null
          volume_orcamentos?: number | null
          volume_vendas?: number | null
          whatsapp?: string | null
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
