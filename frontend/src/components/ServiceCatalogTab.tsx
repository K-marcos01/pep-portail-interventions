import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { Plus, Trash2 } from 'lucide-react';
import api from '../api/axios';
import type { ServiceItem } from '../types';

interface ServiceCatalogTabProps {
  items: ServiceItem[];
  onRefresh: () => void;
}

export function ServiceCatalogTab({
  items,
  onRefresh,
}: ServiceCatalogTabProps) {
  const [label, setLabel] = useState('');
  const [unit, setUnit] = useState('heure');
  const [unitPriceHT, setUnitPriceHT] = useState('');
  const [vatRate, setVatRate] = useState('20');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.post('/service-items', {
        label,
        unit,
        unitPriceHT: parseFloat(unitPriceHT),
        vatRate: parseFloat(vatRate),
      });
      setLabel('');
      setUnitPriceHT('');
      onRefresh();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message;
        setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Erreur ajout');
      } else {
        setError('Erreur inattendue');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/service-items/${id}`);
      onRefresh();
    } catch {
      setError('Impossible de supprimer cette prestation.');
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleAdd}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Ajouter une prestation au catalogue
        </h2>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <input
              type="text"
              required
              placeholder="Libellé (ex: Audit sécurité réseau)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <input
              type="text"
              required
              placeholder="Unité (heure, forfait)"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <input
              type="number"
              required
              min="0"
              step="0.01"
              placeholder="Prix HT (€)"
              value={unitPriceHT}
              onChange={(e) => setUnitPriceHT(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-1">
            <input
              type="number"
              required
              min="0"
              max="100"
              step="0.1"
              placeholder="TVA %"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Aucune prestation enregistrée dans votre catalogue.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="px-5 py-3.5">Libellé</th>
                <th className="px-5 py-3.5">Unité</th>
                <th className="px-5 py-3.5 text-right">Prix unitaire HT</th>
                <th className="px-5 py-3.5 text-right">TVA</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    {item.label}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{item.unit}</td>
                  <td className="px-5 py-3.5 text-right font-medium text-slate-900">
                    {item.unitPriceHT.toFixed(2)} €
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-600">
                    {item.vatRate} %
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}