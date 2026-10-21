// Email → 6-digit code, the same sign-in as the app (the code is emailed through Resend).

import { useState } from 'react';

import { BrandMark } from '../BrandMark';
import { isEmail } from '../format';
import { supabase } from '../supabase';
import { text } from '../text';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const address = email.trim().toLowerCase();

  const send = async () => {
    setBusy(true);
    setError(null);
    // Only people who already use the app can sign in here (no new accounts from the dashboard)
    const { error } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: false } });
    setBusy(false);
    if (error) return setError(text.sendFailed);
    setStep('code');
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: address, token: code, type: 'email' });
    setBusy(false);
    if (error) setError(text.wrongCode);
  };

  return (
    <div className="center-page">
      <form
        className="login card"
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 'email' && isEmail(email)) send();
          if (step === 'code' && code.length === 6) verify();
        }}>
        <div className="brand">
          <BrandMark />
          {text.appName}
        </div>
        <div>
          <h1>{text.signInTitle}</h1>
          <p className="muted">{text.signInBody}</p>
        </div>

        <label>
          <div className="muted">{text.emailLabel}</div>
          <input
            className="input ltr"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            placeholder={text.emailPlaceholder}
            autoComplete="email"
            autoFocus
            disabled={step === 'code'}
          />
        </label>

        {step === 'code' && (
          <label>
            <div className="muted">{text.codeLabel}</div>
            <input
              className="input ltr"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
            />
          </label>
        )}

        {error && <div className="error">{error}</div>}

        {step === 'email' ? (
          <button className="btn wide" type="submit" disabled={!isEmail(email) || busy}>
            {text.sendCode}
          </button>
        ) : (
          <>
            <button className="btn wide" type="submit" disabled={code.length !== 6 || busy}>
              {text.confirm}
            </button>
            <button
              className="btn ghost wide"
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
              }}>
              {text.changeEmail}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
