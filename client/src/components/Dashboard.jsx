import { useState, useEffect } from 'react';
import api from '../api/client';
import MonitoringToggle from './MonitoringToggle';
import KeywordManager from './KeywordManager';
import HiddenRepliesList from './HiddenRepliesList';

export function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const stats = await api.getStats();
      setStats(stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }

  async function handleScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const result = await api.runScan();
      setScanResult(result);
      fetchStats();
    } catch (err) {
      console.error('Scan failed:', err);
      setScanResult({ error: err.message });
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">X Reply Hider</h1>
        <p className="text-gray-600 mt-1">
          Automatically hide replies containing specific keywords
        </p>
      </div>

      {/* User Info */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold">@{user.x_username}</h2>
            <p className="text-sm text-gray-500">Monitoring replies to your posts</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
          <div className="text-3xl font-bold text-gray-900">
            {stats?.totalHidden ?? '-'}
          </div>
          <div className="text-sm text-gray-500 mt-1">Total Hidden</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
          <div className="text-3xl font-bold text-gray-900">
            {stats?.hiddenToday ?? '-'}
          </div>
          <div className="text-sm text-gray-500 mt-1">Hidden Today</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
          <div className="text-3xl font-bold text-gray-900">
            {stats?.activeKeywords ?? '-'}
          </div>
          <div className="text-sm text-gray-500 mt-1">Active Keywords</div>
        </div>
      </div>

      {/* Monitoring Toggle */}
      <div className="mb-6">
        <MonitoringToggle />
      </div>

      {/* Manual Scan */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Historical Scan</h3>
            <p className="text-sm text-gray-500 mt-1">
              Scan recent replies to your posts for matching keywords
            </p>
          </div>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {scanning ? 'Scanning...' : 'Run Scan'}
          </button>
        </div>
        {scanResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            {scanResult.error ? (
              <p className="text-red-600">{scanResult.error}</p>
            ) : (
              <p className="text-gray-700">
                Scanned {scanResult.tweetsScanned} tweets, processed{' '}
                {scanResult.repliesProcessed} replies, hidden{' '}
                <span className="font-semibold">{scanResult.repliesHidden}</span> replies.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Keywords */}
      <div className="mb-6">
        <KeywordManager />
      </div>

      {/* Hidden Replies */}
      <HiddenRepliesList />
    </div>
  );
}

export default Dashboard;
