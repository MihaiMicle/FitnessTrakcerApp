'use client';
import { useState, useEffect } from 'react';
import { searchUsers, followUser, unfollowUser } from '@/lib/social/api';
import { PublicUserSummary } from '@/types/social';
import { Search, UserPlus, UserMinus, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { displayName } from '@/lib/social/visibility';
import toast from 'react-hot-toast';

export default function UserDiscovery() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicUserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true);
        try {
          const res = await searchUsers(query);
          setResults(res.results);
        } catch (e) {
          toast.error('Search failed');
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleToggleFollow = async (
    e: React.MouseEvent,
    user: PublicUserSummary,
  ) => {
    e.stopPropagation();
    try {
      if (
        user.relationship === 'following' ||
        user.relationship === 'requested'
      ) {
        await unfollowUser(user.id);
        setResults((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, relationship: 'none' } : u,
          ),
        );
      } else {
        const res = await followUser(user.id);
        setResults((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, relationship: res.relationship } : u,
          ),
        );
      }
    } catch (err) {
      toast.error('Failed to update follow status');
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
        />
        <input
          type="text"
          placeholder="Search users by name or handle..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono"
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-neutral-500 font-mono text-sm animate-pulse">
          Searching...
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-3">
          {results.map((user) => (
            <div
              key={user.id}
              onClick={() => {
                if (user.username) router.push(`/users/${user.username}`);
              }}
              className="flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-xl cursor-pointer hover:border-indigo-500/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    className="w-10 h-10 rounded-full object-cover border border-neutral-700"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-bold text-neutral-400 group-hover:text-indigo-400 transition-colors">
                    {displayName(user).charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {displayName(user)}
                  </p>
                  <p className="text-xs font-mono text-neutral-500">
                    @{user.username}
                  </p>
                </div>
              </div>

              {user.relationship !== 'self' && (
                <button
                  onClick={(e) => handleToggleFollow(e, user)}
                  className={`p-2 rounded-lg transition-colors ${
                    user.relationship === 'following'
                      ? 'bg-neutral-800 text-white hover:bg-rose-500/20 hover:text-rose-400'
                      : user.relationship === 'requested'
                        ? 'bg-neutral-800 text-neutral-400'
                        : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white'
                  }`}
                  title={
                    user.relationship === 'following'
                      ? 'Unfollow'
                      : user.relationship === 'requested'
                        ? 'Requested'
                        : 'Follow'
                  }
                >
                  {user.relationship === 'following' ? (
                    <UserMinus size={18} />
                  ) : user.relationship === 'requested' ? (
                    <Clock size={18} />
                  ) : (
                    <UserPlus size={18} />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : query.trim().length >= 2 ? (
        <div className="text-center py-8 text-neutral-500 font-mono text-sm">
          No users found.
        </div>
      ) : (
        <div className="text-center py-8 text-neutral-500 font-mono text-sm">
          Type at least 2 characters to search.
        </div>
      )}
    </div>
  );
}
