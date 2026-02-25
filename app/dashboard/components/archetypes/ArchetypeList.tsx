'use client';

import { useState } from 'react';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import ErrorMessage from '../shared/ErrorMessage';
import ArchetypeCard from './ArchetypeCard';
import ArchetypeForm from './ArchetypeForm';
import { spacing, colors } from '../../styles';
import useArchetypes, { type Archetype } from '../../hooks/useArchetypes';
import useChannels from '../../hooks/useChannels';

export default function ArchetypeList() {
  const { channels } = useChannels();
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const { archetypes, loading, error, createArchetype, updateArchetype, deleteArchetype } =
    useArchetypes(selectedChannelId);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingArchetype, setEditingArchetype] = useState<Archetype | null>(null);
  const [deletingArchetype, setDeletingArchetype] = useState<Archetype | null>(null);
  const [actionError, setActionError] = useState('');

  const handleCreate = async (data: any) => {
    try {
      await createArchetype(data);
      setShowCreateModal(false);
      setActionError('');
    } catch (err: any) {
      throw err; // Let form handle the error
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingArchetype) return;
    try {
      await updateArchetype(editingArchetype.id, data);
      setEditingArchetype(null);
      setActionError('');
    } catch (err: any) {
      throw err; // Let form handle the error
    }
  };

  const handleDelete = async () => {
    if (!deletingArchetype) return;
    try {
      setActionError('');
      await deleteArchetype(deletingArchetype.id);
      setDeletingArchetype(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete archetype');
    }
  };

  if (loading && archetypes.length === 0) {
    return <div style={{ textAlign: 'center', padding: spacing.xl }}>Loading archetypes...</div>;
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
        <h2 style={{ margin: 0 }}>Archetypes</h2>
        <Button onClick={() => setShowCreateModal(true)}>Create Archetype</Button>
      </div>

      {/* Channel Filter */}
      <div style={{ marginBottom: spacing.lg }}>
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
          value={selectedChannelId}
          onChange={(e) => setSelectedChannelId(e.target.value)}
          style={{
            padding: '0.625rem',
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            fontSize: '1rem',
            width: '100%',
            maxWidth: '400px',
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

      {error && <ErrorMessage message={error} />}
      {actionError && <ErrorMessage message={actionError} onDismiss={() => setActionError('')} />}

      {archetypes.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: spacing.xxl,
            backgroundColor: colors.background,
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: spacing.md }}>🎨</div>
          <h3 style={{ color: colors.textLight }}>
            {selectedChannelId ? 'No archetypes for this channel' : 'No archetypes yet'}
          </h3>
          <p style={{ color: colors.textMuted }}>
            {selectedChannelId
              ? 'Create an archetype for this channel'
              : 'Create your first archetype to get started'}
          </p>
          <Button onClick={() => setShowCreateModal(true)} style={{ marginTop: spacing.md }}>
            Create Archetype
          </Button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: spacing.lg,
          }}
        >
          {archetypes.map((archetype) => (
            <ArchetypeCard
              key={archetype.id}
              archetype={archetype}
              onEdit={() => setEditingArchetype(archetype)}
              onDelete={() => setDeletingArchetype(archetype)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Archetype"
      >
        <ArchetypeForm
          mode="create"
          preselectedChannelId={selectedChannelId}
          onSubmit={handleCreate}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingArchetype}
        onClose={() => setEditingArchetype(null)}
        title="Edit Archetype"
      >
        {editingArchetype && (
          <ArchetypeForm
            mode="edit"
            initialData={editingArchetype}
            onSubmit={handleUpdate}
            onCancel={() => setEditingArchetype(null)}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingArchetype}
        onClose={() => setDeletingArchetype(null)}
        title="Delete Archetype"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingArchetype(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p>
          Are you sure you want to delete <strong>{deletingArchetype?.name}</strong>?
        </p>
        <p style={{ color: colors.textMuted }}>This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
