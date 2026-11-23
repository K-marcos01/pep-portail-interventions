import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { Plus, Trash2, X } from 'lucide-react';
import api from '../api/axios';
import type { ServiceItem, User } from '../types';

interface DraftLine {
  label: string;
  quantity: number;
  unitPriceHT: number;
  vatRate: number;
  serviceItemId?: string;
}

interface CreateQuoteModalProps {
  clients: User[];
  serviceItems: ServiceItem[];
  onClose: () => void;
  onCreated: () => void;
}

export function CreateQuoteModal({
  clients,
  serviceItems,
  onClose,
  onCreated,
}: CreateQuoteModalProps) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? '');
  const [lines, setLines] = useState<DraftLine[]>([
    { label: '', quantity: 1, unitPriceHT: 0, vatRate: 20 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { label: '', quantity: 1, unitPriceHT: 0, vatRate: 20 },
    ]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  };

  const handleSelectCatalogItem = (index: number, itemId: string) => {
    if (!itemId) {
      updateLine(index, { serviceItemId: undefined });
      return;
    }
    const found = serviceItems.find((item) => item.id === itemId);
    if (found) {
      updateLine(index, {
        serviceItemId: found.id,
        label: `${found.label} (${found.unit})`,
        unitPriceHT: found.unitPriceHT,
        vatRate: found.vatRate,
      });
    }
  };

  const totalHT = lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPriceHT,
    0,
  );
  const totalTTC = lines.reduce(
    (sum, line) =>
      sum + line.quantity * line.unitPriceHT * (1 + line.vatRate / 100),
    0,
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setError('Veuillez sélectionner un client.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      await api.post('/quotes', {
        clientId,
        lines: lines.map((l) => ({
          label: l.label,
          quantity: Number(l.quantity),
          unitPriceHT: Number(l.unitPriceHT),
          vatRate: Number(l.vatRate),
          ...(l.serviceItemId ? { serviceItemId: l.serviceItemId } : {}),
        })),
      });
      onCreated();
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message;
        setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Erreur création');
      } else {
        setError('Erreur inattendue');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Nouveau devis (Brouillon)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Client destinataire
            </label>
            <select
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">-- Sélectionner un client --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} {c.companyName ? `(${c.companyName})` : ''} —{' '}
                  {c.email}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                Lignes de prestation
              </span>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter une ligne
              </button>
            </div>

            {lines.map((line, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                {serviceItems.length > 0 && (
                  <div className="mb-2">
                    <select
                      value={line.serviceItemId ?? ''}
                      onChange={(e) =>
                        handleSelectCatalogItem(index, e.target.value)
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">
                        Saisie libre ou choisir dans le catalogue...
                      </option>
                      {serviceItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label} — {item.unitPriceHT.toFixed(2)} € HT /{' '}
                          {item.unit} (TVA {item.vatRate}%)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-12 sm:col-span-5">
                    <input
                      type="text"
                      required
                      placeholder="Libellé de la prestation"
                      value={line.label}
                      onChange={(e) =>
                        updateLine(index, { label: e.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="0.1"
                      placeholder="Qté"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(index, {
                          quantity: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="PU HT"
                      value={line.unitPriceHT}
                      onChange={(e) =>
                        updateLine(index, {
                          unitPriceHT: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="TVA %"
                      value={line.vatRate}
                      onChange={(e) =>
                        updateLine(index, {
                          vatRate: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Supprimer la ligne"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-end rounded-xl bg-slate-100 p-4 text-sm">
            <div className="flex w-56 justify-between text-slate-600">
              <span>Total HT :</span>
              <span className="font-semibold text-slate-900">
                {totalHT.toFixed(2)} €
              </span>
            </div>
            <div className="mt-1 flex w-56 justify-between text-base font-bold text-indigo-700">
              <span>Total TTC :</span>
              <span>{totalTTC.toFixed(2)} €</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Création...' : 'Enregistrer le brouillon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}