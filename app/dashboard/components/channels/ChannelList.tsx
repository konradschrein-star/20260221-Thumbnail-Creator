'use client';

import { useState } from 'react';
import Table from '../shared/Table';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import ErrorMessage from '../shared/ErrorMessage';
import ChannelForm from './ChannelForm';
import { spacing, colors } from '../../styles';
import useChannels, { type Channel } from '../../hooks/useChannels';

export default function ChannelList() {
  const { channels, loading, error, createChannel, updateChannel, deleteChannel } = useChannels();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [deletingChannel, setDeletingChannel] = useState<Channel | null>(null);
  const [actionError, setActionError] = useState('');

  const handleCreate = async (data: any) => {
    try {
      await createChannel(data);
      setShowCreateModal(false);
      setActionError('');
    } catch (err: any) {
      throw err; // Let form handle the error
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingChannel) return;
    try {
      await updateChannel(editingChannel.id, data);
      setEditingChannel(null);
      setActionError('');
    } catch (err: any) {
      throw err; // Let form handle the error
    }
  };

  const handleDelete = async () => {
    if (!deletingChannel) return;
    try {
      setActionError('');
      await deleteChannel(deletingChannel.id);
      setDeletingChannel(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete channel');
    }
  };

  const truncateText = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const columns = [
    { header: 'Name', key: 'name', width: '20%' },
    {
      header: 'Persona Description',
      key: 'personaDescription',
      render: (value: string) => truncateText(value, 80),
    },
    {
      header: 'Archetypes',
      key: 'archetypesCount',
      width: '10%',
      render: (_: any, row: Channel) => row._count?.archetypes || 0,
    },
    {
      header: 'Jobs',
      key: 'jobsCount',
      width: '10%',
      render: (_: any, row: Channel) => row._count?.generationJobs || 0,
    },
    {
      header: 'Actions',
      key: 'actions',
      width: '20%',
      render: (_: any, row: Channel) => (
        <div style={{ display: 'flex', gap: spacing.sm }}>
          <Button size="small" variant="secondary" onClick={() => setEditingChannel(row)}>
            Edit
          </Button>
          <Button size="small" variant="danger" onClick={() => setDeletingChannel(row)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  if (loading && channels.length === 0) {
    return <div style={{ textAlign: 'center', padding: spacing.xl }}>Loading channels...</div>;
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.lg,
        }}
      >
        <h2 style={{ margin: 0 }}>Channels</h2>
        <Button onClick={() => setShowCreateModal(true)}>Create Channel</Button>
      </div>

      {error && <ErrorMessage message={error} />}
      {actionError && <ErrorMessage message={actionError} onDismiss={() => setActionError('')} />}

      {channels.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: spacing.xxl,
            backgroundColor: colors.background,
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: spacing.md }}>📺</div>
          <h3 style={{ color: colors.textLight }}>No channels yet</h3>
          <p style={{ color: colors.textMuted }}>Create your first channel to get started</p>
          <Button onClick={() => setShowCreateModal(true)} style={{ marginTop: spacing.md }}>
            Create Channel
          </Button>
        </div>
      ) : (
        <Table columns={columns} data={channels} emptyMessage="No channels found" />
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Channel"
      >
        <ChannelForm
          mode="create"
          onSubmit={handleCreate}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingChannel}
        onClose={() => setEditingChannel(null)}
        title="Edit Channel"
      >
        {editingChannel && (
          <ChannelForm
            mode="edit"
            initialData={editingChannel}
            onSubmit={handleUpdate}
            onCancel={() => setEditingChannel(null)}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingChannel}
        onClose={() => setDeletingChannel(null)}
        title="Delete Channel"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingChannel(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p>
          Are you sure you want to delete <strong>{deletingChannel?.name}</strong>?
        </p>
        <p style={{ color: colors.error }}>
          This will also delete all associated archetypes and generation jobs.
        </p>
      </Modal>
    </div>
  );
}
