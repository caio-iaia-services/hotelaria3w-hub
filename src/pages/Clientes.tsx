import { useState } from "react";
import { Search, Plus, Filter, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const mockClientes = [
  { id: 1, nome: "Hotel Fasano", segmento: "Hotelaria", cidade: "São Paulo", status: "Ativo", contato: "João Silva" },
  { id: 2, nome: "Marriott São Paulo", segmento: "Hotelaria", cidade: "São Paulo", status: "Ativo", contato: "Maria Santos" },
  { id: 3, nome: "Restaurante DOM", segmento: "Gastronomia", cidade: "São Paulo", status: "Ativo", contato: "Carlos Oliveira" },
  { id: 4, nome: "Hospital Albert Einstein", segmento: "Hospitalar", cidade: "São Paulo", status: "Inativo", contato: "Ana Lima" },
  { id: 5, nome: "Grand Hyatt", segmento: "Hotelaria", cidade: "Rio de Janeiro", status: "Ativo", contato: "Pedro Costa" },
  { id: 6, nome: "Copacabana Palace", segmento: "Hotelaria", cidade: "Rio de Janeiro", status: "Ativo", contato: "Lucia Ferreira" },
  { id: 7, nome: "Restaurante Maní", segmento: "Gastronomia", cidade: "São Paulo", status: "Ativo", contato: "Roberto Almeida" },
];

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = mockClientes.filter((c) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter size={14} className="mr-1.5" />
            Filtrar
          </Button>
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus size={14} className="mr-1.5" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base">
            Clientes ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold">Segmento</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Cidade</TableHead>
                <TableHead className="font-semibold hidden sm:table-cell">Contato</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((cliente) => (
                <TableRow key={cliente.id} className="hover:bg-muted/30 cursor-pointer">
                  <TableCell className="font-medium">{cliente.nome}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs font-medium">
                      {cliente.segmento}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {cliente.cidade}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {cliente.contato}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={cliente.status === "Ativo" ? "default" : "outline"}
                      className={
                        cliente.status === "Ativo"
                          ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-100"
                          : "text-muted-foreground"
                      }
                    >
                      {cliente.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
