// The product list the app suggests while typing: add, edit, hide; manage the words that find each product.
// Reading uses the normal product tables (everyone signed in can read them); changes go through admin-only doors.

import { useEffect, useState } from 'react';

import { rpc, supabase, type Alias, type Product } from '../supabase';
import { text } from '../text';

const CATEGORIES = ['produce', 'dairy', 'bakery', 'pantry', 'cleaning', 'other'];
const UNITS = ['count', 'kg', 'piece', 'box', 'carton', 'bag'];
const DIALECTS = ['saudi', 'emirati', 'kuwaiti', 'egyptian', 'levantine', 'other'];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();

export function ProductsPage({ notify }: { notify: (message: string) => void }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [showHidden, setShowHidden] = useState(false);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);

  const load = async () => {
    setFailed(false);
    const [p, a] = await Promise.all([
      supabase.from('catalog').select('*').order('category').order('name'),
      supabase.from('catalog_aliases').select('*').order('alias'),
    ]);
    if (p.error || a.error) return setFailed(true);
    setProducts(p.data as Product[]);
    setAliases(a.data as Alias[]);
  };
  useEffect(() => {
    load();
  }, []);

  const wordsOf = (id: string) => aliases.filter((a) => a.catalog_id === id);
  const nameOf = (id: string | null) => products?.find((p) => p.id === id)?.name ?? '';

  const q = normalize(query);
  const shown = (products ?? []).filter((p) => {
    if (p.hidden && !showHidden) return false;
    if (category !== 'all' && p.category !== category) return false;
    if (!q) return true;
    const words = [p.name, p.translations?.en ?? '', p.translations?.hi ?? '', ...wordsOf(p.id).map((a) => a.alias)];
    return words.some((w) => normalize(w).includes(q));
  });

  const toggleHidden = async (p: Product) => {
    if (!p.hidden && !window.confirm(text.confirmHide(p.name))) return;
    try {
      await rpc('admin_set_product_hidden', { product_id: p.id, hidden: !p.hidden });
      notify(text.done);
      load();
    } catch (error) {
      notify(`${text.actionFailed}: ${(error as Error).message}`);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{text.navProducts}</h1>
          <div className="muted">{text.productsBody}</div>
        </div>
        <button className="btn" onClick={() => setEditing('new')}>
          + {text.addProduct}
        </button>
      </div>

      <div className="toolbar">
        <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={text.productSearch} />
        <select className="input select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">{text.allCategories}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {text.categories[c]}
            </option>
          ))}
        </select>
        <button className={`chip ${showHidden ? 'active' : ''}`} onClick={() => setShowHidden(!showHidden)}>
          {text.showHidden}
        </button>
        {products && <span className="muted">{text.productsCount(shown.length)}</span>}
      </div>

      {failed && <p className="error">{text.loadFailed}</p>}
      {!products && !failed && <p className="muted">{text.loading}</p>}

      {products && (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>{text.colProduct}</th>
                <th>{text.colCategory}</th>
                <th>{text.colDefault}</th>
                <th>{text.colEnglish}</th>
                <th>{text.colHindi}</th>
                <th>{text.colWords}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className={p.hidden ? 'is-blocked' : ''}>
                  <td>
                    <strong>{p.name}</strong>
                    {p.hidden && <span className="badge blocked">{text.badgeHidden}</span>}
                    {p.alternative_id && (
                      <div className="muted small-text">
                        {text.fieldAlternative}: {nameOf(p.alternative_id)}
                      </div>
                    )}
                  </td>
                  <td>{text.categories[p.category]}</td>
                  <td>
                    {Number(p.default_qty)} {text.units[p.default_unit]}
                  </td>
                  <td className="ltr">{p.translations?.en}</td>
                  <td>{p.translations?.hi}</td>
                  <td>
                    {wordsOf(p.id).map((a) => (
                      <span className="list-pill" key={a.id} title={a.dialect ? text.dialects[a.dialect] : text.everyone}>
                        {a.alias}
                        {a.dialect && <span className="muted"> · {text.dialects[a.dialect]}</span>}
                      </span>
                    ))}
                  </td>
                  <td>
                    <div className="actions">
                      <button className="btn ghost small" onClick={() => setEditing(p)}>
                        {text.edit}
                      </button>
                      <button className={`btn small ${p.hidden ? 'ghost' : 'danger'}`} onClick={() => toggleHidden(p)}>
                        {p.hidden ? text.unhide : text.hide}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p className="muted empty-note">{text.noData}</p>}
        </div>
      )}

      {editing && products && (
        <ProductEditor
          product={editing === 'new' ? null : editing}
          products={products}
          words={editing === 'new' ? [] : wordsOf(editing.id)}
          notify={notify}
          onSaved={async (id) => {
            await load();
            // Stay open on a new product so its words can be added straight away
            if (editing === 'new') setEditing((current) => (current === 'new' ? { id } as Product : current));
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

type EditorProps = {
  product: Product | null;
  products: Product[];
  words: Alias[];
  notify: (message: string) => void;
  onSaved: (id: string) => void;
  onClose: () => void;
};

function ProductEditor({ product, products, words, notify, onSaved, onClose }: EditorProps) {
  // A just-created product arrives as {id} only — fill it from the fresh list
  const current = product ? (products.find((p) => p.id === product.id) ?? product) : null;
  const [form, setForm] = useState({
    name: current?.name ?? '',
    category: current?.category ?? 'pantry',
    default_qty: String(current?.default_qty ?? 1),
    default_unit: current?.default_unit ?? 'count',
    en: current?.translations?.en ?? '',
    hi: current?.translations?.hi ?? '',
    alternative_id: current?.alternative_id ?? '',
  });
  const [word, setWord] = useState('');
  const [wordDialect, setWordDialect] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!current) return;
    setForm({
      name: current.name,
      category: current.category,
      default_qty: String(current.default_qty),
      default_unit: current.default_unit,
      en: current.translations?.en ?? '',
      hi: current.translations?.hi ?? '',
      alternative_id: current.alternative_id ?? '',
    });
  }, [current?.id, current?.updated_at]);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setBusy(true);
    try {
      const id = await rpc<string>('admin_save_product', {
        p: { ...form, id: current?.id ?? null, default_qty: Number(form.default_qty) || 1 },
      });
      notify(text.done);
      onSaved(id);
    } catch (error) {
      notify(`${text.actionFailed}: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const addWord = async () => {
    if (!current || !word.trim()) return;
    try {
      await rpc('admin_add_alias', { product_id: current.id, alias: word, dialect: wordDialect || null });
      setWord('');
      onSaved(current.id);
    } catch (error) {
      notify(`${text.actionFailed}: ${(error as Error).message}`);
    }
  };

  const removeWord = async (a: Alias) => {
    try {
      await rpc('admin_remove_alias', { alias_id: a.id });
      if (current) onSaved(current.id);
    } catch (error) {
      notify(`${text.actionFailed}: ${(error as Error).message}`);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <h2>{current ? text.editProductTitle : text.newProductTitle}</h2>

        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            if (form.name.trim()) save();
          }}>
          <label className="span-2">
            <span className="muted">{text.fieldName}</span>
            <input className="input" value={form.name} onChange={(e) => set('name')(e.target.value)} autoFocus />
          </label>
          <label>
            <span className="muted">{text.fieldCategory}</span>
            <select className="input select" value={form.category} onChange={(e) => set('category')(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {text.categories[c]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="muted">{text.fieldAlternative}</span>
            <select className="input select" value={form.alternative_id} onChange={(e) => set('alternative_id')(e.target.value)}>
              <option value="">{text.noAlternative}</option>
              {products
                .filter((p) => p.id !== current?.id && !p.hidden)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span className="muted">{text.fieldQty}</span>
            <input
              className="input ltr"
              value={form.default_qty}
              onChange={(e) => set('default_qty')(e.target.value.replace(/[^\d.]/g, ''))}
              inputMode="decimal"
            />
          </label>
          <label>
            <span className="muted">{text.fieldUnit}</span>
            <select className="input select" value={form.default_unit} onChange={(e) => set('default_unit')(e.target.value)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {text.units[u]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="muted">{text.fieldEnglish}</span>
            <input className="input ltr" value={form.en} onChange={(e) => set('en')(e.target.value)} />
          </label>
          <label>
            <span className="muted">{text.fieldHindi}</span>
            <input className="input ltr" value={form.hi} onChange={(e) => set('hi')(e.target.value)} />
          </label>
          <div className="span-2 form-actions">
            <button className="btn ghost" type="button" onClick={onClose}>
              {text.cancel}
            </button>
            <button className="btn" type="submit" disabled={busy || !form.name.trim()}>
              {text.save}
            </button>
          </div>
        </form>

        <hr className="divider" />

        <h2>{text.wordsTitle}</h2>
        <p className="muted">{text.wordsBody}</p>
        {current ? (
          <>
            <div className="words">
              {words.map((a) => (
                <span className="list-pill word" key={a.id}>
                  {a.alias}
                  <span className="muted"> · {a.dialect ? text.dialects[a.dialect] : text.everyone}</span>
                  <button className="word-remove" onClick={() => removeWord(a)} aria-label={`${text.remove} ${a.alias}`}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <form
              className="toolbar"
              onSubmit={(e) => {
                e.preventDefault();
                addWord();
              }}>
              <input className="input" value={word} onChange={(e) => setWord(e.target.value)} placeholder={text.wordPlaceholder} />
              <select className="input select" value={wordDialect} onChange={(e) => setWordDialect(e.target.value)}>
                <option value="">{text.everyone}</option>
                {DIALECTS.map((d) => (
                  <option key={d} value={d}>
                    {text.dialects[d]}
                  </option>
                ))}
              </select>
              <button className="btn" type="submit" disabled={!word.trim()}>
                {text.addWord}
              </button>
            </form>
          </>
        ) : (
          <p className="muted">{text.saveFirst}</p>
        )}
      </div>
    </div>
  );
}
