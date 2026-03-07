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
      acoes_comerciais_log: {
        Row: {
          acao: string
          card_id: string
          created_at: string
          descricao: string | null
          documento_id: string | null
          id: string
        }
        Insert: {
          acao: string
          card_id: string
          created_at?: string
          descricao?: string | null
          documento_id?: string | null
          id?: string
        }
        Update: {
          acao?: string
          card_id?: string
          created_at?: string
          descricao?: string | null
          documento_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acoes_comerciais_log_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "crm_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string
          complemento: string | null
          created_at: string
          email: string | null
          estado: string | null
          id: string
          logradouro: string | null
          nome_fantasia: string
          numero: string | null
          observacoes: string | null
          pais: string | null
          razao_social: string
          segmento: string | null
          segmento_id: string | null
          status: string
          telefone: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj: string
          complemento?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: string
          logradouro?: string | null
          nome_fantasia: string
          numero?: string | null
          observacoes?: string | null
          pais?: string | null
          razao_social: string
          segmento?: string | null
          segmento_id?: string | null
          status?: string
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          complemento?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: string
          logradouro?: string | null
          nome_fantasia?: string
          numero?: string | null
          observacoes?: string | null
          pais?: string | null
          razao_social?: string
          segmento?: string | null
          segmento_id?: string | null
          status?: string
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_cards: {
        Row: {
          cliente_cidade: string
          cliente_cnpj: string
          cliente_estado: string
          cliente_id: string
          cliente_nome: string
          cliente_segmento: string | null
          created_at: string
          data_substituicao: string | null
          estagio: string
          gestao: string
          id: string
          observacoes: string | null
          operacao: string
          operacao_nova: string | null
          oportunidade_id: string | null
          ordem: number
          substituida: boolean | null
          updated_at: string
        }
        Insert: {
          cliente_cidade?: string
          cliente_cnpj: string
          cliente_estado?: string
          cliente_id: string
          cliente_nome: string
          cliente_segmento?: string | null
          created_at?: string
          data_substituicao?: string | null
          estagio?: string
          gestao: string
          id?: string
          observacoes?: string | null
          operacao: string
          operacao_nova?: string | null
          oportunidade_id?: string | null
          ordem?: number
          substituida?: boolean | null
          updated_at?: string
        }
        Update: {
          cliente_cidade?: string
          cliente_cnpj?: string
          cliente_estado?: string
          cliente_id?: string
          cliente_nome?: string
          cliente_segmento?: string | null
          created_at?: string
          data_substituicao?: string | null
          estagio?: string
          gestao?: string
          id?: string
          observacoes?: string | null
          operacao?: string
          operacao_nova?: string | null
          oportunidade_id?: string | null
          ordem?: number
          substituida?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      documentos_comerciais: {
        Row: {
          aprovado_em: string | null
          arquivo_nome: string | null
          arquivo_url: string | null
          card_id: string
          cliente_id: string
          conteudo: Json | null
          created_at: string
          enviado_em: string | null
          google_drive_id: string | null
          id: string
          moeda: string
          numero: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          aprovado_em?: string | null
          arquivo_nome?: string | null
          arquivo_url?: string | null
          card_id: string
          cliente_id: string
          conteudo?: Json | null
          created_at?: string
          enviado_em?: string | null
          google_drive_id?: string | null
          id?: string
          moeda?: string
          numero?: string | null
          status?: string
          tipo: string
          titulo: string
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          aprovado_em?: string | null
          arquivo_nome?: string | null
          arquivo_url?: string | null
          card_id?: string
          cliente_id?: string
          conteudo?: Json | null
          created_at?: string
          enviado_em?: string | null
          google_drive_id?: string | null
          id?: string
          moeda?: string
          numero?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_comerciais_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "crm_cards"
            referencedColumns: ["id"]
          },
        ]
      }
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
          condicoes_pagamento_padrao: string | null
          contatos: Json | null
          contrato: string | null
          created_at: string
          data_inicio: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          gestao: string | null
          id: string
          imagem_template_url: string | null
          linhas_produtos: string[] | null
          logotipo_url: string | null
          nome_fantasia: string
          num_orcamentos: number | null
          num_vendas: number | null
          numero: string | null
          observacoes: string | null
          orcamento_medio: number | null
          pendentes: number | null
          prazo_entrega_padrao: string | null
          produtos_servicos: string | null
          razao_social: string
          segmentos_atuacao: string[] | null
          site: string | null
          site_2: string | null
          status: string
          telefone: string | null
          termos_fabricante: string | null
          tipo: string
          tipo_layout: string | null
          updated_at: string
          validade_dias_padrao: number | null
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
          condicoes_pagamento_padrao?: string | null
          contatos?: Json | null
          contrato?: string | null
          created_at?: string
          data_inicio?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          gestao?: string | null
          id?: string
          imagem_template_url?: string | null
          linhas_produtos?: string[] | null
          logotipo_url?: string | null
          nome_fantasia: string
          num_orcamentos?: number | null
          num_vendas?: number | null
          numero?: string | null
          observacoes?: string | null
          orcamento_medio?: number | null
          pendentes?: number | null
          prazo_entrega_padrao?: string | null
          produtos_servicos?: string | null
          razao_social: string
          segmentos_atuacao?: string[] | null
          site?: string | null
          site_2?: string | null
          status?: string
          telefone?: string | null
          termos_fabricante?: string | null
          tipo?: string
          tipo_layout?: string | null
          updated_at?: string
          validade_dias_padrao?: number | null
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
          condicoes_pagamento_padrao?: string | null
          contatos?: Json | null
          contrato?: string | null
          created_at?: string
          data_inicio?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          gestao?: string | null
          id?: string
          imagem_template_url?: string | null
          linhas_produtos?: string[] | null
          logotipo_url?: string | null
          nome_fantasia?: string
          num_orcamentos?: number | null
          num_vendas?: number | null
          numero?: string | null
          observacoes?: string | null
          orcamento_medio?: number | null
          pendentes?: number | null
          prazo_entrega_padrao?: string | null
          produtos_servicos?: string | null
          razao_social?: string
          segmentos_atuacao?: string[] | null
          site?: string | null
          site_2?: string | null
          status?: string
          telefone?: string | null
          termos_fabricante?: string | null
          tipo?: string
          tipo_layout?: string | null
          updated_at?: string
          validade_dias_padrao?: number | null
          venda_media?: number | null
          volume_orcamentos?: number | null
          volume_vendas?: number | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      orcamento_itens: {
        Row: {
          codigo: string | null
          created_at: string
          descricao: string
          especificacoes: string | null
          id: string
          medidas: string | null
          orcamento_id: string
          ordem: number
          preco_unitario: number
          quantidade: number
          total: number
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          descricao: string
          especificacoes?: string | null
          id?: string
          medidas?: string | null
          orcamento_id: string
          ordem?: number
          preco_unitario?: number
          quantidade?: number
          total?: number
        }
        Update: {
          codigo?: string | null
          created_at?: string
          descricao?: string
          especificacoes?: string | null
          id?: string
          medidas?: string | null
          orcamento_id?: string
          ordem?: number
          preco_unitario?: number
          quantidade?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          aprovado_em: string | null
          assinado_em: string | null
          assinatura_cliente: string | null
          card_id: string | null
          cliente_cnpj: string | null
          cliente_email: string | null
          cliente_endereco: string | null
          cliente_id: string
          cliente_nome: string
          cliente_razao_social: string | null
          cliente_telefone: string | null
          codigo_empresa: string | null
          condicoes_pagamento: Json | null
          created_at: string
          data_emissao: string | null
          data_validade: string | null
          desconto: number
          desconto_percentual: number | null
          desconto_valor: number | null
          difal_texto: string | null
          enviado_em: string | null
          fornecedor_id: string | null
          fornecedor_nome: string | null
          frete: number
          frete_tipo: string | null
          gestao: string | null
          html_content: string | null
          id: string
          imagem_marketing_url: string | null
          imagem_publicidade_url: string | null
          impostos: number
          impostos_percentual: number | null
          numero: string
          observacoes: string | null
          observacoes_gerais: string | null
          operacao: string | null
          pdf_url: string | null
          prazo_entrega: string | null
          status: string
          subtotal: number
          termos_3w: string | null
          termos_fornecedor: string | null
          total: number
          updated_at: string
          validade_dias: number
        }
        Insert: {
          aprovado_em?: string | null
          assinado_em?: string | null
          assinatura_cliente?: string | null
          card_id?: string | null
          cliente_cnpj?: string | null
          cliente_email?: string | null
          cliente_endereco?: string | null
          cliente_id: string
          cliente_nome: string
          cliente_razao_social?: string | null
          cliente_telefone?: string | null
          codigo_empresa?: string | null
          condicoes_pagamento?: Json | null
          created_at?: string
          data_emissao?: string | null
          data_validade?: string | null
          desconto?: number
          desconto_percentual?: number | null
          desconto_valor?: number | null
          difal_texto?: string | null
          enviado_em?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          frete?: number
          frete_tipo?: string | null
          gestao?: string | null
          html_content?: string | null
          id?: string
          imagem_marketing_url?: string | null
          imagem_publicidade_url?: string | null
          impostos?: number
          impostos_percentual?: number | null
          numero: string
          observacoes?: string | null
          observacoes_gerais?: string | null
          operacao?: string | null
          pdf_url?: string | null
          prazo_entrega?: string | null
          status?: string
          subtotal?: number
          termos_3w?: string | null
          termos_fornecedor?: string | null
          total?: number
          updated_at?: string
          validade_dias?: number
        }
        Update: {
          aprovado_em?: string | null
          assinado_em?: string | null
          assinatura_cliente?: string | null
          card_id?: string | null
          cliente_cnpj?: string | null
          cliente_email?: string | null
          cliente_endereco?: string | null
          cliente_id?: string
          cliente_nome?: string
          cliente_razao_social?: string | null
          cliente_telefone?: string | null
          codigo_empresa?: string | null
          condicoes_pagamento?: Json | null
          created_at?: string
          data_emissao?: string | null
          data_validade?: string | null
          desconto?: number
          desconto_percentual?: number | null
          desconto_valor?: number | null
          difal_texto?: string | null
          enviado_em?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          frete?: number
          frete_tipo?: string | null
          gestao?: string | null
          html_content?: string | null
          id?: string
          imagem_marketing_url?: string | null
          imagem_publicidade_url?: string | null
          impostos?: number
          impostos_percentual?: number | null
          numero?: string
          observacoes?: string | null
          observacoes_gerais?: string | null
          operacao?: string | null
          pdf_url?: string | null
          prazo_entrega?: string | null
          status?: string
          subtotal?: number
          termos_3w?: string | null
          termos_fornecedor?: string | null
          total?: number
          updated_at?: string
          validade_dias?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "crm_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
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
