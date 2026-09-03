'use client';
import { useEffect, useState, useMemo } from 'react';
import { getSocialSettings, getUserProfile } from '@/lib/social/api';
import { PublicUserProfile } from '@/types/social';
import FeedList from './FeedList';
import { displayName } from '@/lib/social/visibility';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Activity,
  Dumbbell,
  Ruler,
  Calendar as CalendarIcon,
  Settings,
  Edit3,
} from 'lucide-react';
import { FeedEventItem } from '@/types/feed';

export default function MyProfileView({ feed, emptyMessage }: any) {
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [needsUsername, setNeedsUsername] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getSocialSettings()
      .then((settings) => {
        if (settings.username) {
          getUserProfile(settings.username)
            .then(setProfile)
            .catch(() => {});
        } else {
          setNeedsUsername(true);
        }
      })
      .catch(() => {});
  }, []);

  // Calculate chart data from the feed's recent workouts
  const chartData = useMemo(() => {
    if (!feed?.events) return [];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const dataMap = last7Days.reduce(
      (acc, date) => ({ ...acc, [date]: 0 }),
      {} as Record<string, number>,
    );

    feed.events.forEach((event: FeedEventItem) => {
      if (event.event_type === 'workout' && event.occurred_at) {
        const date = event.occurred_at.split('T')[0];
        if (dataMap[date] !== undefined) {
          dataMap[date] += Math.floor(
            (event.payload.duration_seconds || 0) / 60,
          );
        }
      }
    });

    return last7Days.map((date) => ({
      date: new Date(date).toLocaleDateString(undefined, { weekday: 'short' }),
      minutes: dataMap[date],
    }));
  }, [feed?.events]);

  const workoutsCount =
    feed?.events?.filter((e: FeedEventItem) => e.event_type === 'workout')
      .length || 0;

  return (
    <div className="space-y-6">
      {profile ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 sm:p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {profile.username}
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/?profile=open')}
                className="text-neutral-400 hover:text-white transition"
              >
                <Edit3 size={20} />
              </button>
              <button
                onClick={() => router.push('/settings')}
                className="text-neutral-400 hover:text-white transition"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6 mb-6">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-neutral-800"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-neutral-800 flex items-center justify-center text-3xl font-bold text-neutral-400 border-2 border-neutral-700">
                {displayName(profile).charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1 flex justify-around text-center">
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white">
                  {workoutsCount}
                </span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">
                  Workouts
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white">
                  {profile.followers_count}
                </span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">
                  Followers
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white">
                  {profile.following_count}
                </span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">
                  Following
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <p className="font-bold text-sm text-white">
              {displayName(profile)}
            </p>
            {profile.bio && (
              <p className="text-sm text-neutral-300 mt-1">{profile.bio}</p>
            )}
          </div>

          <div className="border-t border-neutral-800/50 pt-5 mb-5">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">This week</h3>
                <p className="text-xs text-neutral-500 font-mono">
                  Minutes trained
                </p>
              </div>
            </div>
            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="date" hide />
                  <Tooltip
                    cursor={{ fill: '#262626' }}
                    contentStyle={{
                      backgroundColor: '#0a0a0a',
                      borderColor: '#262626',
                      borderRadius: '8px',
                    }}
                    itemStyle={{ color: '#6366f1', fontWeight: 'bold' }}
                    labelStyle={{ color: '#737373', fontSize: '12px' }}
                  />
                  <Bar dataKey="minutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-neutral-800/50 pt-5">
            <button
              onClick={() => router.push('/workouts')}
              className="flex items-center gap-3 p-3 bg-neutral-950 border border-neutral-800 rounded-xl hover:border-indigo-500/50 transition text-left"
            >
              <Activity className="text-indigo-400" size={20} />
              <span className="text-sm font-bold text-white">Statistics</span>
            </button>
            <button
              onClick={() => router.push('/workouts')}
              className="flex items-center gap-3 p-3 bg-neutral-950 border border-neutral-800 rounded-xl hover:border-indigo-500/50 transition text-left"
            >
              <Dumbbell className="text-indigo-400" size={20} />
              <span className="text-sm font-bold text-white">Exercises</span>
            </button>
            <button
              onClick={() => router.push('/?profile=open')}
              className="flex items-center gap-3 p-3 bg-neutral-950 border border-neutral-800 rounded-xl hover:border-indigo-500/50 transition text-left"
            >
              <Ruler className="text-indigo-400" size={20} />
              <span className="text-sm font-bold text-white">Measures</span>
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-3 p-3 bg-neutral-950 border border-neutral-800 rounded-xl hover:border-indigo-500/50 transition text-left"
            >
              <CalendarIcon className="text-indigo-400" size={20} />
              <span className="text-sm font-bold text-white">Calendar</span>
            </button>
          </div>
        </div>
      ) : needsUsername ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
          <p className="text-neutral-400 font-mono text-sm mb-4">
            You haven't set up a public handle yet.
          </p>
          <button
            onClick={() => router.push('/settings')}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold font-mono text-xs transition-colors"
          >
            Set Username in Settings
          </button>
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex animate-pulse h-64" />
      )}

      <div className="pt-2">
        <h3 className="text-xs font-bold text-neutral-500 tracking-wider uppercase mb-4 px-1">
          Workouts
        </h3>
        <FeedList
          events={feed.events}
          loading={feed.loading}
          loadingMore={feed.loadingMore}
          error={feed.error}
          hasMore={feed.hasMore}
          emptyMessage={emptyMessage}
          onRetry={feed.refetch}
          onLoadMore={feed.loadMore}
          onToggleLike={feed.toggleEventLike}
          onCommentCountChange={feed.setCommentCount}
        />
      </div>
    </div>
  );
}
