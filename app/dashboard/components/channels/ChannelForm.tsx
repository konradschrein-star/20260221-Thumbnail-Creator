'use client';

import { useState, useEffect } from 'react';
import Input from '../shared/Input';
import Button from '../shared/Button';
import { spacing } from '../../styles';
import type { Channel, CreateChannelData, UpdateChannelData } from '../../hooks/useChannels';

interface ChannelFormProps {
  mode: 'create' | 'edit';
  initialData?: Channel;
  onSubmit: (data: CreateChannelData | UpdateChannelData) => Promise<void>;
  onCancel: () => void;
}

export default function ChannelForm({ mode, initialData, onSubmit, onCancel }: ChannelFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [personaDescription, setPersonaDescription] = useState(initialData?.personaDescription || '');
  const [errors, setErrors] = useState<{ name?: string; personaDescription?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setPersonaDescription(initialData.personaDescription);
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: { name?: string; personaDescription?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Channel name is required';
    }

    if (!personaDescription.trim()) {
      newErrors.personaDescription = 'Persona description is required';
    } else if (personaDescription.trim().length < 50) {
      newErrors.personaDescription = 'Persona description must be at least 50 characters';
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
      await onSubmit({
        name: name.trim(),
        personaDescription: personaDescription.trim(),
      });
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to save channel');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Channel Name"
        value={name}
        onChange={setName}
        placeholder="e.g., Tech Review Channel"
        required
        error={errors.name}
        disabled={isSubmitting}
      />

      <Input
        label="Persona Description"
        value={personaDescription}
        onChange={setPersonaDescription}
        placeholder="Detailed character description (minimum 50 characters, recommended 200+ words)"
        multiline
        rows={8}
        required
        error={errors.personaDescription}
        disabled={isSubmitting}
        minLength={50}
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
        <strong>Tip:</strong> For consistent character generation, include 15+ specific attributes:
        age, hair (length, color, style), eyes, facial structure, build, clothing, complexion,
        expression, lighting, etc.
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
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Channel' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
