import { useEffect, useState } from "react";
import { Plus, Trash2, Calendar, Video, Phone, Users, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/AuthProvider";

type TipoEvento = "reuniao" | "ligacao" | "visita" | "outro";

interface Evento {
  id: string;
  titulo: string;
  hora: string;
  tipo: TipoEvento;
  data: string; // YYYY-MM-DD
}

const TIPOS: { key: TipoEvento; label: string; icon: React.ElementType; cor: string }[] = [
  { key: "reuniao", label: "Reunião",  icon: Video,  cor: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "ligacao", label: "Ligação",  icon: Phone,  cor: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { key: "visita",  label: "Visita",   icon: Users,  cor: "bg-purple-100 text-purple-700 border-purple-200" },
  { key: "outro",   label: "Outro",    icon: Clock,  cor: "bg-slate-100 text-slate-600 border-slate-200" },
];

const diasSemana = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function dataHoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function CardAgenda() {
  const { perfil } = useAuth();
  const storageKey = `agenda_3w_${perfil?.id ?? "guest"}`;
  const hoje = dataHoje();
  const agora = new Date();

  const [eventos, setEventos] = useState<Evento[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); }
    catch { return []; }
  });
  const [adicionando, setAdicionando] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaHora, setNovaHora] = useState("");
  const [novoTipo, setNovoTipo] = useState<TipoEvento>("reuniao");

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(eventos));
  }, [eventos, storageKey]);

  const eventosHoje = eventos
    .filter(e => e.data === hoje)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  const adicionarEvento = () => {
    const titulo = novoTitulo.trim();
    if (!titulo) return;
    const novo: Evento = {
      id: crypto.randomUUID(),
      titulo,
      hora: novaHora || "00:00",
      tipo: novoTipo,
      data: hoje,
    };
    setEventos(prev => [...prev, novo]);
    setNovoTitulo("");
    setNovaHora("");
    setNovoTipo("reuniao");
    setAdicionando(false);
  };

  const removerEvento = (id: string) => {
    setEventos(prev => prev.filter(e => e.id !== id));
  };

  const tipo = (t: TipoEvento) => TIPOS.find(x => x.key === t)!;

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Calendar size={15} className="text-blue-600" />
            Agenda de Hoje
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setAdicionando(true)}
          >
            <Plus size={15} />
          </Button>
        </div>

        {/* Data de hoje */}
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-3xl font-heading font-bold text-[#1a4168]">
            {agora.getDate()}
          </span>
          <div>
            <p className="text-sm font-medium text-foreground leading-tight">
              {diasSemana[agora.getDay()]}
            </p>
            <p className="text-xs text-muted-foreground">
              {meses[agora.getMonth()]} {agora.getFullYear()}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Form novo evento */}
        {adicionando && (
          <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/30">
            <Input
              placeholder="Título do evento..."
              value={novoTitulo}
              onChange={e => setNovoTitulo(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") adicionarEvento(); if (e.key === "Escape") setAdicionando(false); }}
              className="h-8 text-sm"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={novaHora}
                onChange={e => setNovaHora(e.target.value)}
                className="h-7 text-xs px-2 rounded-md border border-input bg-background w-24"
              />
              <select
                value={novoTipo}
                onChange={e => setNovoTipo(e.target.value as TipoEvento)}
                className="h-7 text-xs px-2 rounded-md border border-input bg-background flex-1"
              >
                {TIPOS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex gap-1 justify-end">
              <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setAdicionando(false)}>
                Cancelar
              </Button>
              <Button size="sm" className="h-6 text-xs px-3 bg-[#1a4168] hover:bg-[#1a4168]/90 text-white" onClick={adicionarEvento}>
                Salvar
              </Button>
            </div>
          </div>
        )}

        {/* Lista de eventos */}
        {eventosHoje.length === 0 && !adicionando ? (
          <div className="text-center py-6 space-y-2">
            <Calendar size={28} className="mx-auto text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">Nenhum evento para hoje</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1.5 text-muted-foreground"
              onClick={() => setAdicionando(true)}
            >
              <Plus size={12} /> Adicionar evento
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {eventosHoje.map(evento => {
              const t = tipo(evento.tipo);
              const IconeTipo = t.icon;
              return (
                <div
                  key={evento.id}
                  className="group flex items-start gap-2.5 py-2 px-2.5 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/40"
                >
                  <div className="text-xs text-muted-foreground font-mono w-10 mt-0.5 shrink-0">
                    {evento.hora}
                  </div>
                  <div className={`p-1 rounded-md border shrink-0 ${t.cor}`}>
                    <IconeTipo size={11} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground leading-snug">{evento.titulo}</p>
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-3.5 mt-1 ${t.cor}`}>
                      {t.label}
                    </Badge>
                  </div>
                  <button
                    onClick={() => removerEvento(evento.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 mt-0.5"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
