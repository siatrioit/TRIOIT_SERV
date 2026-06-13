import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import type { IncidentMessage } from '../../api/incidentMessages';
import { incidentMessagesApi } from '../../api/incidentMessages';
import { portalIncidentsApi } from '../../api/portalIncidents';
import { formatUnreadMessageBadge } from '../../utils/unreadMessages';

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

function clearUnreadInListCache(
  queryClient: ReturnType<typeof useQueryClient>,
  incidentId: string,
  variant: 'staff' | 'portal'
) {
  const listKey = variant === 'portal' ? 'portal-incidents' : 'incidents';
  queryClient.setQueriesData<{ data: Array<{ id: string; unread_count?: number }> }>(
    { queryKey: [listKey] },
    (old) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: old.data.map((item) =>
          item.id === incidentId ? { ...item, unread_count: 0 } : item
        ),
      };
    }
  );
}

async function markThreadRead(
  incidentId: string,
  variant: 'staff' | 'portal',
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: readonly unknown[]
) {
  if (variant === 'portal') {
    await portalIncidentsApi.markRead(incidentId);
  } else {
    await incidentMessagesApi.markRead(incidentId);
  }
  clearUnreadInListCache(queryClient, incidentId, variant);
  await queryClient.invalidateQueries({
    queryKey: variant === 'portal' ? ['portal-incidents'] : ['incidents'],
  });
  queryClient.setQueryData<{ data: IncidentMessage[] }>(queryKey, (old) => {
    if (!old?.data) return old;
    return {
      ...old,
      data: old.data.map((msg) => ({ ...msg, is_unread: false })),
    };
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
  const markedReadRef = useRef(false);
  const hadUnreadOnOpen = useRef(false);
  const capturedInitial = useRef(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const queryKey =
    variant === 'portal'
      ? ['portal-incident-messages', incidentId]
      : ['incident-messages', incidentId];

  const { data, isLoading, isFetched } = useQuery({
    queryKey,
    queryFn: () =>
      variant === 'portal'
        ? portalIncidentsApi.listMessages(incidentId)
        : incidentMessagesApi.list(incidentId),
    refetchInterval: 15_000,
  });

  const messages = data?.data ?? [];
  const unreadMessages = messages.filter((msg) => msg.is_unread);

  useEffect(() => {
    markedReadRef.current = false;
    hadUnreadOnOpen.current = false;
    capturedInitial.current = false;
  }, [incidentId, variant]);

  useEffect(() => {
    if (!isFetched || !data || markedReadRef.current || capturedInitial.current) return;

    capturedInitial.current = true;
    hadUnreadOnOpen.current = (data.data ?? []).some((msg) => msg.is_unread);

    const delayMs = hadUnreadOnOpen.current ? 2000 : 0;
    let cancelled = false;

    const timer = window.setTimeout(() => {
      if (cancelled || markedReadRef.current) return;

      markThreadRead(incidentId, variant, queryClient, queryKey)
        .then(() => {
          markedReadRef.current = true;
        })
        .catch(() => {
          /* ignore */
        });
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isFetched, data, incidentId, variant, queryClient, queryKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      variant === 'portal'
        ? portalIncidentsApi.sendMessage(incidentId, body)
        : incidentMessagesApi.send(incidentId, body),
    onSuccess: async () => {
      setText('');
      setError('');
      await queryClient.invalidateQueries({ queryKey });
      try {
        await markThreadRead(incidentId, variant, queryClient, queryKey);
        markedReadRef.current = true;
      } catch {
        /* ignore */
      }
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

  const showComposer = canPost && !incidentClosed;
  const unreadLabel =
    variant === 'portal'
      ? `${formatUnreadMessageBadge(unreadMessages.length)} no meistara`
      : `${formatUnreadMessageBadge(unreadMessages.length)} no klienta`;

  return (
    <section className="card">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-medium text-gray-800">Saziņa</h3>
        {unreadMessages.length > 0 && (
          <span className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-medium shrink-0">
            {unreadLabel}
          </span>
        )}
      </div>

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
            const isUnreadIncoming = Boolean(msg.is_unread) && !isMine;
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
                      : isUnreadIncoming
                        ? 'bg-white border-2 border-amber-300 text-gray-800 shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  <p className={`text-xs mb-1 ${isMine ? 'text-white/80' : 'text-gray-500'}`}>
                    {msg.author_name} · {formatTime(msg.created_at)}
                    {isUnreadIncoming && (
                      <span className="ml-1 font-medium text-amber-700">· Jauna</span>
                    )}
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
