'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getUserProfile, followUser, unfollowUser } from '@/lib/social/api';
import { PublicUserProfile } from '@/types/social';
import { displayName } from '@/lib/social/visibility';
import FeedList from '@/components/feed/FeedList';
import { useFeed } from '@/components/feed/useFeed';
import { ChevronLeft, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UserProfileClient({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const router = useRouter();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserProfile(username)
      .then(setProfile)
      .catch(() => toast.error('User not found'))
      .finally(() => setLoading(false));
  }, [username]);

  const feed = useFeed({ scope: 'user', userId: profile?.id });

  const handleToggleFollow = async () => {
    if (!profile) return;
    try {
      if (
        profile.relationship === 'following' ||
        profile.relationship === 'requested'
      ) {
        await unfollowUser(profile.id);
        setProfile({ ...profile, relationship: 'none' });
      } else {
        const res = await followUser(profile.id);
        setProfile({ ...profile, relationship: res.relationship });
      }
    } catch (err) {
      toast.error('Failed to update follow status');
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-neutral-950 p-8 text-neutral-500 font-mono text-center animate-pulse">
        Loading profile...
      </div>
    );
  if (!profile)
    return (
      <div className="min-h-screen bg-neutral-950 p-8 text-neutral-500 font-mono text-center">
        User not found.
      </div>
    );

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6 md:p-12 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="mb-6">
          <div className="flex items-center justify-between mb-4 px-1">
            <button
              onClick={() => router.back()}
              className="text-neutral-500 hover:text-white transition-colors"
            >
              <ChevronLeft size={28} />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-white flex-1 text-center truncate">
              {profile.username}
            </h1>
            <div className="w-7"></div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 sm:p-6 shadow-sm">
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

            <div className="mb-4">
              <p className="font-bold text-sm text-white">
                {displayName(profile)}
              </p>
              {profile.bio && (
                <p className="text-sm text-neutral-300 mt-1 leading-relaxed">
                  {profile.bio}
                </p>
              )}
            </div>

            {profile.relationship !== 'self' && (
              <button
                onClick={handleToggleFollow}
                className={`w-full py-2.5 rounded-lg text-sm font-bold transition-colors active:scale-95 ${
                  profile.relationship === 'following'
                    ? 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700'
                    : profile.relationship === 'requested'
                      ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {profile.relationship === 'following'
                  ? 'Following'
                  : profile.relationship === 'requested'
                    ? 'Requested'
                    : 'Follow'}
              </button>
            )}
          </div>
        </header>

        {profile.can_view_content ? (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 tracking-wider uppercase px-1">
              Posts
            </h3>
            <FeedList
              events={feed.events}
              loading={feed.loading}
              loadingMore={feed.loadingMore}
              error={feed.error}
              hasMore={feed.hasMore}
              emptyMessage="No posts yet."
              onRetry={feed.refetch}
              onLoadMore={feed.loadMore}
              onToggleLike={feed.toggleEventLike}
              onCommentCountChange={feed.setCommentCount}
            />
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20 text-neutral-500 font-mono text-sm">
            <Lock size={48} className="text-neutral-800 mb-4" />
            <p>This account is private.</p>
            <p className="text-xs mt-2">Follow to see their posts.</p>
          </div>
        )}
      </div>
    </main>
  );
}
