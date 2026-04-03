import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { UserProfile } from '@/lib/userProfile'
import { MODULOS_ADMIN_PADRAO, MODULOS_COMERCIAL_PADRAO } from '@/lib/userProfile'

interface AuthContextType {
  user: User | null
  session: Session | null
  perfil: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
  isAdmin: boolean
  gestaoFiltro: string | null
  temModulo: (modulo: string) => boolean
  recarregarPerfil: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  perfil: null,
  loading: true,
  signOut: async () => {},
  isAdmin: false,
  gestaoFiltro: null,
  temModulo: () => true,
  recarregarPerfil: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

async function carregarOuCriarPerfil(user: User): Promise<UserProfile> {
  // Busca perfil existente
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (data) return data as UserProfile

  // Cria perfil padrão se não existir (primeiro login)
  const novoPerfil: Omit<UserProfile, 'id'> & { id: string } = {
    id: user.id,
    email: user.email || '',
    nome: user.email?.split('@')[0] || 'Usuário',
    role: 'comercial',
    gestao: null,
    modulos: MODULOS_COMERCIAL_PADRAO,
    ativo: true,
  }

  const { data: criado } = await supabase
    .from('user_profiles')
    .insert(novoPerfil)
    .select()
    .single()

  return (criado || novoPerfil) as UserProfile
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const carregarPerfil = async (u: User) => {
    const p = await carregarOuCriarPerfil(u)
    setPerfil(p)
  }

  const recarregarPerfil = async () => {
    if (user) await carregarPerfil(user)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        carregarPerfil(session.user).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        carregarPerfil(session.user).finally(() => setLoading(false))
      } else {
        setPerfil(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setPerfil(null)
  }

  const isAdmin = perfil?.role === 'admin' || perfil?.role === 'tecnico'
  const gestaoFiltro = perfil?.role === 'comercial' ? (perfil.gestao ?? null) : null
  const temModulo = (modulo: string) => {
    if (!perfil) return false
    if (isAdmin) return true
    return perfil.modulos.includes(modulo)
  }

  return (
    <AuthContext.Provider value={{
      user, session, perfil, loading, signOut,
      isAdmin, gestaoFiltro, temModulo, recarregarPerfil,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
