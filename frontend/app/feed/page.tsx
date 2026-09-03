'use client';

import FeedList from '@/components/feed/FeedList';
import UserDiscovery from '@/components/feed/UserDiscovery';
import MyProfileView from '@/components/feed/MyProfileView';
import { useFeed } from '@/components/feed/useFeed';
import type { FeedScope } from '@/types/feed';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

type TabScope = FeedScope | 'discover';

const TABS: { scope: TabScope; label: string; empty?: string }[] = [
  {
    scope: 'following',
    label: 'FOLLOWING',
    empty:
      'Nothing here yet. Follow some people, or finish a workout and it will show up.',
  },
  {
    scope: 'discover',
    label: 'DISCOVER',
  },
  {
    scope: 'me',
    label: 'MY PROFILE',
    empty: 'Finish a workout and it will appear here.',
  },
];

export default function FeedPage() {
  const router = useRouter();
  const [scope, setScope] = useState<TabScope>('following');

  // Feed hooks shouldn't fetch when we're in discovery mode
  const feedScope: FeedScope = scope === 'discover' ? 'following' : scope;
  const feed = useFeed({ scope: feedScope });

  const active = TABS.find((tab) => tab.scope === scope) ?? TABS[0];

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6 md:p-12 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="border-b border-neutral-800 pb-5">
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => router.push('/')}
              className="text-neutral-500 hover:text-white transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-indigo-400">
              Activity
            </h1>
          </div>

          <div className="flex gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.scope}
                onClick={() => setScope(tab.scope)}
                className={`flex-1 py-2.5 rounded-xl font-mono text-xs tracking-widest transition-colors border ${
                  scope === tab.scope
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {scope === 'discover' ? (
          <UserDiscovery />
        ) : scope === 'me' ? (
          <MyProfileView feed={feed} emptyMessage={active.empty || ''} />
        ) : (
          <FeedList
            events={feed.events}
            loading={feed.loading}
            loadingMore={feed.loadingMore}
            error={feed.error}
            hasMore={feed.hasMore}
            emptyMessage={active.empty || ''}
            onRetry={feed.refetch}
            onLoadMore={feed.loadMore}
            onToggleLike={feed.toggleEventLike}
            onCommentCountChange={feed.setCommentCount}
          />
        )}
      </div>
    </main>
  );
}
