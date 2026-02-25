'use client';

import { useState } from 'react';
import ErrorMessage from '../shared/ErrorMessage';
import JobRow from './JobRow';
import { spacing, colors, commonStyles } from '../../styles';
import useJobs from '../../hooks/useJobs';
import useChannels from '../../hooks/useChannels';

export default function JobHistoryTable() {
  const { channels } = useChannels();
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { jobs, loading, error } = useJobs({
    channelId: channelFilter || undefined,
    status: statusFilter || undefined,
  });

  if (loading && jobs.length === 0) {
    return <div style={{ textAlign: 'center', padding: spacing.xl }}>Loading jobs...</div>;
  }

  return (
    <div>
      <h2 style={{ marginBottom: spacing.lg }}>Job History</h2>

      {/* Filters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        {/* Channel Filter */}
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: spacing.sm,
              fontWeight: '500',
              color: colors.text,
            }}
          >
            Filter by Channel
          </label>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            style={{
              padding: '0.625rem',
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              fontSize: '1rem',
              width: '100%',
              fontFamily: 'inherit',
            }}
          >
            <option value="">All Channels</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: spacing.sm,
              fontWeight: '500',
              color: colors.text,
            }}
          >
            Filter by Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.625rem',
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              fontSize: '1rem',
              width: '100%',
              fontFamily: 'inherit',
            }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {jobs.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: spacing.xxl,
            backgroundColor: colors.background,
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: spacing.md }}>📋</div>
          <h3 style={{ color: colors.textLight }}>No generation jobs yet</h3>
          <p style={{ color: colors.textMuted }}>
            {channelFilter || statusFilter
              ? 'No jobs match your filters'
              : 'Generated thumbnails will appear here'}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={commonStyles.table}>
            <thead>
              <tr>
                <th style={commonStyles.tableHeader}>Timestamp</th>
                <th style={commonStyles.tableHeader}>Channel</th>
                <th style={commonStyles.tableHeader}>Archetype</th>
                <th style={commonStyles.tableHeader}>Video Topic</th>
                <th style={commonStyles.tableHeader}>Status</th>
                <th style={commonStyles.tableHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
