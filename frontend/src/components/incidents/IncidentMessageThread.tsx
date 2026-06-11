import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import type { IncidentMessage } from '../../api/incidentMessages';
import { incidentMessagesApi } from '../../api/incidentMessages';
import { portalIncidentsApi } from '../../api/portalIncidents';

type IncidentMessageThreadProps = {
  incidentId: string;
  variant: 'staff' | 'portal';
  canPost?: boolean;
  incidentClosed?: boolean;
};

function formatTime(value: string) {
  return new Date(value).toLocaleString('lv-LV', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function IncidentMessageThread({
  incidentId,
  variant,
  canPost = true,
  incidentClosed = false,
}: IncidentMessageThreadProps) {
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const queryKey = variant === 'portal'
    ? ['portal-incident-messages', incidentId]
    : ['incident-messages', incidentId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      variant === 'portal'
        ? portalIncidentsApi.listMessages(incidentId)
        : incidentMessagesApi.list(incidentId),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const markRead = async () => {
      try {
        if (variant === 'portal') {
          await portalIncidentsApi.markRead(incidentId);
        } else {
          await incidentMessagesApi.markRead(incidentId);
        }
        if (variant === 'portal') {
          await queryClient.invalidateQueries({ queryKey: ['portal-incidents'] });
        } else {
          await queryClient.invalidateQueries({ queryKey: ['incidents'] });
        }
      } catch {
        /* ignore */
      }
    };
    markRead();
  }, [incidentId, variant, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.data.length]);

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      variant === 'portal'
        ? portalIncidentsApi.sendMessage(incidentId, body)
        : incidentMessagesApi.send(incidentId, body),
    onSuccess: () => {
      setText('');
      setError('');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Neizdevās nosūtīt'
      );
    },
  });

  const messages = data?.data ?? [];
  const showComposer = canPost && !incidentClosed;

  return (
    <section className="card">
      <h3 className="font-medium text-gray-800 mb-3">Saziņa</h3>

      <div
        className={`max-h-72 overflow-y-auto space-y-3 mb-4 rounded-xl border border-gray-100 p-3 ${
          messages.length === 0 ? 'bg-gray-50' : 'bg-gray-50/50'
        }`}
      >
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-6">Ielādē ziņas...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            Vēl nav ziņu. Uzrakstiet, lai sazinātos ar{' '}
            {variant === 'portal' ? 'meistaru' : 'klientu'}.
          </p>
        ) : (
          messages.map((msg: IncidentMessage) => {
            const isMine =
              variant === 'portal' ? msg.author_type === 'portal' : msg.author_type === 'staff';
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    isMine
                      ? variant === 'portal'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-primary-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  <p className={`text-xs mb-1 ${isMine ? 'text-white/80' : 'text-gray-500'}`}>
                    {msg.author_name} · {formatTime(msg.created_at)}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-3 py-2 rounded-xl text-sm mb-3">{error}</div>
      )}

      {showComposer ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const body = text.trim();
            if (!body) return;
            sendMutation.mutate(body);
          }}
          className="flex gap-2"
        >
          <textarea
            className="input-field min-h-[44px] max-h-32 flex-1 py-2 text-sm resize-none"
            placeholder="Rakstiet ziņu..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const body = text.trim();
                if (body && !sendMutation.isPending) sendMutation.mutate(body);
              }
            }}
          />
          <button
            type="submit"
            className={
              variant === 'portal'
                ? 'shrink-0 bg-emerald-600 text-white font-medium rounded-xl px-4 min-h-[44px] hover:bg-emerald-700 disabled:opacity-50'
                : 'btn-primary !min-h-[44px] !py-2 !px-4 shrink-0'
            }
            disabled={sendMutation.isPending || !text.trim()}
          >
            {sendMutation.isPending ? '...' : 'Sūtīt'}
          </button>
        </form>
      ) : incidentClosed ? (
        <p className="text-sm text-gray-500">Izsaukums ir slēgts — jaunas ziņas vairs nevar sūtīt.</p>
      ) : null}
    </section>
  );
}
