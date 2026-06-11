import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clientsApi } from '../api/clients';

export function ClientsPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => clientsApi.list({ search: search || undefined, limit: '50' }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Klienti</h2>
        <Link to="/clients/new" className="btn-primary !py-2 !px-4 !min-h-0 text-sm">
          + Jauns
        </Link>
      </div>

      <input
        className="input-field"
        placeholder="Meklēt pēc klienta, objekta, adreses, koda..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Ielādē...</div>
      ) : data?.data.length === 0 ? (
        <div className="card text-center text-gray-500 py-8">
          Nav klientu.{' '}
          <Link to="/clients/new" className="text-primary-600 font-medium">
            Pievienot pirmo →
          </Link>
        </div>
      ) : (
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 xl:grid-cols-3">
          {data?.data.map((client) => (
            <Link
              key={client.id}
              to={`/clients/${client.id}`}
              className="card block active:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-medium text-gray-900">{client.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {client.client_type === 'company' ? 'Uzņēmums' : 'Privātpersona'}
                    {client.city ? ` · ${client.city}` : ''}
                  </p>
                  {client.phone && (
                    <p className="text-sm text-gray-500">{client.phone}</p>
                  )}
                </div>
                <span className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-lg whitespace-nowrap">
                  {client.object_count ?? 0} obj.
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
