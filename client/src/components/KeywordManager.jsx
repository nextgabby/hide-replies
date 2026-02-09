import { useState, useEffect } from 'react';
import api from '../api/client';

export function KeywordManager() {
  const [keywords, setKeywords] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchKeywords();
  }, []);

  async function fetchKeywords() {
    try {
      const { keywords } = await api.getKeywords();
      setKeywords(keywords);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!input.trim()) return;

    setAdding(true);
    setError(null);
    try {
      const { added } = await api.addKeywords(input);
      setKeywords(prev => [...added, ...prev]);
      setInput('');
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteKeyword(id);
      setKeywords(prev => prev.filter(k => k.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Keywords</h3>

      <form onSubmit={handleAdd} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter keywords (comma-separated)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
            disabled={adding}
          />
          <button
            type="submit"
            disabled={adding || !input.trim()}
            className="px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Examples: spam, crypto, giveaway, follow me
        </p>
      </form>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-gray-100 rounded"></div>
          ))}
        </div>
      ) : keywords.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No keywords added yet. Add keywords to start filtering replies.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <span
              key={keyword.id}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm group"
            >
              {keyword.keyword}
              <button
                onClick={() => handleDelete(keyword.id)}
                className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default KeywordManager;
