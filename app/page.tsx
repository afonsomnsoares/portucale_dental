'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ROLE_HOME } from '@/lib/constants';
import s from './login.module.css';
import { useAuth } from './providers';

export default function LoginPage() {
  const { login, api } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdVisible, setPwdVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api('/auth/bootstrap', { cache: 'no-store' })
      .then((r) => {
        if (!cancelled) setNeedsBootstrap(!!r.needsBootstrap);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [api]);

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    setErr('');
    try {
      const d = await api('/auth/login', { method: 'POST', body: { email, password } });
      login(d.user);
      router.push(ROLE_HOME[d.user.role] || '/dashboard/admin');
    } catch (err) {
      setErr(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleBootstrap(e) {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) return;
    if (password !== confirmPassword) {
      setErr('As palavras-passe não coincidem');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const d = await api('/auth/bootstrap', { method: 'POST', body: { name, email, password } });
      login(d.user);
      router.push('/dashboard/admin');
    } catch (err) {
      setErr(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.lp}>
      <aside className={s.panelLeft}>
        <div className={s.toothWrap}>
          <svg viewBox="0 0 200 200" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 18 C140 18, 168 38, 172 78 C176 110, 164 132, 158 152 C152 175, 146 192, 128 192 C116 192, 110 158, 106 138 C103 124, 97 124, 94 138 C90 158, 84 192, 72 192 C54 192, 48 175, 42 152 C36 132, 24 110, 28 78 C32 38, 60 18, 100 18 Z" />
          </svg>
        </div>
        <div className={s.arcInner} />
        <div className={s.logo}>
          <div className={s.logoIcon}>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.5 2 6 4 6 7c0 2.5 1.2 4.5 1.2 6.5C7.2 17 8.5 22 10 22c1.2 0 1.8-3 2-3s.8 3 2 3c1.5 0 2.8-5 2.8-8.5 0-2 1.2-4 1.2-6.5C18 4 15.5 2 12 2z" />
            </svg>
          </div>
          <span className={s.logoName}>
            Portucale <span>Dental</span>
          </span>
        </div>
      </aside>

      <main className={s.panelRight}>
        <div className={s.panelRightInner}>
          <div className={s.formHeader}>
            <h2>{needsBootstrap ? 'Criar Super Admin' : 'Bem-vindo de volta'}</h2>
            <p>{needsBootstrap ? 'Configure o administrador principal' : 'Entre na sua conta para continuar'}</p>
          </div>

          <form onSubmit={needsBootstrap ? handleBootstrap : handleLogin}>
            {err && <div className={s.errMsg}>{err}</div>}

            {needsBootstrap && (
              <div className={s.formGroup}>
                <label className={s.label} htmlFor="name">
                  Nome completo
                </label>
                <div className={s.inputWrap}>
                  <span className={s.inputIcon}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    className={s.inputField}
                    type="text"
                    id="name"
                    placeholder="O seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className={s.formGroup}>
              <label className={s.label} htmlFor="email">
                E-mail
              </label>
              <div className={s.inputWrap}>
                <span className={s.inputIcon}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M2 7l10 7 10-7" />
                  </svg>
                </span>
                <input
                  className={s.inputField}
                  type="email"
                  id="email"
                  placeholder="nome@clinica.pt"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className={s.formGroup}>
              <label className={s.label} htmlFor="password">
                Palavra-passe
              </label>
              <div className={s.inputWrap}>
                <span className={s.inputIcon}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  className={s.inputField}
                  type={pwdVisible ? 'text' : 'password'}
                  id="password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button className={s.eyeBtn} type="button" onClick={() => setPwdVisible((v) => !v)}>
                  {pwdVisible ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.06 10.06 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {needsBootstrap && (
              <div className={s.formGroup}>
                <label className={s.label} htmlFor="confirmPassword">
                  Confirmar palavra-passe
                </label>
                <div className={s.inputWrap}>
                  <span className={s.inputIcon}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    className={s.inputField}
                    type="password"
                    id="confirmPassword"
                    placeholder="••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {!needsBootstrap && (
              <div className={s.rowOptions}>
                <label className={s.checkboxWrap}>
                  <input type="checkbox" id="remember" />
                  <span className={s.customCheck}>
                    <svg
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="2,6 5,9 10,3" />
                    </svg>
                  </span>
                  <span>Lembrar-me</span>
                </label>
                <a href="#" className={s.linkForgot}>
                  Esqueci a palavra-passe
                </a>
              </div>
            )}

            <button className={s.btnPrimary} type="submit" disabled={busy}>
              {busy ? (needsBootstrap ? 'A criar…' : 'A entrar…') : needsBootstrap ? 'Criar Conta' : 'Entrar'}
            </button>
          </form>

          {!needsBootstrap && (
            <>
              <div className={s.divider}>ou</div>
              <button className={s.btnSso} type="button">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 1 4 0" />
                  <circle cx="12" cy="14" r="2" />
                  <path d="M12 16v2" />
                </svg>
                Entrar com SSO empresarial
              </button>
            </>
          )}

          <footer className={s.foot}>
            Portucale Dental · © 2026 · <a href="#">Privacidade</a> · <a href="#">Termos</a>
          </footer>
        </div>
      </main>
    </div>
  );
}
