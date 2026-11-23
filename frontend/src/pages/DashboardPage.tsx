import { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  FolderKanban,
  LogOut,
  Plus,
  Wrench,
} from 'lucide-react';
import api from '../api/axios';
import { CreateQuoteModal } from '../components/CreateQuoteModal';
import { QuoteDetailModal } from '../components/QuoteDetailModal';
import { ServiceCatalogTab } from '../components/ServiceCatalogTab';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import type { Quote, QuoteStatus, ServiceItem, User } from '../types';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const isProvider = user?.role === 'PROVIDER';

  const [activeTab, setActiveTab] = useState<'quotes' | 'catalog'>('quotes');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const quotesRes = await api.get<Quote[]>('/quotes');
      setQuotes(quotesRes.data);

      if (isProvider) {
        const [clientsRes, itemsRes] = await Promise.all([
          api.get<User[]>('/quotes/clients'),
          api.get<ServiceItem[]>('/service-items'),
        ]);
        setClients(clientsRes.data);
        setServiceItems(itemsRes.data);
      }
    } finally {
      setLoading(false);
    }
  }, [isProvider]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredQuotes =
    statusFilter === 'ALL'
      ? quotes
      : quotes.filter((q) => q.status === statusFilter);

  const pendingCount = quotes.filter((q) => q.status === 'SENT').length;
  const activeInterventionsCount = quotes.filter(
    (q) => q.status === 'ACCEPTED' || q.status === 'IN_PROGRESS',
  ).length;
  const validatedRevenueTTC = quotes
    .filter((q) =>
      ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(q.status),
    )
    .reduce((sum, q) => sum + q.totalTTC, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 text-indigo-600">
            <Wrench className="h-6 w-6" />
            <span className="text-lg font-bold text-slate-900">
              Portail Interventions
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p className="font-medium text-slate-900">{user?.fullName}</p>
              <p className="text-xs text-slate-500">
                {isProvider ? 'Espace Prestataire' : 'Espace Client'}
              </p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {/* Indicateurs clés */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Devis en attente de réponse
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-600">
              {pendingCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Interventions à planifier / en cours
            </p>
            <p className="mt-2 text-2xl font-bold text-indigo-600">
              {activeInterventionsCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Volume validé (TTC)
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {validatedRevenueTTC.toFixed(2)} €
            </p>
          </div>
        </div>

        {/* Navigation par onglets (Prestataire) */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('quotes')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === 'quotes'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileText className="h-4 w-4" />
              Devis &amp; Interventions ({quotes.length})
            </button>

            {isProvider && (
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activeTab === 'catalog'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FolderKanban className="h-4 w-4" />
                Catalogue Prestations ({serviceItems.length})
              </button>
            )}
          </div>

          {isProvider && activeTab === 'quotes' && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Nouveau devis
            </button>
          )}
        </div>

        {activeTab === 'catalog' && isProvider ? (
          <ServiceCatalogTab items={serviceItems} onRefresh={loadData} />
        ) : (
          <div className="space-y-4">
            {/* Filtres de statut */}
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['ALL', 'Tous'],
                  ...(isProvider ? [['DRAFT', 'Brouillons']] : []),
                  ['SENT', 'Envoyés'],
                  ['ACCEPTED', 'Acceptés'],
                  ['IN_PROGRESS', 'En cours'],
                  ['COMPLETED', 'Terminés'],
                  ['REJECTED', 'Refusés'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value as QuoteStatus | 'ALL')}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    statusFilter === value
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tableau des devis */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {loading ? (
                <p className="p-8 text-center text-sm text-slate-500">
                  Chargement des devis...
                </p>
              ) : filteredQuotes.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-500">
                  Aucun devis à afficher pour ce filtre.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                      <tr>
                        <th className="px-5 py-3.5">Référence</th>
                        <th className="px-5 py-3.5">
                          {isProvider ? 'Client' : 'Prestataire'}
                        </th>
                        <th className="px-5 py-3.5">Date</th>
                        <th className="px-5 py-3.5 text-right">Montant TTC</th>
                        <th className="px-5 py-3.5">Statut</th>
                        <th className="px-5 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredQuotes.map((quote) => {
                        const party = isProvider
                          ? quote.client
                          : quote.provider;
                        return (
                          <tr
                            key={quote.id}
                            onClick={() => setSelectedQuoteId(quote.id)}
                            className="cursor-pointer transition hover:bg-slate-50"
                          >
                            <td className="px-5 py-4 font-semibold text-indigo-600">
                              {quote.reference}
                            </td>
                            <td className="px-5 py-4">
                              <p className="font-medium text-slate-900">
                                {party?.fullName}
                              </p>
                              {party?.companyName && (
                                <p className="text-xs text-slate-500">
                                  {party.companyName}
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {new Date(quote.createdAt).toLocaleDateString(
                                'fr-FR',
                              )}
                            </td>
                            <td className="px-5 py-4 text-right font-semibold text-slate-900">
                              {quote.totalTTC.toFixed(2)} €
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge status={quote.status} />
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedQuoteId(quote.id);
                                }}
                                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                              >
                                Ouvrir
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {showCreateModal && (
        <CreateQuoteModal
          clients={clients}
          serviceItems={serviceItems}
          onClose={() => setShowCreateModal(false)}
          onCreated={loadData}
        />
      )}

      {selectedQuoteId && user && (
        <QuoteDetailModal
          quoteId={selectedQuoteId}
          userRole={user.role}
          onClose={() => setSelectedQuoteId(null)}
          onUpdated={loadData}
        />
      )}
    </div>
  );
}