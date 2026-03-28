'use client';

import { useState } from 'react';

export interface GeneratePayload {
  channelId: string;
  archetypeId: string;
  videoTopic: string;
  thumbnailText: string;
  customPrompt?: string;
  versionCount?: number;
  includeBrandColors?: boolean;
  includePersona?: boolean;
}

export interface JobResult {
  id: string;
  outputUrl: string;
  status: string;
  errorMessage?: string;
  fallbackUsed?: boolean;
  fallbackMessage?: string;
}

export interface GenerateResult {
  success: boolean;
  jobs: JobResult[];
  job: JobResult; // Fallback
}

export default function useGenerate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  const generateThumbnail = async (payload: GeneratePayload): Promise<GenerateResult> => {
    setLoading(true);
    setError('');
    setSuccess(false);
    setResult(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Check content-type to determine if we can parse JSON
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      if (!response.ok) {
        // For non-ok responses, safely handle JSON or text errors
        let errorMessage = 'Generation failed';

        if (isJson) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If JSON parsing fails, fall back to status text
            errorMessage = `${response.status} ${response.statusText}`;
          }
        } else {
          // For non-JSON responses (like 504 HTML pages), use status text
          errorMessage = `${response.status} ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      // Only parse JSON for successful responses
      const data = await response.json();
      setSuccess(true);
      setResult(data);
      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate thumbnail';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError('');
    setSuccess(false);
    setResult(null);
  };

  return {
    loading,
    error,
    success,
    result,
    generateThumbnail,
    reset,
  };
}
