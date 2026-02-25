'use client';

import { useState } from 'react';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { spacing, colors, borderRadius } from '../../styles';
import type { Job } from '../../hooks/useJobs';

interface JobRowProps {
  job: Job;
}

export default function JobRow({ job }: JobRowProps) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: Job['status']) => {
    const styles: Record<Job['status'], { bg: string; color: string; text: string }> = {
      pending: { bg: colors.warningLight, color: colors.warning, text: 'Pending' },
      processing: { bg: colors.primaryLight, color: colors.primary, text: 'Processing' },
      completed: { bg: colors.successLight, color: colors.success, text: 'Completed' },
      failed: { bg: colors.errorLight, color: colors.error, text: 'Failed' },
    };

    const style = styles[status];

    return (
      <span
        style={{
          backgroundColor: style.bg,
          color: style.color,
          padding: '0.25rem 0.75rem',
          borderRadius: borderRadius.full,
          fontSize: '0.875rem',
          fontWeight: '500',
        }}
      >
        {style.text}
      </span>
    );
  };

  const truncateText = (text: string, maxLength: number = 40): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <>
      <tr>
        <td style={{ padding: '0.75rem', borderBottom: `1px solid ${colors.border}` }}>
          {formatDate(job.createdAt)}
        </td>
        <td style={{ padding: '0.75rem', borderBottom: `1px solid ${colors.border}` }}>
          {job.channel.name}
        </td>
        <td style={{ padding: '0.75rem', borderBottom: `1px solid ${colors.border}` }}>
          {job.archetype.name}
        </td>
        <td style={{ padding: '0.75rem', borderBottom: `1px solid ${colors.border}` }}>
          {truncateText(job.videoTopic)}
        </td>
        <td style={{ padding: '0.75rem', borderBottom: `1px solid ${colors.border}` }}>
          {getStatusBadge(job.status)}
        </td>
        <td style={{ padding: '0.75rem', borderBottom: `1px solid ${colors.border}` }}>
          {job.status === 'completed' && (
            <Button size="small" variant="secondary" onClick={() => setShowPreviewModal(true)}>
              View
            </Button>
          )}
          {job.status === 'failed' && (
            <Button size="small" variant="danger" onClick={() => setShowErrorModal(true)}>
              Error
            </Button>
          )}
        </td>
      </tr>

      {/* Preview Modal */}
      {job.status === 'completed' && job.outputUrl && (
        <Modal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title="Thumbnail Preview"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => window.open(job.outputUrl!, '_blank')}
              >
                Open Full Size
              </Button>
              <Button onClick={() => setShowPreviewModal(false)}>Close</Button>
            </>
          }
        >
          <div style={{ marginBottom: spacing.md }}>
            <p>
              <strong>Video Topic:</strong> {job.videoTopic}
            </p>
            <p>
              <strong>Text:</strong> {job.thumbnailText}
            </p>
            <p>
              <strong>Channel:</strong> {job.channel.name}
            </p>
            <p>
              <strong>Archetype:</strong> {job.archetype.name}
            </p>
            <p>
              <strong>Generated:</strong> {formatDate(job.createdAt)}
            </p>
          </div>

          <div
            style={{
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.md,
              overflow: 'hidden',
            }}
          >
            <img
              src={job.outputUrl}
              alt="Generated thumbnail"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
        </Modal>
      )}

      {/* Error Modal */}
      {job.status === 'failed' && (
        <Modal
          isOpen={showErrorModal}
          onClose={() => setShowErrorModal(false)}
          title="Generation Error"
          footer={
            <Button onClick={() => setShowErrorModal(false)}>Close</Button>
          }
        >
          <div style={{ marginBottom: spacing.md }}>
            <p>
              <strong>Video Topic:</strong> {job.videoTopic}
            </p>
            <p>
              <strong>Text:</strong> {job.thumbnailText}
            </p>
            <p>
              <strong>Channel:</strong> {job.channel.name}
            </p>
            <p>
              <strong>Archetype:</strong> {job.archetype.name}
            </p>
            <p>
              <strong>Failed At:</strong> {formatDate(job.createdAt)}
            </p>
          </div>

          <div
            style={{
              backgroundColor: colors.errorLight,
              border: `1px solid ${colors.error}`,
              borderRadius: borderRadius.md,
              padding: spacing.md,
            }}
          >
            <strong style={{ color: colors.error }}>Error Message:</strong>
            <p style={{ marginTop: spacing.sm, fontFamily: 'monospace', fontSize: '0.875rem' }}>
              {job.errorMessage || 'Unknown error'}
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
