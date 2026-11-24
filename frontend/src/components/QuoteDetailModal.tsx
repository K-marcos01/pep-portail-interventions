import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  CheckCircle2,
  Clock,
  Play,
  Send,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import api from '../api/axios';
import type { Quote, QuoteStatus, Role } from '../types';
import { StatusBadge } from './StatusBadge';

interface QuoteDetailModalProps {
  quoteId: string;
  userRole: Role;
  onClose: () => void;
  onUpdated: () => void;
}

export function QuoteDetailModal({
  quoteId,
  userRole,
  onClose,
  onUpdated,
}: QuoteDetailModalProps) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
useEffect(() => {
    let active = true;

    api
      .get<Quote>(`/quotes/${quoteId}`)
      .then(({ data }) => {
        if (active) {
          setQuote(data);
        }
      })
      .catch(() => {
        if (active) {
          setError('Impossible de charger le détail du devis.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [quoteId]);
  const handleStatusChange = async (newStatus: QuoteStatus) => {
    setError('');
    setActionLoading(true);
    try {
      const { data } = await api.patch<Quote>(`/quotes/${quoteId}/status`, {
        status: newStatus,
      });
      setQuote(data);
      onUpdated();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message || 'Transition de statut impossible',
        );
      } else {
        setError('Erreur inattendue');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDraft = async () => {
    setError('');
    setActionLoading(true);
    try {
      await api.delete(`/quotes/${quoteId}`);
      onUpdated();
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Suppression impossible');
      }
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {quote ? `Devis ${quote.reference}` : 'Chargement...'}
            </h2>
            {quote && (
              <div className="mt-1">
                <StatusBadge status={quote.status} />
              </div>
            )}
          </div>
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

        {loading || !quote ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Chargement des détails...
          </p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  Prestataire
                </p>
                <p className="mt-1 font-medium text-slate-900">
                  {quote.provider?.fullName}
                </p>
                <p className="text-slate-600">
                  {quote.provider?.companyName || quote.provider?.email}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  Client
                </p>
                <p className="mt-1 font-medium text-slate-900">
                  {quote.client?.fullName}
                </p>
                <p className="text-slate-600">
                  {quote.client?.companyName || quote.client?.email}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-3">Prestation</th>
                    <th className="px-4 py-3 text-right">Qté</th>
                    <th className="px-4 py-3 text-right">PU HT</th>
                    <th className="px-4 py-3 text-right">Total HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {quote.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {line.label}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {line.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {line.unitPriceHT.toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {(line.quantity * line.unitPriceHT).toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-end rounded-xl bg-slate-100 p-4 text-sm">
              <div className="flex w-56 justify-between text-slate-600">
                <span>Total HT :</span>
                <span className="font-semibold text-slate-900">
                  {quote.totalHT.toFixed(2)} €
                </span>
              </div>
              <div className="mt-1 flex w-56 justify-between text-base font-bold text-indigo-700">
                <span>Total TTC :</span>
                <span>{quote.totalTTC.toFixed(2)} €</span>
              </div>
            </div>

            {/* Actions métier selon le rôle et le statut */}
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
              {userRole === 'PROVIDER' && quote.status === 'DRAFT' && (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleDeleteDraft}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer le brouillon
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleStatusChange('SENT')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Envoyer au client
                  </button>
                </>
              )}

              {userRole === 'CLIENT' && quote.status === 'SENT' && (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleStatusChange('REJECTED')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Refuser le devis
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleStatusChange('ACCEPTED')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Accepter le devis
                  </button>
                </>
              )}

              {userRole === 'PROVIDER' && quote.status === 'ACCEPTED' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  Démarrer l&apos;intervention
                </button>
              )}

              {userRole === 'PROVIDER' && quote.status === 'IN_PROGRESS' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleStatusChange('COMPLETED')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Clôturer l&apos;intervention
                </button>
              )}
            </div>

            {/* Historique de traçabilité */}
            {quote.statusHistory && quote.statusHistory.length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <Clock className="h-4 w-4 text-slate-400" />
                  Historique des statuts
                </h3>
                <ol className="space-y-2 text-xs text-slate-600">
                  {quote.statusHistory.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <StatusBadge status={entry.newStatus} />
                        {entry.changedBy && (
                          <span>
                            par <strong>{entry.changedBy.fullName}</strong>
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400">
                        {new Date(entry.changedAt).toLocaleString('fr-FR')}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}