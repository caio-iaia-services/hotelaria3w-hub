import { useAuth } from "@/components/AuthProvider";
import DashboardAdmin from "@/pages/DashboardAdmin";
import DashboardGestor from "@/pages/DashboardGestor";

/**
 * Roteador de painéis: Celso (admin/técnico) vê a operação inteira,
 * gestores (comercial) veem o dia a dia da própria gestão.
 * Ver DashboardAdmin.tsx e DashboardGestor.tsx.
 */
export default function Dashboard() {
  const { isAdmin } = useAuth();
  return isAdmin ? <DashboardAdmin /> : <DashboardGestor />;
}
