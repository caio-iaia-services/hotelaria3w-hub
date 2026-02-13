import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      navigate("/dashboard");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row animate-in fade-in duration-500">
      {/* Left / Top panel */}
      <div
        className="h-[30vh] lg:h-auto lg:w-1/2 flex flex-col items-center justify-center gap-4 px-6"
        style={{ backgroundColor: "#1E4A7C" }}
      >
        <img
          src="/logo_3Whotelaria_transp.png"
          alt="3W Hotelaria"
          className="w-[240px] lg:w-[380px]"
        />
        <div className="text-center">
          <p className="text-white text-lg lg:text-xl font-heading font-semibold">
            Sistema de Gestão Integrada
          </p>
          <p className="text-white/80 text-sm mt-1">
            Hotelaria · Gastronomia · Hospitalar
          </p>
        </div>
      </div>

      {/* Right / Bottom panel */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center bg-white p-6 lg:p-12">
        <div className="w-full max-w-[400px] space-y-8">
          <div>
            <h1 className="text-[32px] font-heading font-bold text-gray-900">Bem-vindo</h1>
            <p className="text-gray-500 mt-1">Faça login para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">E-mail</Label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="senha" className="text-gray-700">Senha</Label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="senha"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(v) => setRemember(!!v)}
              />
              <Label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                Lembrar-me
              </Label>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#1E4A7C" }}
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
