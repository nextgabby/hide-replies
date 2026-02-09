import { useState, useEffect } from 'react';
import api from '../api/client';

export function HiddenRepliesList() {
  const [replies, setReplies] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [unhiding, setUnhiding] = useState(null);

  useEffect(() => {
    fetchReplies(1);
  }, []);

  async function fetchReplies(page) {
    setLoading(true);
    try {
      const { replies, pagination } = await api.getHiddenReplies(page);
      setReplies(replies);
      setPagination(pagination);
    } catch (err) {
      console.error('Failed to fetch replies:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnhide(id) {
    setUnhiding(id);
    try {
      await api.unhideReply(id);
      setReplies(prev =>
        prev.map(r => (r.id === id ? { ...r, is_hidden: false } : r))
      );
    } catch (err) {
      console.error('Failed to unhide reply:', err);
    } finally {
      setUnhiding(null);
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hidden Replies</h3>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Hidden Replies</h3>

      {replies.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No hidden replies yet. Replies matching your keywords will appear here.
        </p>
      ) : (
        <>
          <div className="space-y-4">
            {replies.map((reply) => (
              <div
                key={reply.id}
                className={`p-4 rounded-lg border ${
                  reply.is_hidden
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">
                        @{reply.reply_author_username || 'unknown'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(reply.hidden_at)}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm line-clamp-2">
                      {reply.reply_text}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        Matched: {reply.matched_keyword}
                      </span>
                      {!reply.is_hidden && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Unhidden
                        </span>
                      )}
                    </div>
                  </div>
                  {reply.is_hidden && (
                    <button
                      onClick={() => handleUnhide(reply.id)}
                      disabled={unhiding === reply.id}
                      className="ml-4 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {unhiding === reply.id ? 'Unhiding...' : 'Unhide'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => fetchReplies(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchReplies(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default HiddenRepliesList;
