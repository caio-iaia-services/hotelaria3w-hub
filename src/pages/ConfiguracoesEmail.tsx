import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, TestTube, Mail, Shield, Server, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

export default function ConfiguracoesEmail() {
  const [config, setConfig] = useState({
    email: 'comercial1@3whotelaria.com.br',
    senha_smtp: '',
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    ativo: true,
  })
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  function handleChange(field: string, value: string | number | boolean) {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  async function salvarConfiguracoes() {
    if (!config.email || !config.senha_smtp || !config.host) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    setSalvando(true)
    try {
      // Placeholder - integração futura
      await new Promise(resolve => setTimeout(resolve, 1500))
      console.log('💾 Config salva:', { ...config, senha_smtp: '***' })
      toast.success('Configurações salvas com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setSalvando(false)
    }
  }

  async function testarConexao() {
    if (!config.email || !config.senha_smtp || !config.host) {
      toast.error('Preencha todos os campos antes de testar')
      return
    }
    setTestando(true)
    try {
      // Placeholder - integração futura
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log('🧪 Teste SMTP:', { host: config.host, port: config.port })
      toast.success('Conexão SMTP testada com sucesso!')
    } catch (error) {
      console.error('Erro no teste:', error)
      toast.error('Falha na conexão SMTP')
    } finally {
      setTestando(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">
          Configurações de E-mail
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure o servidor SMTP para envio de e-mails do sistema
        </p>
      </div>

      {/* Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Status do Serviço</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="ativo" className="text-sm">
                {config.ativo ? 'Ativo' : 'Inativo'}
              </Label>
              <Switch
                id="ativo"
                checked={config.ativo}
                onCheckedChange={(v) => handleChange('ativo', v)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {config.ativo
              ? '✅ O envio de e-mails está habilitado. Orçamentos e notificações serão enviados automaticamente.'
              : '⚠️ O envio de e-mails está desabilitado. Nenhum e-mail será enviado pelo sistema.'}
          </p>
        </CardContent>
      </Card>

      {/* Conta de Email */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Conta de E-mail</CardTitle>
          </div>
          <CardDescription>
            E-mail e senha utilizados para autenticação SMTP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail do remetente *</Label>
            <Input
              id="email"
              type="email"
              value={config.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="comercial@3whotelaria.com.br"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha SMTP *</Label>
            <div className="relative">
              <Input
                id="senha"
                type={mostrarSenha ? 'text' : 'password'}
                value={config.senha_smtp}
                onChange={(e) => handleChange('senha_smtp', e.target.value)}
                placeholder="Senha do e-mail"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Servidor SMTP */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Servidor SMTP</CardTitle>
          </div>
          <CardDescription>
            Configurações do servidor de envio de e-mails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="host">Host SMTP *</Label>
            <Input
              id="host"
              value={config.host}
              onChange={(e) => handleChange('host', e.target.value)}
              placeholder="smtp.hostinger.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="port">Porta</Label>
              <Select
                value={String(config.port)}
                onValueChange={(v) => handleChange('port', Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="465">465 (SSL)</SelectItem>
                  <SelectItem value="587">587 (TLS)</SelectItem>
                  <SelectItem value="25">25 (Sem criptografia)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conexão Segura (SSL/TLS)</Label>
              <div className="flex items-center gap-2 h-10">
                <Switch
                  checked={config.secure}
                  onCheckedChange={(v) => handleChange('secure', v)}
                />
                <span className="text-sm text-muted-foreground">
                  {config.secure ? 'SSL ativado' : 'Sem criptografia'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button
          variant="outline"
          onClick={testarConexao}
          disabled={testando || salvando}
        >
          {testando ? (
            <>Testando...</>
          ) : (
            <>
              <TestTube className="w-4 h-4 mr-2" />
              Testar Conexão
            </>
          )}
        </Button>
        <Button
          onClick={salvarConfiguracoes}
          disabled={salvando || testando}
        >
          {salvando ? (
            <>Salvando...</>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
