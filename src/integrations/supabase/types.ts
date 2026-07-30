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
          card_id: string | null
          created_at: string | null
          descricao: string | null
          documento_id: string | null
          executado_por: string | null
          id: string
        }
        Insert: {
          acao: string
          card_id?: string | null
          created_at?: string | null
          descricao?: string | null
          documento_id?: string | null
          executado_por?: string | null
          id?: string
        }
        Update: {
          acao?: string
          card_id?: string | null
          created_at?: string | null
          descricao?: string | null
          documento_id?: string | null
          executado_por?: string | null
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
          {
            foreignKeyName: "acoes_comerciais_log_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_comerciais"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          created_at: string | null
          dados_antes: Json | null
          dados_depois: Json | null
          id: string
          ip_address: string | null
          registro_id: string
          tabela: string
          user_agent: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          ip_address?: string | null
          registro_id: string
          tabela: string
          user_agent?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          ip_address?: string | null
          registro_id?: string
          tabela?: string
          user_agent?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      automacoes: {
        Row: {
          acoes: Json
          ativo: boolean | null
          condicoes: Json | null
          created_at: string | null
          delay_minutos: number | null
          evento_gatilho: string
          id: string
          nome: string
          tipo: string
          total_conversoes: number | null
          total_disparos: number | null
          updated_at: string | null
        }
        Insert: {
          acoes: Json
          ativo?: boolean | null
          condicoes?: Json | null
          created_at?: string | null
          delay_minutos?: number | null
          evento_gatilho: string
          id?: string
          nome: string
          tipo: string
          total_conversoes?: number | null
          total_disparos?: number | null
          updated_at?: string | null
        }
        Update: {
          acoes?: Json
          ativo?: boolean | null
          condicoes?: Json | null
          created_at?: string | null
          delay_minutos?: number | null
          evento_gatilho?: string
          id?: string
          nome?: string
          tipo?: string
          total_conversoes?: number | null
          total_disparos?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      automacoes_historico: {
        Row: {
          automacao_id: string | null
          cliente_id: string | null
          created_at: string | null
          data_disparo: string | null
          data_execucao: string | null
          erro: string | null
          id: string
          resultado: Json | null
          status: string | null
        }
        Insert: {
          automacao_id?: string | null
          cliente_id?: string | null
          created_at?: string | null
          data_disparo?: string | null
          data_execucao?: string | null
          erro?: string | null
          id?: string
          resultado?: Json | null
          status?: string | null
        }
        Update: {
          automacao_id?: string | null
          cliente_id?: string | null
          created_at?: string | null
          data_disparo?: string | null
          data_execucao?: string | null
          erro?: string | null
          id?: string
          resultado?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automacoes_historico_automacao_id_fkey"
            columns: ["automacao_id"]
            isOneToOne: false
            referencedRelation: "automacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automacoes_historico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      busca_lista_itens: {
        Row: {
          cnpj: string
          created_at: string
          id: string
          lista_id: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          id?: string
          lista_id: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          id?: string
          lista_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "busca_lista_itens_lista_id_fkey"
            columns: ["lista_id"]
            isOneToOne: false
            referencedRelation: "busca_listas"
            referencedColumns: ["id"]
          },
        ]
      }
      busca_listas: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campanhas: {
        Row: {
          assunto: string | null
          categoria_ids: string[] | null
          conteudo: string | null
          created_at: string | null
          criado_por: string | null
          data_agendamento: string | null
          data_fim_envio: string | null
          data_inicio_envio: string | null
          filtros: Json | null
          id: string
          nome: string
          receita_gerada: number | null
          segmento_ids: string[] | null
          status: string | null
          tags: string[] | null
          taxa_abertura: number | null
          taxa_clique: number | null
          taxa_conversao: number | null
          template_id: string | null
          tipo: string
          total_aberturas: number | null
          total_cliques: number | null
          total_conversoes: number | null
          total_destinatarios: number | null
          total_enviados: number | null
          updated_at: string | null
        }
        Insert: {
          assunto?: string | null
          categoria_ids?: string[] | null
          conteudo?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_agendamento?: string | null
          data_fim_envio?: string | null
          data_inicio_envio?: string | null
          filtros?: Json | null
          id?: string
          nome: string
          receita_gerada?: number | null
          segmento_ids?: string[] | null
          status?: string | null
          tags?: string[] | null
          taxa_abertura?: number | null
          taxa_clique?: number | null
          taxa_conversao?: number | null
          template_id?: string | null
          tipo: string
          total_aberturas?: number | null
          total_cliques?: number | null
          total_conversoes?: number | null
          total_destinatarios?: number | null
          total_enviados?: number | null
          updated_at?: string | null
        }
        Update: {
          assunto?: string | null
          categoria_ids?: string[] | null
          conteudo?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_agendamento?: string | null
          data_fim_envio?: string | null
          data_inicio_envio?: string | null
          filtros?: Json | null
          id?: string
          nome?: string
          receita_gerada?: number | null
          segmento_ids?: string[] | null
          status?: string | null
          tags?: string[] | null
          taxa_abertura?: number | null
          taxa_clique?: number | null
          taxa_conversao?: number | null
          template_id?: string | null
          tipo?: string
          total_aberturas?: number | null
          total_cliques?: number | null
          total_conversoes?: number | null
          total_destinatarios?: number | null
          total_enviados?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas_envios: {
        Row: {
          campanha_id: string | null
          cliente_id: string | null
          converteu: boolean | null
          created_at: string | null
          data_abertura: string | null
          data_clique: string | null
          data_envio: string | null
          email: string | null
          id: string
          ip_abertura: string | null
          status: string | null
          telefone: string | null
          user_agent: string | null
          valor_conversao: number | null
        }
        Insert: {
          campanha_id?: string | null
          cliente_id?: string | null
          converteu?: boolean | null
          created_at?: string | null
          data_abertura?: string | null
          data_clique?: string | null
          data_envio?: string | null
          email?: string | null
          id?: string
          ip_abertura?: string | null
          status?: string | null
          telefone?: string | null
          user_agent?: string | null
          valor_conversao?: number | null
        }
        Update: {
          campanha_id?: string | null
          cliente_id?: string | null
          converteu?: boolean | null
          created_at?: string | null
          data_abertura?: string | null
          data_clique?: string | null
          data_envio?: string | null
          email?: string | null
          id?: string
          ip_abertura?: string | null
          status?: string | null
          telefone?: string | null
          user_agent?: string | null
          valor_conversao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_envios_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanhas_envios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          ativa: boolean | null
          cor: string | null
          created_at: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          ativa?: boolean | null
          cor?: string | null
          created_at?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          ativa?: boolean | null
          cor?: string | null
          created_at?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      categorias_financeiras: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          atualizado_em: string
          canal: string
          cliente_id: string | null
          contato_id: string
          criado_em: string
          ia_ativa: boolean
          id: string
          interesse_cliente: string | null
          multi360_id: number | null
          notas_gestor: string | null
          prioridade: string | null
          proxima_acao: string | null
          status: string
          tags: string[] | null
          ultima_mensagem_em: string | null
        }
        Insert: {
          atualizado_em?: string
          canal?: string
          cliente_id?: string | null
          contato_id: string
          criado_em?: string
          ia_ativa?: boolean
          id?: string
          interesse_cliente?: string | null
          multi360_id?: number | null
          notas_gestor?: string | null
          prioridade?: string | null
          proxima_acao?: string | null
          status?: string
          tags?: string[] | null
          ultima_mensagem_em?: string | null
        }
        Update: {
          atualizado_em?: string
          canal?: string
          cliente_id?: string | null
          contato_id?: string
          criado_em?: string
          ia_ativa?: boolean
          id?: string
          interesse_cliente?: string | null
          multi360_id?: number | null
          notas_gestor?: string | null
          prioridade?: string | null
          proxima_acao?: string | null
          status?: string
          tags?: string[] | null
          ultima_mensagem_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos_whatsapp"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          cnpj_validado: boolean | null
          complemento: string | null
          created_at: string | null
          created_by: string | null
          data_aniversario: string | null
          data_cadastro: string | null
          data_primeira_compra: string | null
          data_ultima_compra: string | null
          dia_vencimento: number | null
          email: string | null
          endereco: string | null
          estado: string | null
          estrelas: number | null
          forma_pagamento: string | null
          hotel_classificacao: string | null
          hotel_leitos: number | null
          hotel_leitos_acessiveis: number | null
          hotel_perfil: string | null
          hotel_tem_spa: boolean | null
          hotel_tipo: string | null
          hotel_uhs: number | null
          hotel_uhs_acessiveis: number | null
          id: string
          inscricao_estadual: string | null
          inscricao_estadual_tipo: string | null
          logradouro: string | null
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          pais: string | null
          pessoa_tipo: string
          porte: string | null
          qtd_comprada: number | null
          qtd_orcada: number | null
          razao_social: string
          relacao_comercial: string | null
          segmento: string[] | null
          segmento_id: string | null
          site: string | null
          status: string | null
          status_prospeccao: string | null
          tags: string[] | null
          telefone: string | null
          ticket_medio: number | null
          tipo: string | null
          total_comprado: number | null
          total_pedidos: number | null
          total_pedidos_consolidados: number | null
          total_pedidos_nao_consolidados: number | null
          updated_at: string | null
          updated_by: string | null
          whatsapp: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          cnpj_validado?: boolean | null
          complemento?: string | null
          created_at?: string | null
          created_by?: string | null
          data_aniversario?: string | null
          data_cadastro?: string | null
          data_primeira_compra?: string | null
          data_ultima_compra?: string | null
          dia_vencimento?: number | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          estrelas?: number | null
          forma_pagamento?: string | null
          hotel_classificacao?: string | null
          hotel_leitos?: number | null
          hotel_leitos_acessiveis?: number | null
          hotel_perfil?: string | null
          hotel_tem_spa?: boolean | null
          hotel_tipo?: string | null
          hotel_uhs?: number | null
          hotel_uhs_acessiveis?: number | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_estadual_tipo?: string | null
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          pais?: string | null
          pessoa_tipo?: string
          porte?: string | null
          qtd_comprada?: number | null
          qtd_orcada?: number | null
          razao_social: string
          relacao_comercial?: string | null
          segmento?: string[] | null
          segmento_id?: string | null
          site?: string | null
          status?: string | null
          status_prospeccao?: string | null
          tags?: string[] | null
          telefone?: string | null
          ticket_medio?: number | null
          tipo?: string | null
          total_comprado?: number | null
          total_pedidos?: number | null
          total_pedidos_consolidados?: number | null
          total_pedidos_nao_consolidados?: number | null
          updated_at?: string | null
          updated_by?: string | null
          whatsapp?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          cnpj_validado?: boolean | null
          complemento?: string | null
          created_at?: string | null
          created_by?: string | null
          data_aniversario?: string | null
          data_cadastro?: string | null
          data_primeira_compra?: string | null
          data_ultima_compra?: string | null
          dia_vencimento?: number | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          estrelas?: number | null
          forma_pagamento?: string | null
          hotel_classificacao?: string | null
          hotel_leitos?: number | null
          hotel_leitos_acessiveis?: number | null
          hotel_perfil?: string | null
          hotel_tem_spa?: boolean | null
          hotel_tipo?: string | null
          hotel_uhs?: number | null
          hotel_uhs_acessiveis?: number | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_estadual_tipo?: string | null
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          pais?: string | null
          pessoa_tipo?: string
          porte?: string | null
          qtd_comprada?: number | null
          qtd_orcada?: number | null
          razao_social?: string
          relacao_comercial?: string | null
          segmento?: string[] | null
          segmento_id?: string | null
          site?: string | null
          status?: string | null
          status_prospeccao?: string | null
          tags?: string[] | null
          telefone?: string | null
          ticket_medio?: number | null
          tipo?: string | null
          total_comprado?: number | null
          total_pedidos?: number | null
          total_pedidos_consolidados?: number | null
          total_pedidos_nao_consolidados?: number | null
          updated_at?: string | null
          updated_by?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_segmento_id_fkey"
            columns: ["segmento_id"]
            isOneToOne: false
            referencedRelation: "segmentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes_contatos: {
        Row: {
          cargo: string | null
          cliente_id: string | null
          created_at: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          principal: boolean | null
          telefone: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          cargo?: string | null
          cliente_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          principal?: boolean | null
          telefone?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          cargo?: string | null
          cliente_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          principal?: boolean | null
          telefone?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_contatos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          ativo: boolean
          cargo: string | null
          created_at: string
          gestao: string | null
          id: string
          nome: string
          percentual_todas_vendas: number
          percentual_vendas_proprias: number
          tipo: string
          updated_at: string
          user_id: string | null
          valor_fixo: number
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          gestao?: string | null
          id?: string
          nome: string
          percentual_todas_vendas?: number
          percentual_vendas_proprias?: number
          tipo?: string
          updated_at?: string
          user_id?: string | null
          valor_fixo?: number
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          gestao?: string | null
          id?: string
          nome?: string
          percentual_todas_vendas?: number
          percentual_vendas_proprias?: number
          tipo?: string
          updated_at?: string
          user_id?: string | null
          valor_fixo?: number
        }
        Relationships: []
      }
      configuracoes_email: {
        Row: {
          ativo: boolean | null
          email_remetente: string | null
          id: string
          nome_remetente: string | null
          senha_smtp: string | null
          smtp_host: string | null
          smtp_port: number | null
        }
        Insert: {
          ativo?: boolean | null
          email_remetente?: string | null
          id?: string
          nome_remetente?: string | null
          senha_smtp?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
        }
        Update: {
          ativo?: boolean | null
          email_remetente?: string | null
          id?: string
          nome_remetente?: string | null
          senha_smtp?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
        }
        Relationships: []
      }
      configuracoes_gestao: {
        Row: {
          comissao_pct: number
          created_at: string | null
          gestao: string
          id: string
          updated_at: string | null
        }
        Insert: {
          comissao_pct?: number
          created_at?: string | null
          gestao: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          comissao_pct?: number
          created_at?: string | null
          gestao?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      configuracoes_ia_atendimento: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          gestao: string
          id: string
          prompt_sistema: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          gestao: string
          id?: string
          prompt_sistema?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          gestao?: string
          id?: string
          prompt_sistema?: string | null
        }
        Relationships: []
      }
      contas_pagar: {
        Row: {
          categoria_despesa: string | null
          created_at: string | null
          data_emissao: string | null
          data_pagamento: string | null
          data_vencimento: string
          forma_pagamento: string | null
          fornecedor_id: string | null
          id: string
          numero_documento: string | null
          observacoes: string | null
          status: string | null
          tipo_documento: string | null
          updated_at: string | null
          valor_desconto: number | null
          valor_juros: number | null
          valor_original: number
          valor_pago: number | null
          valor_saldo: number
        }
        Insert: {
          categoria_despesa?: string | null
          created_at?: string | null
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          numero_documento?: string | null
          observacoes?: string | null
          status?: string | null
          tipo_documento?: string | null
          updated_at?: string | null
          valor_desconto?: number | null
          valor_juros?: number | null
          valor_original: number
          valor_pago?: number | null
          valor_saldo: number
        }
        Update: {
          categoria_despesa?: string | null
          created_at?: string | null
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          numero_documento?: string | null
          observacoes?: string | null
          status?: string | null
          tipo_documento?: string | null
          updated_at?: string | null
          valor_desconto?: number | null
          valor_juros?: number | null
          valor_original?: number
          valor_pago?: number | null
          valor_saldo?: number
        }
        Relationships: []
      }
      contas_receber: {
        Row: {
          cliente_id: string
          created_at: string | null
          data_emissao: string | null
          data_pagamento: string | null
          data_vencimento: string
          forma_pagamento: string | null
          id: string
          numero_documento: string | null
          observacoes: string | null
          pedido_id: string | null
          status: string | null
          tipo_documento: string | null
          updated_at: string | null
          valor_desconto: number | null
          valor_juros: number | null
          valor_original: number
          valor_pago: number | null
          valor_saldo: number
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          forma_pagamento?: string | null
          id?: string
          numero_documento?: string | null
          observacoes?: string | null
          pedido_id?: string | null
          status?: string | null
          tipo_documento?: string | null
          updated_at?: string | null
          valor_desconto?: number | null
          valor_juros?: number | null
          valor_original: number
          valor_pago?: number | null
          valor_saldo: number
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          forma_pagamento?: string | null
          id?: string
          numero_documento?: string | null
          observacoes?: string | null
          pedido_id?: string | null
          status?: string | null
          tipo_documento?: string | null
          updated_at?: string | null
          valor_desconto?: number | null
          valor_juros?: number | null
          valor_original?: number
          valor_pago?: number | null
          valor_saldo?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      contato_cliente: {
        Row: {
          cliente_id: string
          contato_id: string
          created_at: string
          id: string
        }
        Insert: {
          cliente_id: string
          contato_id: string
          created_at?: string
          id?: string
        }
        Update: {
          cliente_id?: string
          contato_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contato_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contato_cliente_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      contato_whatsapp: {
        Row: {
          contato_id: string
          contato_whatsapp_id: string
          created_at: string
          id: string
        }
        Insert: {
          contato_id: string
          contato_whatsapp_id: string
          created_at?: string
          id?: string
        }
        Update: {
          contato_id?: string
          contato_whatsapp_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contato_whatsapp_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contato_whatsapp_contato_whatsapp_id_fkey"
            columns: ["contato_whatsapp_id"]
            isOneToOne: false
            referencedRelation: "contatos_whatsapp"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos: {
        Row: {
          cargo: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string
          id: string
          nome: string | null
          observacoes: string | null
          origem: string | null
          preferencia_contato: string | null
          qualificacao: string
          status: string
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email: string
          id?: string
          nome?: string | null
          observacoes?: string | null
          origem?: string | null
          preferencia_contato?: string | null
          qualificacao?: string
          status?: string
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string
          id?: string
          nome?: string | null
          observacoes?: string | null
          origem?: string | null
          preferencia_contato?: string | null
          qualificacao?: string
          status?: string
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      contatos_cliente: {
        Row: {
          cliente_id: string
          created_at: string | null
          email: string | null
          id: string
          nome: string
          principal: boolean | null
          telefone: string | null
          whatsapp: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          nome: string
          principal?: boolean | null
          telefone?: string | null
          whatsapp?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          principal?: boolean | null
          telefone?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos_whatsapp: {
        Row: {
          atualizado_em: string
          canal_atribuido: string | null
          criado_em: string
          id: string
          nome: string | null
          origem_migracao: string | null
          telefone: string
          tipo: string
        }
        Insert: {
          atualizado_em?: string
          canal_atribuido?: string | null
          criado_em?: string
          id?: string
          nome?: string | null
          origem_migracao?: string | null
          telefone: string
          tipo?: string
        }
        Update: {
          atualizado_em?: string
          canal_atribuido?: string | null
          criado_em?: string
          id?: string
          nome?: string | null
          origem_migracao?: string | null
          telefone?: string
          tipo?: string
        }
        Relationships: []
      }
      crm_atividades: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          data_agendada: string | null
          data_realizada: string | null
          descricao: string | null
          duracao_minutos: number | null
          id: string
          oportunidade_id: string | null
          participantes: string[] | null
          proxima_acao: string | null
          responsavel_id: string | null
          resultado: string | null
          status: string | null
          tipo: string
          titulo: string | null
          updated_at: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          data_agendada?: string | null
          data_realizada?: string | null
          descricao?: string | null
          duracao_minutos?: number | null
          id?: string
          oportunidade_id?: string | null
          participantes?: string[] | null
          proxima_acao?: string | null
          responsavel_id?: string | null
          resultado?: string | null
          status?: string | null
          tipo: string
          titulo?: string | null
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          data_agendada?: string | null
          data_realizada?: string | null
          descricao?: string | null
          duracao_minutos?: number | null
          id?: string
          oportunidade_id?: string | null
          participantes?: string[] | null
          proxima_acao?: string | null
          responsavel_id?: string | null
          resultado?: string | null
          status?: string | null
          tipo?: string
          titulo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_atividades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_atividades_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "crm_oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_atividades_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_cards: {
        Row: {
          cliente_cidade: string | null
          cliente_cnpj: string | null
          cliente_estado: string | null
          cliente_id: string | null
          cliente_nome: string | null
          cliente_segmento: string | null
          contato_id: string | null
          created_at: string | null
          data_substituicao: string | null
          estagio: string
          gestao: string
          id: string
          interesse_cliente: string | null
          movido_para_estagio_em: string | null
          notas_gestor: string | null
          observacoes: string | null
          operacao: string
          operacao_nova: string | null
          oportunidade_id: string | null
          ordem: number | null
          prioridade: string | null
          proxima_acao: string | null
          substituida: boolean | null
          updated_at: string | null
        }
        Insert: {
          cliente_cidade?: string | null
          cliente_cnpj?: string | null
          cliente_estado?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          cliente_segmento?: string | null
          contato_id?: string | null
          created_at?: string | null
          data_substituicao?: string | null
          estagio?: string
          gestao: string
          id?: string
          interesse_cliente?: string | null
          movido_para_estagio_em?: string | null
          notas_gestor?: string | null
          observacoes?: string | null
          operacao: string
          operacao_nova?: string | null
          oportunidade_id?: string | null
          ordem?: number | null
          prioridade?: string | null
          proxima_acao?: string | null
          substituida?: boolean | null
          updated_at?: string | null
        }
        Update: {
          cliente_cidade?: string | null
          cliente_cnpj?: string | null
          cliente_estado?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          cliente_segmento?: string | null
          contato_id?: string | null
          created_at?: string | null
          data_substituicao?: string | null
          estagio?: string
          gestao?: string
          id?: string
          interesse_cliente?: string | null
          movido_para_estagio_em?: string | null
          notas_gestor?: string | null
          observacoes?: string | null
          operacao?: string
          operacao_nova?: string | null
          oportunidade_id?: string | null
          ordem?: number | null
          prioridade?: string | null
          proxima_acao?: string | null
          substituida?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_cards_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_cards_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_cards_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_estagios: {
        Row: {
          cor: string | null
          created_at: string | null
          id: string
          nome: string
          ordem: number
          probabilidade: number | null
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          id?: string
          nome: string
          ordem: number
          probabilidade?: number | null
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number
          probabilidade?: number | null
        }
        Relationships: []
      }
      crm_historico: {
        Row: {
          card_id: string | null
          created_at: string | null
          estagio_anterior: string | null
          estagio_novo: string
          id: string
          movido_por: string | null
        }
        Insert: {
          card_id?: string | null
          created_at?: string | null
          estagio_anterior?: string | null
          estagio_novo: string
          id?: string
          movido_por?: string | null
        }
        Update: {
          card_id?: string | null
          created_at?: string | null
          estagio_anterior?: string | null
          estagio_novo?: string
          id?: string
          movido_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_historico_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "crm_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_historico_movido_por_fkey"
            columns: ["movido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_oportunidades: {
        Row: {
          categoria_id: string | null
          cliente_id: string | null
          contato_id: string | null
          created_at: string | null
          data_criacao: string | null
          data_fechamento: string | null
          data_prevista_fechamento: string | null
          descricao: string | null
          estagio_id: string
          id: string
          motivo_perda: string | null
          probabilidade: number | null
          proximos_passos: string | null
          responsavel_id: string | null
          segmento_id: string | null
          status: string | null
          tags: string[] | null
          titulo: string
          updated_at: string | null
          valor_estimado: number | null
        }
        Insert: {
          categoria_id?: string | null
          cliente_id?: string | null
          contato_id?: string | null
          created_at?: string | null
          data_criacao?: string | null
          data_fechamento?: string | null
          data_prevista_fechamento?: string | null
          descricao?: string | null
          estagio_id: string
          id?: string
          motivo_perda?: string | null
          probabilidade?: number | null
          proximos_passos?: string | null
          responsavel_id?: string | null
          segmento_id?: string | null
          status?: string | null
          tags?: string[] | null
          titulo: string
          updated_at?: string | null
          valor_estimado?: number | null
        }
        Update: {
          categoria_id?: string | null
          cliente_id?: string | null
          contato_id?: string | null
          created_at?: string | null
          data_criacao?: string | null
          data_fechamento?: string | null
          data_prevista_fechamento?: string | null
          descricao?: string | null
          estagio_id?: string
          id?: string
          motivo_perda?: string | null
          probabilidade?: number | null
          proximos_passos?: string | null
          responsavel_id?: string | null
          segmento_id?: string | null
          status?: string | null
          tags?: string[] | null
          titulo?: string
          updated_at?: string | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_oportunidades_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidades_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "clientes_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidades_estagio_id_fkey"
            columns: ["estagio_id"]
            isOneToOne: false
            referencedRelation: "crm_estagios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidades_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidades_segmento_id_fkey"
            columns: ["segmento_id"]
            isOneToOne: false
            referencedRelation: "segmentos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_comerciais: {
        Row: {
          aprovado_em: string | null
          arquivo_nome: string | null
          arquivo_url: string | null
          card_id: string | null
          cliente_id: string | null
          conteudo: Json | null
          created_at: string | null
          criado_por: string | null
          enviado_em: string | null
          google_drive_id: string | null
          id: string
          moeda: string | null
          numero: string | null
          status: string | null
          tipo: string
          titulo: string
          updated_at: string | null
          valor_total: number | null
        }
        Insert: {
          aprovado_em?: string | null
          arquivo_nome?: string | null
          arquivo_url?: string | null
          card_id?: string | null
          cliente_id?: string | null
          conteudo?: Json | null
          created_at?: string | null
          criado_por?: string | null
          enviado_em?: string | null
          google_drive_id?: string | null
          id?: string
          moeda?: string | null
          numero?: string | null
          status?: string | null
          tipo: string
          titulo: string
          updated_at?: string | null
          valor_total?: number | null
        }
        Update: {
          aprovado_em?: string | null
          arquivo_nome?: string | null
          arquivo_url?: string | null
          card_id?: string | null
          cliente_id?: string | null
          conteudo?: Json | null
          created_at?: string | null
          criado_por?: string | null
          enviado_em?: string | null
          google_drive_id?: string | null
          id?: string
          moeda?: string | null
          numero?: string | null
          status?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string | null
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
          {
            foreignKeyName: "documentos_comerciais_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campanhas: {
        Row: {
          agendado_para: string | null
          assunto: string
          conteudo_html: string | null
          created_at: string | null
          enviado_em: string | null
          id: string
          lista_id: string | null
          nome: string
          pre_header: string | null
          recorrencia: Json | null
          remetente_email: string | null
          remetente_nome: string | null
          status: string | null
          template_tipo: string | null
          tipo_envio: string | null
          total_abertos: number | null
          total_bounces: number | null
          total_clicados: number | null
          total_descadastros: number | null
          total_destinatarios: number | null
          total_enviados: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agendado_para?: string | null
          assunto: string
          conteudo_html?: string | null
          created_at?: string | null
          enviado_em?: string | null
          id?: string
          lista_id?: string | null
          nome: string
          pre_header?: string | null
          recorrencia?: Json | null
          remetente_email?: string | null
          remetente_nome?: string | null
          status?: string | null
          template_tipo?: string | null
          tipo_envio?: string | null
          total_abertos?: number | null
          total_bounces?: number | null
          total_clicados?: number | null
          total_descadastros?: number | null
          total_destinatarios?: number | null
          total_enviados?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agendado_para?: string | null
          assunto?: string
          conteudo_html?: string | null
          created_at?: string | null
          enviado_em?: string | null
          id?: string
          lista_id?: string | null
          nome?: string
          pre_header?: string | null
          recorrencia?: Json | null
          remetente_email?: string | null
          remetente_nome?: string | null
          status?: string | null
          template_tipo?: string | null
          tipo_envio?: string | null
          total_abertos?: number | null
          total_bounces?: number | null
          total_clicados?: number | null
          total_descadastros?: number | null
          total_destinatarios?: number | null
          total_enviados?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campanhas_lista_id_fkey"
            columns: ["lista_id"]
            isOneToOne: false
            referencedRelation: "email_listas"
            referencedColumns: ["id"]
          },
        ]
      }
      email_envios: {
        Row: {
          aberto_em: string | null
          bounce_tipo: string | null
          campanha_id: string | null
          clicado_em: string | null
          cliente_id: string | null
          created_at: string | null
          email: string
          enviado_em: string | null
          erro_mensagem: string | null
          id: string
          nome_destinatario: string | null
          status: string | null
        }
        Insert: {
          aberto_em?: string | null
          bounce_tipo?: string | null
          campanha_id?: string | null
          clicado_em?: string | null
          cliente_id?: string | null
          created_at?: string | null
          email: string
          enviado_em?: string | null
          erro_mensagem?: string | null
          id?: string
          nome_destinatario?: string | null
          status?: string | null
        }
        Update: {
          aberto_em?: string | null
          bounce_tipo?: string | null
          campanha_id?: string | null
          clicado_em?: string | null
          cliente_id?: string | null
          created_at?: string | null
          email?: string
          enviado_em?: string | null
          erro_mensagem?: string | null
          id?: string
          nome_destinatario?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_envios_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "email_campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_envios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      email_listas: {
        Row: {
          created_at: string | null
          descricao: string | null
          filtros: Json | null
          id: string
          nome: string
          total_contatos: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          filtros?: Json | null
          id?: string
          nome: string
          total_contatos?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          filtros?: Json | null
          id?: string
          nome?: string
          total_contatos?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_receita_oficial: {
        Row: {
          carregado_em: string
          cnpj: string
          email: string | null
        }
        Insert: {
          carregado_em?: string
          cnpj: string
          email?: string | null
        }
        Update: {
          carregado_em?: string
          cnpj?: string
          email?: string | null
        }
        Relationships: []
      }
      empresa_enriquecimento: {
        Row: {
          cnpj: string
          endereco_google: string | null
          fetched_at: string
          fonte: string
          horario_funcionamento: Json | null
          lat: number | null
          lng: number | null
          place_id: string | null
          rating: number | null
          site: string | null
          telefone: string | null
          total_avaliacoes: number | null
        }
        Insert: {
          cnpj: string
          endereco_google?: string | null
          fetched_at?: string
          fonte?: string
          horario_funcionamento?: Json | null
          lat?: number | null
          lng?: number | null
          place_id?: string | null
          rating?: number | null
          site?: string | null
          telefone?: string | null
          total_avaliacoes?: number | null
        }
        Update: {
          cnpj?: string
          endereco_google?: string | null
          fetched_at?: string
          fonte?: string
          horario_funcionamento?: Json | null
          lat?: number | null
          lng?: number | null
          place_id?: string | null
          rating?: number | null
          site?: string | null
          telefone?: string | null
          total_avaliacoes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_enriquecimento_cnpj_fkey"
            columns: ["cnpj"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["cnpj"]
          },
        ]
      }
      empresa_socios: {
        Row: {
          cnpj_basico: string
          cpf_cnpj_socio: string | null
          created_at: string
          data_entrada: string | null
          faixa_etaria: string | null
          id: string
          linkedin_url: string | null
          nome: string | null
          qualificacao: string | null
        }
        Insert: {
          cnpj_basico: string
          cpf_cnpj_socio?: string | null
          created_at?: string
          data_entrada?: string | null
          faixa_etaria?: string | null
          id?: string
          linkedin_url?: string | null
          nome?: string | null
          qualificacao?: string | null
        }
        Update: {
          cnpj_basico?: string
          cpf_cnpj_socio?: string | null
          created_at?: string
          data_entrada?: string | null
          faixa_etaria?: string | null
          id?: string
          linkedin_url?: string | null
          nome?: string | null
          qualificacao?: string | null
        }
        Relationships: []
      }
      empresas: {
        Row: {
          bairro: string | null
          capital_social: number | null
          cep: string | null
          cnae_descricao: string | null
          cnae_principal: string | null
          cnaes_secundarios: string[] | null
          cnpj: string
          cnpj_basico: string
          complemento: string | null
          created_at: string
          data_inicio_atividade: string | null
          data_situacao: string | null
          ddd1: string | null
          ddd2: string | null
          email: string | null
          logradouro: string | null
          matriz_filial: string | null
          municipio: string | null
          municipio_ibge: string | null
          natureza_juridica: string | null
          natureza_juridica_codigo: string | null
          nome_fantasia: string | null
          numero: string | null
          opcao_mei: boolean | null
          opcao_simples: boolean | null
          porte: string | null
          razao_social: string | null
          segmento: string | null
          situacao_cadastral: string | null
          telefone1: string | null
          telefone2: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cnae_descricao?: string | null
          cnae_principal?: string | null
          cnaes_secundarios?: string[] | null
          cnpj: string
          cnpj_basico: string
          complemento?: string | null
          created_at?: string
          data_inicio_atividade?: string | null
          data_situacao?: string | null
          ddd1?: string | null
          ddd2?: string | null
          email?: string | null
          logradouro?: string | null
          matriz_filial?: string | null
          municipio?: string | null
          municipio_ibge?: string | null
          natureza_juridica?: string | null
          natureza_juridica_codigo?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          opcao_mei?: boolean | null
          opcao_simples?: boolean | null
          porte?: string | null
          razao_social?: string | null
          segmento?: string | null
          situacao_cadastral?: string | null
          telefone1?: string | null
          telefone2?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cnae_descricao?: string | null
          cnae_principal?: string | null
          cnaes_secundarios?: string[] | null
          cnpj?: string
          cnpj_basico?: string
          complemento?: string | null
          created_at?: string
          data_inicio_atividade?: string | null
          data_situacao?: string | null
          ddd1?: string | null
          ddd2?: string | null
          email?: string | null
          logradouro?: string | null
          matriz_filial?: string | null
          municipio?: string | null
          municipio_ibge?: string | null
          natureza_juridica?: string | null
          natureza_juridica_codigo?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          opcao_mei?: boolean | null
          opcao_simples?: boolean | null
          porte?: string | null
          razao_social?: string | null
          segmento?: string | null
          situacao_cadastral?: string | null
          telefone1?: string | null
          telefone2?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          a_receber: number | null
          bairro: string | null
          catalogos: Json | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          codigo: string | null
          comissao_vendas: number | null
          complemento: string | null
          condicoes_pagamento: Json | null
          condicoes_pagamento_padrao: string | null
          contatos: Json | null
          contrato: string | null
          created_at: string | null
          data_inicio: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          frete_tipo_padrao: string | null
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
          razao_social: string | null
          segmentos_atuacao: string[] | null
          site: string | null
          site_2: string | null
          status: string | null
          telefone: string | null
          termos_fabricante: string | null
          tipo: string | null
          tipo_layout: string | null
          updated_at: string | null
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
          cnpj?: string | null
          codigo?: string | null
          comissao_vendas?: number | null
          complemento?: string | null
          condicoes_pagamento?: Json | null
          condicoes_pagamento_padrao?: string | null
          contatos?: Json | null
          contrato?: string | null
          created_at?: string | null
          data_inicio?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          frete_tipo_padrao?: string | null
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
          razao_social?: string | null
          segmentos_atuacao?: string[] | null
          site?: string | null
          site_2?: string | null
          status?: string | null
          telefone?: string | null
          termos_fabricante?: string | null
          tipo?: string | null
          tipo_layout?: string | null
          updated_at?: string | null
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
          cnpj?: string | null
          codigo?: string | null
          comissao_vendas?: number | null
          complemento?: string | null
          condicoes_pagamento?: Json | null
          condicoes_pagamento_padrao?: string | null
          contatos?: Json | null
          contrato?: string | null
          created_at?: string | null
          data_inicio?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          frete_tipo_padrao?: string | null
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
          razao_social?: string | null
          segmentos_atuacao?: string[] | null
          site?: string | null
          site_2?: string | null
          status?: string | null
          telefone?: string | null
          termos_fabricante?: string | null
          tipo?: string | null
          tipo_layout?: string | null
          updated_at?: string | null
          validade_dias_padrao?: number | null
          venda_media?: number | null
          volume_orcamentos?: number | null
          volume_vendas?: number | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      fornecedores_contatos: {
        Row: {
          cargo: string | null
          created_at: string | null
          email: string | null
          fornecedor_id: string | null
          id: string
          nome: string
          principal: boolean | null
          telefone: string | null
        }
        Insert: {
          cargo?: string | null
          created_at?: string | null
          email?: string | null
          fornecedor_id?: string | null
          id?: string
          nome: string
          principal?: boolean | null
          telefone?: string | null
        }
        Update: {
          cargo?: string | null
          created_at?: string | null
          email?: string | null
          fornecedor_id?: string | null
          id?: string
          nome?: string
          principal?: boolean | null
          telefone?: string | null
        }
        Relationships: []
      }
      ia_insights: {
        Row: {
          acao_automatica: boolean | null
          acao_sugerida: string | null
          cliente_id: string | null
          created_at: string | null
          data_expiracao: string | null
          descricao: string
          feedback_usuario: string | null
          id: string
          impacto_estimado: number | null
          modulo: string
          oportunidade_id: string | null
          orcamento_id: string | null
          prioridade: string | null
          status: string | null
          tipo: string
          titulo: string
          updated_at: string | null
          util: boolean | null
        }
        Insert: {
          acao_automatica?: boolean | null
          acao_sugerida?: string | null
          cliente_id?: string | null
          created_at?: string | null
          data_expiracao?: string | null
          descricao: string
          feedback_usuario?: string | null
          id?: string
          impacto_estimado?: number | null
          modulo: string
          oportunidade_id?: string | null
          orcamento_id?: string | null
          prioridade?: string | null
          status?: string | null
          tipo: string
          titulo: string
          updated_at?: string | null
          util?: boolean | null
        }
        Update: {
          acao_automatica?: boolean | null
          acao_sugerida?: string | null
          cliente_id?: string | null
          created_at?: string | null
          data_expiracao?: string | null
          descricao?: string
          feedback_usuario?: string | null
          id?: string
          impacto_estimado?: number | null
          modulo?: string
          oportunidade_id?: string | null
          orcamento_id?: string | null
          prioridade?: string | null
          status?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string | null
          util?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_insights_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_insights_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "crm_oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_insights_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_financeiros: {
        Row: {
          card_id: string | null
          categoria: string
          categoria_id: string | null
          colaborador_id: string | null
          created_at: string
          created_by: string | null
          data_competencia: string
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string | null
          fornecedor_id: string | null
          frequencia: string | null
          id: string
          observacoes: string | null
          orcamento_id: string | null
          origem: string
          percentual: number | null
          recorrente: boolean
          status: string
          tipo: string
          updated_at: string
          valor: number
          valor_base: number | null
        }
        Insert: {
          card_id?: string | null
          categoria: string
          categoria_id?: string | null
          colaborador_id?: string | null
          created_at?: string
          created_by?: string | null
          data_competencia: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          fornecedor_id?: string | null
          frequencia?: string | null
          id?: string
          observacoes?: string | null
          orcamento_id?: string | null
          origem?: string
          percentual?: number | null
          recorrente?: boolean
          status?: string
          tipo: string
          updated_at?: string
          valor: number
          valor_base?: number | null
        }
        Update: {
          card_id?: string | null
          categoria?: string
          categoria_id?: string | null
          colaborador_id?: string | null
          created_at?: string
          created_by?: string | null
          data_competencia?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          fornecedor_id?: string | null
          frequencia?: string | null
          id?: string
          observacoes?: string | null
          orcamento_id?: string | null
          origem?: string
          percentual?: number | null
          recorrente?: boolean
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
          valor_base?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_financeiros_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "crm_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          campanha_origem: string | null
          categoria_interesse: string[] | null
          cidade: string | null
          cliente_convertido_id: string | null
          created_at: string | null
          data_conversao: string | null
          email: string | null
          estado: string | null
          id: string
          nome_contato: string | null
          nome_empresa: string
          observacoes: string | null
          origem: string | null
          porte: string | null
          potencial: string | null
          responsavel_id: string | null
          score: number | null
          segmento_id: string | null
          status: string | null
          tags: string[] | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          campanha_origem?: string | null
          categoria_interesse?: string[] | null
          cidade?: string | null
          cliente_convertido_id?: string | null
          created_at?: string | null
          data_conversao?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          nome_contato?: string | null
          nome_empresa: string
          observacoes?: string | null
          origem?: string | null
          porte?: string | null
          potencial?: string | null
          responsavel_id?: string | null
          score?: number | null
          segmento_id?: string | null
          status?: string | null
          tags?: string[] | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          campanha_origem?: string | null
          categoria_interesse?: string[] | null
          cidade?: string | null
          cliente_convertido_id?: string | null
          created_at?: string | null
          data_conversao?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          nome_contato?: string | null
          nome_empresa?: string
          observacoes?: string | null
          origem?: string | null
          porte?: string | null
          potencial?: string | null
          responsavel_id?: string | null
          score?: number | null
          segmento_id?: string | null
          status?: string | null
          tags?: string[] | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_campanha_origem_fkey"
            columns: ["campanha_origem"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_cliente_convertido_id_fkey"
            columns: ["cliente_convertido_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_segmento_id_fkey"
            columns: ["segmento_id"]
            isOneToOne: false
            referencedRelation: "segmentos"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_midias: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          ordem: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          ordem?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mensagens: {
        Row: {
          chat_id: string
          conteudo: string
          criado_em: string
          duracao_segundos: number | null
          id: string
          lida: boolean
          media_url: string | null
          multi360_msg_id: number | null
          origem: string
          tipo: string
        }
        Insert: {
          chat_id: string
          conteudo: string
          criado_em?: string
          duracao_segundos?: number | null
          id?: string
          lida?: boolean
          media_url?: string | null
          multi360_msg_id?: number | null
          origem: string
          tipo?: string
        }
        Update: {
          chat_id?: string
          conteudo?: string
          criado_em?: string
          duracao_segundos?: number | null
          id?: string
          lida?: boolean
          media_url?: string | null
          multi360_msg_id?: number | null
          origem?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "v_chat_por_telefone"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_rapidas: {
        Row: {
          atalho: string
          ativo: boolean
          canal: string | null
          conteudo: string
          criado_em: string
          id: string
          titulo: string
        }
        Insert: {
          atalho: string
          ativo?: boolean
          canal?: string | null
          conteudo: string
          criado_em?: string
          id?: string
          titulo: string
        }
        Update: {
          atalho?: string
          ativo?: boolean
          canal?: string | null
          conteudo?: string
          criado_em?: string
          id?: string
          titulo?: string
        }
        Relationships: []
      }
      metas_empresa: {
        Row: {
          ativo: boolean
          created_at: string
          data_fim: string
          data_inicio: string
          descricao: string | null
          gestao: string | null
          id: string
          periodo_tipo: string
          tipo: string
          titulo: string
          unidade: string
          updated_at: string
          valor_meta: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_fim: string
          data_inicio: string
          descricao?: string | null
          gestao?: string | null
          id?: string
          periodo_tipo?: string
          tipo: string
          titulo: string
          unidade?: string
          updated_at?: string
          valor_meta: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          gestao?: string | null
          id?: string
          periodo_tipo?: string
          tipo?: string
          titulo?: string
          unidade?: string
          updated_at?: string
          valor_meta?: number
        }
        Relationships: []
      }
      oportunidades: {
        Row: {
          cliente_id: string | null
          contato_id: string | null
          created_at: string | null
          gestao: string
          id: string
          numero: string
          observacoes: string | null
          operacao: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          cliente_id?: string | null
          contato_id?: string | null
          created_at?: string | null
          gestao: string
          id?: string
          numero: string
          observacoes?: string | null
          operacao: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string | null
          contato_id?: string | null
          created_at?: string | null
          gestao?: string
          id?: string
          numero?: string
          observacoes?: string | null
          operacao?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_contato: {
        Row: {
          contato_id: string
          created_at: string
          id: string
          orcamento_id: string
          principal: boolean
        }
        Insert: {
          contato_id: string
          created_at?: string
          id?: string
          orcamento_id: string
          principal?: boolean
        }
        Update: {
          contato_id?: string
          created_at?: string
          id?: string
          orcamento_id?: string
          principal?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_contato_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_contato_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_itens: {
        Row: {
          codigo: string | null
          created_at: string | null
          descricao: string
          especificacoes: string | null
          id: string
          medidas: string | null
          orcamento_id: string | null
          ordem: number | null
          preco_unitario: number
          quantidade: number
          total: number
        }
        Insert: {
          codigo?: string | null
          created_at?: string | null
          descricao: string
          especificacoes?: string | null
          id?: string
          medidas?: string | null
          orcamento_id?: string | null
          ordem?: number | null
          preco_unitario: number
          quantidade: number
          total: number
        }
        Update: {
          codigo?: string | null
          created_at?: string | null
          descricao?: string
          especificacoes?: string | null
          id?: string
          medidas?: string | null
          orcamento_id?: string | null
          ordem?: number | null
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
          arquivo_pdf: string | null
          assinado_em: string | null
          assinatura_cliente: string | null
          card_id: string | null
          categoria_id: string | null
          cliente_bairro: string | null
          cliente_cep: string | null
          cliente_cidade: string | null
          cliente_cnpj: string | null
          cliente_complemento: string | null
          cliente_email: string | null
          cliente_endereco: string | null
          cliente_estado: string | null
          cliente_id: string
          cliente_logradouro: string | null
          cliente_nome: string | null
          cliente_numero: string | null
          cliente_razao_social: string | null
          cliente_telefone: string | null
          codigo_empresa: string | null
          condicoes_gerais: string | null
          condicoes_pagamento: Json | null
          contato_id: string | null
          created_at: string | null
          data_aprovacao: string | null
          data_emissao: string | null
          data_envio: string | null
          data_validade: string | null
          desconto: number | null
          desconto_percentual: number | null
          desconto_valor: number | null
          difal_texto: string | null
          enviado_em: string | null
          forma_pagamento: string | null
          fornecedor_id: string | null
          fornecedor_nome: string | null
          frete: number | null
          frete_tipo: string | null
          gestao: string | null
          id: string
          imagem_marketing_url: string | null
          imagem_publicidade_url: string | null
          impostos: number | null
          impostos_percentual: number | null
          margem_percentual: number | null
          numero: string
          observacoes: string | null
          observacoes_gerais: string | null
          observacoes_internas: string | null
          operacao: string | null
          oportunidade_id: string | null
          pdf_url: string | null
          percentual_desconto: number | null
          prazo_entrega: string | null
          status: string | null
          subtotal: number | null
          termos_3w: string | null
          termos_fornecedor: string | null
          total: number | null
          updated_at: string | null
          validade_dias: number | null
          valor_desconto: number | null
          valor_frete: number | null
          valor_produtos: number | null
          valor_total: number | null
          vendedor_id: string | null
        }
        Insert: {
          arquivo_pdf?: string | null
          assinado_em?: string | null
          assinatura_cliente?: string | null
          card_id?: string | null
          categoria_id?: string | null
          cliente_bairro?: string | null
          cliente_cep?: string | null
          cliente_cidade?: string | null
          cliente_cnpj?: string | null
          cliente_complemento?: string | null
          cliente_email?: string | null
          cliente_endereco?: string | null
          cliente_estado?: string | null
          cliente_id: string
          cliente_logradouro?: string | null
          cliente_nome?: string | null
          cliente_numero?: string | null
          cliente_razao_social?: string | null
          cliente_telefone?: string | null
          codigo_empresa?: string | null
          condicoes_gerais?: string | null
          condicoes_pagamento?: Json | null
          contato_id?: string | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_emissao?: string | null
          data_envio?: string | null
          data_validade?: string | null
          desconto?: number | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          difal_texto?: string | null
          enviado_em?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          frete?: number | null
          frete_tipo?: string | null
          gestao?: string | null
          id?: string
          imagem_marketing_url?: string | null
          imagem_publicidade_url?: string | null
          impostos?: number | null
          impostos_percentual?: number | null
          margem_percentual?: number | null
          numero: string
          observacoes?: string | null
          observacoes_gerais?: string | null
          observacoes_internas?: string | null
          operacao?: string | null
          oportunidade_id?: string | null
          pdf_url?: string | null
          percentual_desconto?: number | null
          prazo_entrega?: string | null
          status?: string | null
          subtotal?: number | null
          termos_3w?: string | null
          termos_fornecedor?: string | null
          total?: number | null
          updated_at?: string | null
          validade_dias?: number | null
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_produtos?: number | null
          valor_total?: number | null
          vendedor_id?: string | null
        }
        Update: {
          arquivo_pdf?: string | null
          assinado_em?: string | null
          assinatura_cliente?: string | null
          card_id?: string | null
          categoria_id?: string | null
          cliente_bairro?: string | null
          cliente_cep?: string | null
          cliente_cidade?: string | null
          cliente_cnpj?: string | null
          cliente_complemento?: string | null
          cliente_email?: string | null
          cliente_endereco?: string | null
          cliente_estado?: string | null
          cliente_id?: string
          cliente_logradouro?: string | null
          cliente_nome?: string | null
          cliente_numero?: string | null
          cliente_razao_social?: string | null
          cliente_telefone?: string | null
          codigo_empresa?: string | null
          condicoes_gerais?: string | null
          condicoes_pagamento?: Json | null
          contato_id?: string | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_emissao?: string | null
          data_envio?: string | null
          data_validade?: string | null
          desconto?: number | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          difal_texto?: string | null
          enviado_em?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          frete?: number | null
          frete_tipo?: string | null
          gestao?: string | null
          id?: string
          imagem_marketing_url?: string | null
          imagem_publicidade_url?: string | null
          impostos?: number | null
          impostos_percentual?: number | null
          margem_percentual?: number | null
          numero?: string
          observacoes?: string | null
          observacoes_gerais?: string | null
          observacoes_internas?: string | null
          operacao?: string | null
          oportunidade_id?: string | null
          pdf_url?: string | null
          percentual_desconto?: number | null
          prazo_entrega?: string | null
          status?: string | null
          subtotal?: number | null
          termos_3w?: string | null
          termos_fornecedor?: string | null
          total?: number | null
          updated_at?: string | null
          validade_dias?: number | null
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_produtos?: number | null
          valor_total?: number | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "clientes_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos_itens: {
        Row: {
          codigo: string | null
          created_at: string | null
          desconto_percentual: number | null
          desconto_valor: number | null
          descricao: string
          fornecedor_id: string | null
          id: string
          margem_percentual: number | null
          observacoes: string | null
          orcamento_id: string | null
          ordem: number | null
          preco_custo: number | null
          preco_final: number
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          unidade: string | null
          valor_total: number
        }
        Insert: {
          codigo?: string | null
          created_at?: string | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          descricao: string
          fornecedor_id?: string | null
          id?: string
          margem_percentual?: number | null
          observacoes?: string | null
          orcamento_id?: string | null
          ordem?: number | null
          preco_custo?: number | null
          preco_final: number
          preco_unitario: number
          produto_id?: string | null
          quantidade: number
          unidade?: string | null
          valor_total: number
        }
        Update: {
          codigo?: string | null
          created_at?: string | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          descricao?: string
          fornecedor_id?: string | null
          id?: string
          margem_percentual?: number | null
          observacoes?: string | null
          orcamento_id?: string | null
          ordem?: number | null
          preco_custo?: number | null
          preco_final?: number
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          unidade?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cliente_id: string
          codigo_rastreio: string | null
          condicoes_pagamento: string | null
          created_at: string | null
          data_confirmacao: string | null
          data_entrega: string | null
          data_pedido: string | null
          data_prevista_entrega: string | null
          endereco_entrega: Json | null
          forma_pagamento: string | null
          id: string
          numero: string
          observacoes: string | null
          orcamento_id: string | null
          prazo_entrega: string | null
          status: string | null
          transportadora: string | null
          updated_at: string | null
          valor_desconto: number | null
          valor_frete: number | null
          valor_produtos: number | null
          valor_total: number | null
          vendedor_id: string | null
        }
        Insert: {
          cliente_id: string
          codigo_rastreio?: string | null
          condicoes_pagamento?: string | null
          created_at?: string | null
          data_confirmacao?: string | null
          data_entrega?: string | null
          data_pedido?: string | null
          data_prevista_entrega?: string | null
          endereco_entrega?: Json | null
          forma_pagamento?: string | null
          id?: string
          numero: string
          observacoes?: string | null
          orcamento_id?: string | null
          prazo_entrega?: string | null
          status?: string | null
          transportadora?: string | null
          updated_at?: string | null
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_produtos?: number | null
          valor_total?: number | null
          vendedor_id?: string | null
        }
        Update: {
          cliente_id?: string
          codigo_rastreio?: string | null
          condicoes_pagamento?: string | null
          created_at?: string | null
          data_confirmacao?: string | null
          data_entrega?: string | null
          data_pedido?: string | null
          data_prevista_entrega?: string | null
          endereco_entrega?: Json | null
          forma_pagamento?: string | null
          id?: string
          numero?: string
          observacoes?: string | null
          orcamento_id?: string | null
          prazo_entrega?: string | null
          status?: string | null
          transportadora?: string | null
          updated_at?: string | null
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_produtos?: number | null
          valor_total?: number | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_itens: {
        Row: {
          created_at: string | null
          descricao: string
          fornecedor_id: string | null
          id: string
          pedido_id: string | null
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          status_item: string | null
          unidade: string | null
          valor_total: number
        }
        Insert: {
          created_at?: string | null
          descricao: string
          fornecedor_id?: string | null
          id?: string
          pedido_id?: string | null
          preco_unitario: number
          produto_id?: string | null
          quantidade: number
          status_item?: string | null
          unidade?: string | null
          valor_total: number
        }
        Update: {
          created_at?: string | null
          descricao?: string
          fornecedor_id?: string | null
          id?: string
          pedido_id?: string | null
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          status_item?: string | null
          unidade?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean | null
          categoria_id: string | null
          codigo: string | null
          controla_estoque: boolean | null
          created_at: string | null
          descricao: string | null
          destaque: boolean | null
          especificacoes: Json | null
          estoque_atual: number | null
          estoque_minimo: number | null
          fornecedor_principal_id: string | null
          fornecedores_alternativos: string[] | null
          id: string
          imagem_principal: string | null
          imagens: string[] | null
          margem_sugerida: number | null
          nome: string
          palavras_chave: string | null
          preco_custo: number | null
          preco_venda: number | null
          subcategoria: string | null
          tags: string[] | null
          unidade_medida: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria_id?: string | null
          codigo?: string | null
          controla_estoque?: boolean | null
          created_at?: string | null
          descricao?: string | null
          destaque?: boolean | null
          especificacoes?: Json | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fornecedor_principal_id?: string | null
          fornecedores_alternativos?: string[] | null
          id?: string
          imagem_principal?: string | null
          imagens?: string[] | null
          margem_sugerida?: number | null
          nome: string
          palavras_chave?: string | null
          preco_custo?: number | null
          preco_venda?: number | null
          subcategoria?: string | null
          tags?: string[] | null
          unidade_medida?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria_id?: string | null
          codigo?: string | null
          controla_estoque?: boolean | null
          created_at?: string | null
          descricao?: string | null
          destaque?: boolean | null
          especificacoes?: Json | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fornecedor_principal_id?: string | null
          fornecedores_alternativos?: string[] | null
          id?: string
          imagem_principal?: string | null
          imagens?: string[] | null
          margem_sugerida?: number | null
          nome?: string
          palavras_chave?: string | null
          preco_custo?: number | null
          preco_venda?: number | null
          subcategoria?: string | null
          tags?: string[] | null
          unidade_medida?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_castor: {
        Row: {
          altura: number | null
          codigo: string
          created_at: string | null
          descricao: string
          especificacao: string | null
          id: string
          linha: string
          updated_at: string | null
        }
        Insert: {
          altura?: number | null
          codigo: string
          created_at?: string | null
          descricao: string
          especificacao?: string | null
          id?: string
          linha?: string
          updated_at?: string | null
        }
        Update: {
          altura?: number | null
          codigo?: string
          created_at?: string | null
          descricao?: string
          especificacao?: string | null
          id?: string
          linha?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      produtos_castor_precos: {
        Row: {
          created_at: string | null
          id: string
          medida: string
          preco: number
          produto_codigo: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          medida: string
          preco: number
          produto_codigo?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          medida?: string
          preco?: number
          produto_codigo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_castor_precos_produto_codigo_fkey"
            columns: ["produto_codigo"]
            isOneToOne: false
            referencedRelation: "produtos_castor"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "produtos_castor_precos_produto_codigo_fkey"
            columns: ["produto_codigo"]
            isOneToOne: false
            referencedRelation: "produtos_castor_view"
            referencedColumns: ["codigo"]
          },
        ]
      }
      ref_cnae: {
        Row: {
          codigo: string
          descricao: string | null
        }
        Insert: {
          codigo: string
          descricao?: string | null
        }
        Update: {
          codigo?: string
          descricao?: string | null
        }
        Relationships: []
      }
      ref_municipio: {
        Row: {
          codigo: string
          nome: string | null
          uf: string | null
        }
        Insert: {
          codigo: string
          nome?: string | null
          uf?: string | null
        }
        Update: {
          codigo?: string
          nome?: string | null
          uf?: string | null
        }
        Relationships: []
      }
      segmentos: {
        Row: {
          created_at: string | null
          icone: string | null
          id: string
          nome: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          icone?: string | null
          id?: string
          nome: string
          slug: string
        }
        Update: {
          created_at?: string | null
          icone?: string | null
          id?: string
          nome?: string
          slug?: string
        }
        Relationships: []
      }
      tags_atendimento: {
        Row: {
          cor: string
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          cor?: string
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          cor?: string
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          cliente_id: string | null
          cliente_nome: string | null
          concluida: boolean
          concluida_em: string | null
          created_at: string
          criado_por: string
          data: string | null
          hora: string | null
          id: string
          observacoes: string | null
          oportunidade_id: string | null
          responsavel_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          cliente_nome?: string | null
          concluida?: boolean
          concluida_em?: string | null
          created_at?: string
          criado_por: string
          data?: string | null
          hora?: string | null
          id?: string
          observacoes?: string | null
          oportunidade_id?: string | null
          responsavel_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          cliente_nome?: string | null
          concluida?: boolean
          concluida_em?: string | null
          created_at?: string
          criado_por?: string
          data?: string | null
          hora?: string | null
          id?: string
          observacoes?: string | null
          oportunidade_id?: string | null
          responsavel_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assunto: string
          atribuido_a: string | null
          avaliacao: number | null
          categoria_id: string | null
          cliente_id: string | null
          comentario_avaliacao: string | null
          contato_id: string | null
          created_at: string | null
          data_abertura: string | null
          data_fechamento: string | null
          data_primeira_resposta: string | null
          data_resolucao: string | null
          departamento: string | null
          descricao: string | null
          id: string
          numero: string
          orcamento_id: string | null
          pedido_id: string | null
          prazo_sla: string | null
          prioridade: string | null
          status: string | null
          tags: string[] | null
          tempo_primeira_resposta: number | null
          tempo_resolucao: number | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          assunto: string
          atribuido_a?: string | null
          avaliacao?: number | null
          categoria_id?: string | null
          cliente_id?: string | null
          comentario_avaliacao?: string | null
          contato_id?: string | null
          created_at?: string | null
          data_abertura?: string | null
          data_fechamento?: string | null
          data_primeira_resposta?: string | null
          data_resolucao?: string | null
          departamento?: string | null
          descricao?: string | null
          id?: string
          numero: string
          orcamento_id?: string | null
          pedido_id?: string | null
          prazo_sla?: string | null
          prioridade?: string | null
          status?: string | null
          tags?: string[] | null
          tempo_primeira_resposta?: number | null
          tempo_resolucao?: number | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          assunto?: string
          atribuido_a?: string | null
          avaliacao?: number | null
          categoria_id?: string | null
          cliente_id?: string | null
          comentario_avaliacao?: string | null
          contato_id?: string | null
          created_at?: string | null
          data_abertura?: string | null
          data_fechamento?: string | null
          data_primeira_resposta?: string | null
          data_resolucao?: string | null
          departamento?: string | null
          descricao?: string | null
          id?: string
          numero?: string
          orcamento_id?: string | null
          pedido_id?: string | null
          prazo_sla?: string | null
          prioridade?: string | null
          status?: string | null
          tags?: string[] | null
          tempo_primeira_resposta?: number | null
          tempo_resolucao?: number | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_atribuido_a_fkey"
            columns: ["atribuido_a"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "clientes_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets_interacoes: {
        Row: {
          anexos: string[] | null
          created_at: string | null
          id: string
          mensagem: string | null
          publico: boolean | null
          ticket_id: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          anexos?: string[] | null
          created_at?: string | null
          id?: string
          mensagem?: string | null
          publico?: boolean | null
          ticket_id?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          anexos?: string[] | null
          created_at?: string | null
          id?: string
          mensagem?: string | null
          publico?: boolean | null
          ticket_id?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_interacoes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_interacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          gestao: string | null
          id: string
          modulos: string[]
          nome: string
          role: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          gestao?: string | null
          id: string
          modulos?: string[]
          nome?: string
          role?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          gestao?: string | null
          id?: string
          modulos?: string[]
          nome?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          cargo: string | null
          configuracoes: Json | null
          created_at: string | null
          departamento: string | null
          email: string
          id: string
          nome_completo: string
          role: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          cargo?: string | null
          configuracoes?: Json | null
          created_at?: string | null
          departamento?: string | null
          email: string
          id: string
          nome_completo: string
          role?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          cargo?: string | null
          configuracoes?: Json | null
          created_at?: string | null
          departamento?: string | null
          email?: string
          id?: string
          nome_completo?: string
          role?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      usuarios_email_config: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          email: string
          host: string | null
          id: string
          port: number | null
          secure: boolean | null
          senha_smtp: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          email: string
          host?: string | null
          id?: string
          port?: number | null
          secure?: boolean | null
          senha_smtp: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string
          host?: string | null
          id?: string
          port?: number | null
          secure?: boolean | null
          senha_smtp?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      produtos_castor_view: {
        Row: {
          altura: number | null
          codigo: string | null
          descricao: string | null
          especificacao: string | null
          id: string | null
          linha: string | null
          medidas_disponiveis: string[] | null
          medidas_precos: Json | null
        }
        Relationships: []
      }
      v_chat_por_telefone: {
        Row: {
          atualizado_em: string | null
          canal: string | null
          contato_id: string | null
          criado_em: string | null
          ia_ativa: boolean | null
          id: string | null
          nome: string | null
          status: string | null
          telefone: string | null
          ultima_mensagem_em: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos_whatsapp"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      contar_contatos_vinculados: { Args: never; Returns: number }
      formatar_cnpj: { Args: { cnpj: string }; Returns: string }
      formatar_telefone: { Args: { tel: string }; Returns: string }
      get_next_orcamento_numero: { Args: never; Returns: number }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
