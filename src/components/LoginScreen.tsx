import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { ShieldAlert, Mail, Lock, UserPlus, LogIn, Key, Loader2, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth, type UserRole } from '../contexts/AuthContext';
// Removido QUICK_USERS

export function LoginScreen() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('fib');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isRegistering) {
        // Registro sempre usa Firebase Real
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: displayName || user.email?.split('@')[0],
          role: role,
          status: 'pending',
          createdAt: new Date().toISOString(),
          serverTimestamp: serverTimestamp()
        });
        
        setMessage('Conta criada com sucesso! Aguarde a aprovação do administrador.');
        setIsRegistering(false);
      } else {
        // Login Real
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('O cadastro por e-mail ainda não foi ativado no Console do Firebase. (Authentication > Sign-in method > Email/Senha)');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Por favor, informe seu e-mail para recuperar a senha.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Um link de recuperação foi enviado para o seu e-mail.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[128px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600 rounded-full blur-[128px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-40 h-40 flex items-center justify-center mb-4">
            <img src="/FIB2.webp" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wider">FIB SYSTEM</h1>
          <p className="text-slate-400 text-sm mb-4">Sistema Integrado de Justiça e Segurança</p>
          
          <div className="bg-red-500/5 border border-red-500/20 px-4 py-2 rounded text-[10px] text-red-400/80 text-center leading-tight uppercase font-medium tracking-wider">
            Aviso: O uso por pessoas não autorizadas resultará em sanções penais e medidas administrativas.
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs p-3 rounded-lg flex items-start gap-2 mb-6">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 text-xs p-3 rounded-lg flex items-start gap-2 mb-6">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium ml-1">Nome Completo</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-11 bg-slate-800/50 border border-white/5 rounded-xl px-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                  placeholder="Seu nome"
                />
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium ml-1">
              {isRegistering ? 'E-mail Corporativo' : 'E-mail'}
            </label>
            <div className="relative">
              <input
                type={isRegistering ? "email" : "text"}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 bg-slate-800/50 border border-white/5 rounded-xl px-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                placeholder={isRegistering ? "nome@email.gov" : "Ex: seunome@email.gov"}
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium ml-1">Senha</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 bg-slate-800/50 border border-white/5 rounded-xl px-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                placeholder="••••••••"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            </div>
          </div>

          {isRegistering && (
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium ml-1">Instituição</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full h-11 bg-slate-800/50 border border-white/5 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors appearance-none cursor-pointer"
              >
                <option value="fib">F.I.B - Federal Investigation Bureau</option>
                <option value="doj">D.O.J - Department of Justice</option>
                <option value="judge">Justiça - Juiz</option>
                <option value="lspd">LSPD - Los Santos Police Department</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isRegistering ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {isRegistering ? 'Cadastrar Solicitação' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="mt-8 flex flex-col gap-3">
          {!isRegistering && (
             <button 
                onClick={handleResetPassword}
                className="text-xs text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1.5"
             >
               <Key className="w-3.5 h-3.5" />
               Esqueceu sua senha? Recuperar acesso
             </button>
          )}
          
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            {isRegistering ? 'Já possui conta? Fazer Login' : 'Não tem acesso? Solicitar Credenciais'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-medium">
            powered by <span className="text-slate-400">Lucas Samir / NINOdev</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export function PendingScreen() {
  const { logout } = useAuth();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-white/5 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Acesso Pendente</h2>
        <p className="text-slate-400 text-sm mb-6">
          Sua conta foi criada com sucesso, mas ainda não foi autorizada por um administrador. 
          Entre em contato com sua instituição para ativar seu acesso.
        </p>
        <button 
          onClick={() => logout()}
          className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm transition-colors"
        >
          Sair da Conta
        </button>
      </div>
    </div>
  )
}
