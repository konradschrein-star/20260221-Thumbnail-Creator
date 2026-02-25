'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Job {
  id: string;
  channelId: string;
  archetypeId: string;
  videoTopic: string;
  thumbnailText: string;
  customPrompt: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  channel: {
    id: string;
    name: string;
  };
  archetype: {
    id: string;
    name: string;
    imageUrl: string;
  };
}

export interface JobFilters {
  channelId?: string;
  status?: string;
}

export default function useJobs(filters?: JobFilters) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters?.channelId) params.append('channelId', filters.channelId);
      if (filters?.status) params.append('status', filters.status);

      const url = `/api/jobs${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch jobs');
      }

      setJobs(data.jobs);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [filters?.channelId, filters?.status]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return {
    jobs,
    loading,
    error,
    refetch: fetchJobs,
  };
}
