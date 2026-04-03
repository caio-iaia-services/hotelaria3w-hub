import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { UserProfile } from "@/lib/userProfile";
import { TODOS_MODULOS, GESTOES, gestaoLabel, MODULOS_COMERCIAL_PADRAO, MODULOS_ADMIN_PADRAO } from "@/lib/userProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UserCog, Plus, Pencil, Shield, User, Loader2 } from "lucide-react";

const roleLabel: Record<string, string> = {
  admin: "Admin",
  tecnico: "Técnico",
  comercial: "Comercial",
};

const roleBadgeColor: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  tecnico: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  comercial: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
};

const gestaoColors: Record<string, string> = {
  G1: "bg-blue-100 text-blue-800",
  G2: "bg-green-100 text-green-800",
  G3: "bg-orange-100 text-orange-800",
  G4: "bg-purple-100 text-purple-800",
};

interface PerfilEditavel extends UserProfile {
  _dirty?: boolean;
}

export default function AdminUsuarios() {
  const { isAdmin, temModulo, recarregarPerfil } = useAuth();
  const navigate = useNavigate();
  const [perfis, setPerfis] = useState<PerfilEditavel[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [perfilSelecionado, setPerfilSelecionado] = useState<PerfilEditavel | null>(null);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [criando, setCriando] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState({
    email: "",
    senha: "",
    nome: "",
    role: "comercial" as UserProfile["role"],
    gestao: null as string | null,
    modulos: MODULOS_COMERCIAL_PADRAO,
  });

  // Redireciona se não tiver permissão
  useEffect(() => {
    if (!temModulo("admin_usuarios")) navigate("/dashboard");
  }, []);

  const buscarPerfis = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .order("nome", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar usuários");
    } else {
      setPerfis((data || []) as PerfilEditavel[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { buscarPerfis(); }, [buscarPerfis]);

  const salvarPerfil = async (perfil: PerfilEditavel) => {
    setSalvando(perfil.id);
    const { error } = await supabase
      .from("user_profiles")
      .update({
        nome: perfil.nome,
        role: perfil.role,
        gestao: perfil.gestao,
        modulos: perfil.modulos,
        ativo: perfil.ativo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", perfil.id);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success(`Perfil de ${perfil.nome} salvo!`);
      setPerfis(prev => prev.map(p => p.id === perfil.id ? { ...perfil, _dirty: false } : p));
      await recarregarPerfil();
    }
    setSalvando(null);
  };

  const toggleModulo = (perfilId: string, modulo: string) => {
    setPerfis(prev => prev.map(p => {
      if (p.id !== perfilId) return p;
      const tem = p.modulos.includes(modulo);
      return {
        ...p,
        modulos: tem ? p.modulos.filter(m => m !== modulo) : [...p.modulos, modulo],
        _dirty: true,
      };
    }));
  };

  const toggleAtivo = (perfilId: string) => {
    setPerfis(prev => prev.map(p =>
      p.id === perfilId ? { ...p, ativo: !p.ativo, _dirty: true } : p
    ));
  };

  const abrirModal = (perfil: PerfilEditavel) => {
    setPerfilSelecionado({ ...perfil });
    setModalAberto(true);
  };

  const salvarModal = async () => {
    if (!perfilSelecionado) return;
    setPerfis(prev => prev.map(p => p.id === perfilSelecionado.id ? { ...perfilSelecionado, _dirty: false } : p));
    await salvarPerfil(perfilSelecionado);
    setModalAberto(false);
  };

  const criarNovoUsuario = async () => {
    if (!novoUsuario.email || !novoUsuario.senha || !novoUsuario.nome) {
      toast.error("Preencha nome, e-mail e senha");
      return;
    }
    setCriando(true);
    try {
      // Cria o usuário no Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: novoUsuario.email,
        password: novoUsuario.senha,
        email_confirm: true,
      });

      if (error) throw error;
      const userId = data.user?.id;
      if (!userId) throw new Error("Usuário criado mas ID não retornado");

      // Cria o perfil
      const { error: perfilError } = await supabase.from("user_profiles").insert({
        id: userId,
        email: novoUsuario.email,
        nome: novoUsuario.nome,
        role: novoUsuario.role,
        gestao: novoUsuario.gestao,
        modulos: novoUsuario.modulos,
        ativo: true,
      });

      if (perfilError) throw perfilError;

      toast.success(`Usuário ${novoUsuario.nome} criado com sucesso!`);
      setModalNovoAberto(false);
      setNovoUsuario({ email: "", senha: "", nome: "", role: "comercial", gestao: null, modulos: MODULOS_COMERCIAL_PADRAO });
      await buscarPerfis();
    } catch (err: any) {
      toast.error("Erro ao criar usuário: " + (err.message || "Tente novamente"));
    } finally {
      setCriando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="w-6 h-6" />
            Gestão de Usuários
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Controle de acesso, gestões e módulos liberados por usuário.
          </p>
        </div>
        <Button onClick={() => setModalNovoAberto(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <div className="grid gap-4">
        {perfis.map(perfil => (
          <Card key={perfil.id} className={!perfil.ativo ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center font-bold text-sm">
                    {perfil.nome.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <CardTitle className="text-base">{perfil.nome}</CardTitle>
                    <p className="text-xs text-muted-foreground">{perfil.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {perfil.gestao && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${gestaoColors[perfil.gestao] || "bg-gray-100 text-gray-700"}`}>
                      {gestaoLabel[perfil.gestao] || perfil.gestao}
                    </span>
                  )}
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleBadgeColor[perfil.role]}`}>
                    {roleLabel[perfil.role]}
                  </span>
                  <div className="flex items-center gap-1 ml-2">
                    <span className="text-xs text-muted-foreground">{perfil.ativo ? "Ativo" : "Inativo"}</span>
                    <Switch
                      checked={perfil.ativo}
                      onCheckedChange={() => toggleAtivo(perfil.id)}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => abrirModal(perfil)}>
                    <Pencil className="w-3 h-3 mr-1" /> Editar
                  </Button>
                  {perfil._dirty && (
                    <Button size="sm" onClick={() => salvarPerfil(perfil)} disabled={!!salvando}>
                      {salvando === perfil.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Módulos</p>
                <div className="flex flex-wrap gap-2">
                  {TODOS_MODULOS.map(m => {
                    const tem = perfil.modulos.includes(m.key);
                    return (
                      <button
                        key={m.key}
                        onClick={() => toggleModulo(perfil.id, m.key)}
                        className={`text-xs px-2 py-1 rounded-full border transition-colors font-medium ${
                          tem
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-muted-foreground/20 hover:border-primary/50"
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de edição */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>
          {perfilSelecionado && (
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={perfilSelecionado.nome}
                  onChange={e => setPerfilSelecionado(p => p ? { ...p, nome: e.target.value } : p)}
                />
              </div>

              <div>
                <Label>Perfil de Acesso</Label>
                <Select
                  value={perfilSelecionado.role}
                  onValueChange={val => {
                    const role = val as UserProfile["role"];
                    const modulos = role === "admin" || role === "tecnico"
                      ? MODULOS_ADMIN_PADRAO
                      : MODULOS_COMERCIAL_PADRAO;
                    setPerfilSelecionado(p => p ? { ...p, role, modulos } : p);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Gestão Responsável</Label>
                <Input
                  placeholder="Ex: G1, G2, G5 — deixe vazio para acesso total"
                  value={perfilSelecionado.gestao || ""}
                  onChange={e => setPerfilSelecionado(p => p ? { ...p, gestao: e.target.value.trim().toUpperCase() || null } : p)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comerciais veem apenas dados da sua gestão. Deixe vazio para acesso a todas.
                </p>
              </div>

              <div>
                <Label className="mb-2 block">Módulos Liberados</Label>
                <div className="flex flex-wrap gap-2">
                  {TODOS_MODULOS.map(m => {
                    const tem = perfilSelecionado.modulos.includes(m.key);
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setPerfilSelecionado(p => {
                          if (!p) return p;
                          const modulos = tem
                            ? p.modulos.filter(mod => mod !== m.key)
                            : [...p.modulos, m.key];
                          return { ...p, modulos };
                        })}
                        className={`text-xs px-2 py-1 rounded-full border transition-colors font-medium ${
                          tem
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-muted-foreground/20"
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={salvarModal} disabled={!!salvando}>
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Novo Usuário */}
      <Dialog open={modalNovoAberto} onOpenChange={setModalNovoAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                placeholder="Ex: João Silva"
                value={novoUsuario.nome}
                onChange={e => setNovoUsuario(p => ({ ...p, nome: e.target.value }))}
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="Ex: comercial2@3whotelaria.com.br"
                value={novoUsuario.email}
                onChange={e => setNovoUsuario(p => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div>
              <Label>Senha inicial</Label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={novoUsuario.senha}
                onChange={e => setNovoUsuario(p => ({ ...p, senha: e.target.value }))}
              />
            </div>
            <div>
              <Label>Perfil de Acesso</Label>
              <Select
                value={novoUsuario.role}
                onValueChange={val => {
                  const role = val as UserProfile["role"];
                  setNovoUsuario(p => ({
                    ...p,
                    role,
                    modulos: role === "admin" || role === "tecnico" ? MODULOS_ADMIN_PADRAO : MODULOS_COMERCIAL_PADRAO,
                  }));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Gestão Responsável</Label>
              <Input
                placeholder="Ex: G1, G2, G5 — deixe vazio para acesso total"
                value={novoUsuario.gestao || ""}
                onChange={e => setNovoUsuario(p => ({ ...p, gestao: e.target.value.trim().toUpperCase() || null }))}
              />
                </SelectContent>
              <p className="text-xs text-muted-foreground mt-1">
                Comerciais veem apenas dados da sua gestão. Deixe vazio para acesso a todas.
              </p>
            </div>
            <div>
              <Label className="mb-2 block">Módulos Liberados</Label>
              <div className="flex flex-wrap gap-2">
                {TODOS_MODULOS.map(m => {
                  const tem = novoUsuario.modulos.includes(m.key);
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setNovoUsuario(p => ({
                        ...p,
                        modulos: tem ? p.modulos.filter(mod => mod !== m.key) : [...p.modulos, m.key],
                      }))}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors font-medium ${
                        tem
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-muted-foreground/20"
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNovoAberto(false)}>Cancelar</Button>
            <Button onClick={criarNovoUsuario} disabled={criando}>
              {criando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
