// Phone number (+20) → 6-digit code, the same sign-in as the app.

import { useState } from 'react';

import { BrandMark } from '../BrandMark';
import { supabase } from '../supabase';
import { text } from '../text';

const PREFIX = '+20';
// Egyptian mobile: 10 digits starting 10/11/12/15; the local 0 or a pasted +20 is dropped
const toLocal = (value: string) =>
  value
    .replace(/\D/g, '')
    .replace(/^(?:0020|20(?=1[0125]\d{8}$)|0)/, '')
    .slice(0, 10);
const isValid = (digits: string) => /^1[0125]\d{8}$/.test(digits);

export function LoginPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ phone: PREFIX + phone });
    setBusy(false);
    if (error) return setError(text.sendFailed);
    setStep('code');
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ phone: PREFIX + phone, token: code, type: 'sms' });
    setBusy(false);
    if (error) setError(text.wrongCode);
  };

  return (
    <div className="center-page">
      <form
        className="login card"
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 'phone' && isValid(phone)) send();
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
          <div className="muted">{text.phoneLabel}</div>
          <div className="phone-row">
            <span>{PREFIX}</span>
            <input
              value={phone}
              onChange={(e) => setPhone(toLocal(e.target.value))}
              placeholder={text.phonePlaceholder}
              inputMode="tel"
              autoFocus
              disabled={step === 'code'}
            />
          </div>
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

        {step === 'phone' ? (
          <button className="btn wide" type="submit" disabled={!isValid(phone) || busy}>
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
                setStep('phone');
                setCode('');
              }}>
              {text.changeNumber}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
