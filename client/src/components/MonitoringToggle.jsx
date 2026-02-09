import { useState, useEffect } from 'react';
import api from '../api/client';

export function MonitoringToggle() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const { enabled } = await api.getMonitoringStatus();
      setEnabled(enabled);
    } catch (err) {
      console.error('Failed to fetch monitoring status:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle() {
    setToggling(true);
    try {
      const { enabled: newStatus } = await api.toggleMonitoring(!enabled);
      setEnabled(newStatus);
    } catch (err) {
      console.error('Failed to toggle monitoring:', err);
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="animate-pulse h-20 bg-gray-100 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Auto-Hide Monitoring</h3>
          <p className="text-sm text-gray-500 mt-1">
            {enabled
              ? 'Replies matching your keywords will be automatically hidden'
              : 'Monitoring is paused. Enable to auto-hide matching replies'}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
            enabled ? 'bg-green-500' : 'bg-gray-300'
          } ${toggling ? 'opacity-50' : ''}`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
              enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      <div className="mt-4">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            enabled
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full mr-2 ${
              enabled ? 'bg-green-500' : 'bg-gray-400'
            }`}
          ></span>
          {enabled ? 'Active' : 'Paused'}
        </span>
      </div>
    </div>
  );
}

export default MonitoringToggle;
