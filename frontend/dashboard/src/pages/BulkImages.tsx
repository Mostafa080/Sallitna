// Many official pictures at once: download the list of file names (with a ready AI prompt per product), pick or
// drop the images, check how each one matched, then upload them all. Pictures a product already has are kept unless
// the admin chooses to replace them.

import { useEffect, useRef, useState } from 'react';

import { setProductImage, type Product } from '../supabase';
import { text } from '../text';

const MAX_SIDE = 1200; // big enough for the item screen, small enough to load fast on phones
const JPEG_QUALITY = 0.85;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // same limit as the storage bucket
const PARALLEL_UPLOADS = 3;

// One style for every product, so the list looks like a set
const STYLE_PROMPT =
  'Photorealistic studio product photo. Generic packaging with no brand names, logos or text. ' +
  'The whole product centered, on a plain warm cream background (#F6F4EF), soft natural daylight, gentle shadow, ' +
  '4:3 landscape, nothing else in the picture.';

type Status = 'ready' | 'keep' | 'unmatched' | 'duplicate' | 'uploading' | 'done' | 'failed';
type Row = { file: File; url: string; product: Product | null; status: Status };

// Same spelling rules as the search: أ/ا, ة/ه, ى/ي
const normalizeArabic = (value: string) => value.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');

// "Full-fat milk" → "full-fat-milk"; also how a file name is read ("Full fat_milk.PNG" → "full-fat-milk").
// NFC: Macs can store «أ» in file names as ا + hamza mark.
const toKey = (value: string) =>
  normalizeArabic(value.normalize('NFC').toLowerCase())
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9؀-ۿ]+/g, '-')
    .replace(/^-+|-+$/g, '');

// The file name each product's picture should have: its English name, or its id when there's none or it's taken twice
function fileNames(products: Product[]) {
  const base = (p: Product) => toKey(p.translations?.en ?? '') || p.id;
  const count = new Map<string, number>();
  for (const p of products) count.set(base(p), (count.get(base(p)) ?? 0) + 1);
  return new Map(products.map((p) => [p.id, count.get(base(p))! > 1 ? `${base(p)}-${p.id}` : base(p)]));
}

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

function downloadList(products: Product[], names: Map<string, string>) {
  const header = ['file_name', 'arabic', 'english', 'category', 'has_picture', 'ai_prompt'];
  const rows = products
    .filter((p) => !p.hidden)
    .map((p) => {
      const en = p.translations?.en ?? '';
      const subject = en ? `${en} (${p.name})` : p.name;
      return [
        `${names.get(p.id)}.jpg`,
        p.name,
        en,
        text.categories[p.category] ?? p.category,
        p.image_path ? 'yes' : 'no',
        `${subject}. ${STYLE_PROMPT}`,
      ];
    });
  // The mark at the start makes Excel open the Arabic correctly
  const csv = '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  link.download = 'sallitna-product-pictures.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

// Shrink to MAX_SIDE and save as JPEG — keeps every picture light, whatever size it came in
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#ffffff'; // transparent PNGs get a white background instead of black
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  if (!blob) throw new Error('image');
  if (blob.size > MAX_IMAGE_BYTES) throw new Error(text.imageTooBig);
  return blob;
}

type Props = { products: Product[]; onUploaded: () => void; onClose: () => void };

export function BulkImages({ products, onUploaded, onClose }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [replace, setReplace] = useState(false);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const names = fileNames(products);
  // A file can be named after the list's file name, the product id, or the Arabic name
  const byKey = new Map<string, Product>();
  for (const p of products) {
    byKey.set(toKey(p.name), p);
    byKey.set(p.id.toLowerCase(), p);
    byKey.set(names.get(p.id)!, p);
  }
  const withoutPicture = products.filter((p) => !p.hidden && !p.image_path).length;

  // Free the previews when the panel closes
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  useEffect(() => () => rowsRef.current.forEach((r) => URL.revokeObjectURL(r.url)), []);

  // Work out each row's state again (after adding files or changing «استبدل»); uploaded rows stay uploaded
  const restatus = (list: (Omit<Row, 'status'> & { status?: Status })[], replacing: boolean): Row[] => {
    const taken = new Set<string>();
    return list.map((r) => {
      if (r.status === 'done') {
        taken.add(r.product!.id);
        return { ...r, status: 'done' };
      }
      let status: Status;
      if (!r.product) status = 'unmatched';
      else if (taken.has(r.product.id)) status = 'duplicate';
      else status = r.product.image_path && !replacing ? 'keep' : 'ready';
      if (r.product) taken.add(r.product.id);
      return { ...r, status };
    });
  };

  const addFiles = (list: FileList | null) => {
    if (!list || running) return;
    const images = [...list].filter((f) => f.type.startsWith('image/'));
    setFinished(false);
    const added = images.map((file) => ({ file, url: URL.createObjectURL(file), product: byKey.get(toKey(file.name)) ?? null }));
    setRows((current) => restatus([...current, ...added], replace));
    if (fileInput.current) fileInput.current.value = '';
  };

  const toggleReplace = (value: boolean) => {
    setReplace(value);
    setRows((current) => restatus(current, value));
  };

  const clear = () => {
    rows.forEach((r) => URL.revokeObjectURL(r.url));
    setRows([]);
    setFinished(false);
  };

  const setStatus = (index: number, status: Status) =>
    setRows((current) => current.map((r, i) => (i === index ? { ...r, status } : r)));

  const upload = async () => {
    const queue = rows.flatMap((r, i) => (r.status === 'ready' || r.status === 'failed' ? [i] : []));
    setRunning(true);
    // A few at a time: quicker than one by one, gentle on a slow connection
    const worker = async () => {
      for (let index = queue.shift(); index !== undefined; index = queue.shift()) {
        const row = rows[index];
        setStatus(index, 'uploading');
        try {
          await setProductImage(row.product!, await shrink(row.file), 'jpg');
          setStatus(index, 'done');
        } catch {
          setStatus(index, 'failed');
        }
      }
    };
    await Promise.all(Array.from({ length: PARALLEL_UPLOADS }, worker));
    setRunning(false);
    setFinished(true);
    onUploaded();
  };

  const count = (...statuses: Status[]) => rows.filter((r) => statuses.includes(r.status)).length;
  const toUpload = count('ready', 'failed');
  const label: Record<Status, string> = {
    ready: text.bulkReady,
    keep: text.bulkKeep,
    unmatched: text.bulkUnmatched,
    duplicate: text.bulkDuplicate,
    uploading: text.bulkUploadingOne,
    done: text.bulkDone,
    failed: text.bulkFailed,
  };

  return (
    <div className="modal-backdrop" onClick={running ? undefined : onClose}>
      <div className="modal card modal-wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <h2>{text.bulkTitle}</h2>
        <p className="muted">{text.bulkBody}</p>

        <h3>{text.bulkStep1}</h3>
        <p className="muted">{text.bulkStep1Body(withoutPicture)}</p>
        <button className="btn ghost" type="button" onClick={() => downloadList(products, names)}>
          {text.bulkDownload}
        </button>

        <hr className="divider" />

        <h3>{text.bulkStep2}</h3>
        <p className="muted">{text.bulkStep2Body}</p>
        <input
          ref={fileInput}
          className="file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => addFiles(e.target.files)}
        />
        <button
          type="button"
          className={`drop-zone ${dragging ? 'active' : ''}`}
          disabled={running}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}>
          {text.bulkDrop}
        </button>

        {rows.length > 0 && (
          <>
            <div className="toolbar">
              <span className="list-pill">{text.bulkCountReady(count('ready', 'uploading', 'failed'))}</span>
              {count('keep') > 0 && <span className="list-pill">{text.bulkCountKeep(count('keep'))}</span>}
              {count('unmatched', 'duplicate') > 0 && (
                <span className="list-pill">{text.bulkCountSkipped(count('unmatched', 'duplicate'))}</span>
              )}
              <label className="check">
                <input type="checkbox" checked={replace} disabled={running} onChange={(e) => toggleReplace(e.target.checked)} />
                {text.bulkReplace}
              </label>
            </div>

            <div className="table-card bulk-table">
              <table>
                <thead>
                  <tr>
                    <th>{text.colImage}</th>
                    <th>{text.bulkColFile}</th>
                    <th>{text.colProduct}</th>
                    <th>{text.bulkColStatus}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.url}>
                      <td>
                        <img className="product-thumb" src={r.url} alt="" />
                      </td>
                      <td className="ltr">{r.file.name}</td>
                      <td>{r.product ? <strong>{r.product.name}</strong> : <span className="muted">—</span>}</td>
                      <td>
                        <span className={`status ${r.status}`}>{label[r.status]}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {finished && (
          <p className={count('failed') ? 'error' : 'muted'}>{text.bulkSummary(count('done'), count('failed'))}</p>
        )}

        <div className="form-actions">
          {rows.length > 0 && !running && (
            <button className="btn ghost" type="button" onClick={clear}>
              {text.bulkClear}
            </button>
          )}
          <button className="btn ghost" type="button" onClick={onClose} disabled={running}>
            {text.bulkClose}
          </button>
          <button className="btn" type="button" onClick={upload} disabled={running || toUpload === 0}>
            {running ? text.bulkUploading(count('done', 'failed'), count('done', 'failed', 'uploading', 'ready')) : text.bulkUpload(toUpload)}
          </button>
        </div>
      </div>
    </div>
  );
}
