'use client';

import { useState, useEffect } from 'react';
import Input from '../shared/Input';
import Button from '../shared/Button';
import FileUpload from '../shared/FileUpload';
import { spacing } from '../../styles';
import useChannels from '../../hooks/useChannels';
import type { Archetype, CreateArchetypeData, UpdateArchetypeData } from '../../hooks/useArchetypes';

interface ArchetypeFormProps {
  mode: 'create' | 'edit';
  initialData?: Archetype;
  preselectedChannelId?: string;
  onSubmit: (data: CreateArchetypeData | UpdateArchetypeData) => Promise<void>;
  onCancel: () => void;
}

export default function ArchetypeForm({
  mode,
  initialData,
  preselectedChannelId,
  onSubmit,
  onCancel,
}: ArchetypeFormProps) {
  const { channels } = useChannels();
  const [name, setName] = useState(initialData?.name || '');
  const [channelId, setChannelId] = useState(
    initialData?.channelId || preselectedChannelId || ''
  );
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [layoutInstructions, setLayoutInstructions] = useState(
    initialData?.layoutInstructions || ''
  );
  const [errors, setErrors] = useState<{
    name?: string;
    channelId?: string;
    imageUrl?: string;
    layoutInstructions?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setChannelId(initialData.channelId);
      setImageUrl(initialData.imageUrl);
      setLayoutInstructions(initialData.layoutInstructions);
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: any = {};

    if (!name.trim()) {
      newErrors.name = 'Archetype name is required';
    }

    if (!channelId) {
      newErrors.channelId = 'Channel is required';
    }

    if (!imageUrl.trim()) {
      newErrors.imageUrl = 'Image is required';
    }

    if (!layoutInstructions.trim()) {
      newErrors.layoutInstructions = 'Layout instructions are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const data: any = {
        name: name.trim(),
        imageUrl: imageUrl.trim(),
        layoutInstructions: layoutInstructions.trim(),
      };

      // Only include channelId for create mode
      if (mode === 'create') {
        data.channelId = channelId;
      }

      await onSubmit(data);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to save archetype');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Channel Selector (disabled in edit mode) */}
      <div style={{ marginBottom: spacing.md }}>
        <label
          style={{
            display: 'block',
            marginBottom: spacing.sm,
            fontWeight: '500',
            color: '#333',
          }}
        >
          Channel <span style={{ color: '#ff0000' }}>*</span>
        </label>
        <select
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          disabled={mode === 'edit' || isSubmitting}
          style={{
            padding: '0.625rem',
            border: `1px solid ${errors.channelId ? '#ff0000' : '#e0e0e0'}`,
            borderRadius: '8px',
            fontSize: '1rem',
            width: '100%',
            fontFamily: 'inherit',
            backgroundColor: mode === 'edit' ? '#f0f0f0' : 'white',
            cursor: mode === 'edit' ? 'not-allowed' : 'pointer',
          }}
        >
          <option value="">Select a channel</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.name}
            </option>
          ))}
        </select>
        {errors.channelId && (
          <div style={{ marginTop: spacing.sm, color: '#ff0000', fontSize: '0.875rem' }}>
            {errors.channelId}
          </div>
        )}
      </div>

      <Input
        label="Archetype Name"
        value={name}
        onChange={setName}
        placeholder="e.g., Bold Title Centered"
        required
        error={errors.name}
        disabled={isSubmitting}
      />

      <FileUpload
        label="Reference Image"
        value={imageUrl}
        onChange={setImageUrl}
        folder="archetypes"
        required
        onError={(error) => setErrors({ ...errors, imageUrl: error })}
      />
      {errors.imageUrl && !imageUrl && (
        <div style={{ marginTop: spacing.sm, color: '#ff0000', fontSize: '0.875rem' }}>
          {errors.imageUrl}
        </div>
      )}

      <Input
        label="Layout Instructions"
        value={layoutInstructions}
        onChange={setLayoutInstructions}
        placeholder="Describe the layout, text placement, style, etc."
        multiline
        rows={6}
        required
        error={errors.layoutInstructions}
        disabled={isSubmitting}
      />

      <div
        style={{
          fontSize: '0.875rem',
          color: '#666',
          marginBottom: spacing.md,
          padding: spacing.md,
          backgroundColor: '#f0f0f0',
          borderRadius: '8px',
        }}
      >
        <strong>Tip:</strong> Include specific layout details like text position, font style,
        background elements, and overall composition.
      </div>

      {submitError && (
        <div
          style={{
            color: '#ff0000',
            marginBottom: spacing.md,
            padding: spacing.md,
            backgroundColor: '#ffe6e6',
            borderRadius: '8px',
          }}
        >
          {submitError}
        </div>
      )}

      <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Saving...'
            : mode === 'create'
            ? 'Create Archetype'
            : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
