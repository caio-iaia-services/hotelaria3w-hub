import { useState } from "react";
import {
  Database, CheckCircle2, Shield, Phone, Mail, MapPin, Users, FileText, Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const amostraClientes = [
  { nome: "Hotel Paradise Resort", cidade: "São Paulo", estado: "SP", segmento: "Hotelaria", cnpj: "12.345.678/0001-90" },
  { nome: "Restaurante Gourmet", cidade: "Rio de Janeiro", estado: "RJ", segmento: "Gastronomia", cnpj: "23.456.789/0001-01" },
  { nome: "Hospital São Lucas", cidade: "Curitiba", estado: "PR", segmento: "Hospitalar", cnpj: "34.567.890/0001-12" },
  { nome: "Grand Hotel Beira Mar", cidade: "Florianópolis", estado: "SC", segmento: "Hotelaria", cnpj: "45.678.901/0001-23" },
  { nome: "Bistrô da Praça", cidade: "Belo Horizonte", estado: "MG", segmento: "Gastronomia", cnpj: "56.789.012/0001-34" },
  { nome: "Hospital Vida Nova", cidade: "Salvador", estado: "BA", segmento: "Hospitalar", cnpj: "67.890.123/0001-45" },
  { nome: "Pousada Sol Nascente", cidade: "Porto Alegre", estado: "RS", segmento: "Hotelaria", cnpj: "78.901.234/0001-56" },
  { nome: "Cantina Bella Italia", cidade: "Brasília", estado: "DF", segmento: "Gastronomia", cnpj: "89.012.345/0001-67" },
  { nome: "Resort Costa Dourada", cidade: "Recife", estado: "PE", segmento: "Hotelaria", cnpj: "90.123.456/0001-78" },
  { nome: "Hospital Santa Clara", cidade: "Fortaleza", estado: "CE", segmento: "Hospitalar", cnpj: "01.234.567/0001-89" },
];

const features = [
  { icon: Shield, text: "CNPJs únicos verificados" },
  { icon: Phone, text: "Telefones e e-mails validados" },
  { icon: Users, text: "Segmentação por tipo (Hotelaria, Gastronomia, Hospitalar)" },
  { icon: MapPin, text: "Endereços completos" },
  { icon: Clock, text: "Histórico de atividades" },
];

const segmentColors: Record<string, string> = {
  Hotelaria: "bg-blue-100 text-blue-700",
  Gastronomia: "bg-orange-100 text-orange-700",
  Hospitalar: "bg-emerald-100 text-emerald-700",
};

export default function Clientes() {
  const [showAmostra, setShowAmostra] = useState(false);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-2xl border-border/50 shadow-lg">
        <CardContent className="p-8 sm:p-12 flex flex-col items-center text-center space-y-8">
          {/* Icon */}
          <div className="p-5 rounded-2xl bg-primary/10">
            <Database size={80} className="text-primary" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
              Base de Clientes 3W Hotelaria
            </h1>
            <p className="text-muted-foreground text-lg">
              Sistema pronto para operação
            </p>
          </div>

          {/* Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
            {[
              "65.331 clientes processados",
              "Dados validados e limpos",
              "Banco configurado",
            ].map((text) => (
              <div
                key={text}
                className="flex items-center gap-2 justify-center rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-3 py-2.5"
              >
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {text}
                </span>
              </div>
            ))}
          </div>

          {/* Features */}
          <div className="w-full space-y-3 text-left">
            {features.map((f) => (
              <div key={f.text} className="flex items-center gap-3 px-2">
                <f.icon size={18} className="text-primary shrink-0" />
                <span className="text-sm text-foreground">{f.text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button size="lg" className="px-8 text-base" onClick={() => setShowAmostra(true)}>
            <FileText size={18} className="mr-2" />
            Visualizar Amostra dos Dados
          </Button>

          {/* Footer */}
          <p className="text-xs text-muted-foreground">
            A importação final será concluída após aprovação do projeto
          </p>
        </CardContent>
      </Card>

      {/* Modal Amostra */}
      <Dialog open={showAmostra} onOpenChange={setShowAmostra}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Amostra da Base de Clientes</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>CNPJ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {amostraClientes.map((c) => (
                <TableRow key={c.cnpj}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{c.cidade}/{c.estado}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={segmentColors[c.segmento]}>
                      {c.segmento}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono">{c.cnpj}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
