'use client';

import { useState, useEffect } from 'react';
import Input from '../shared/Input';
import Button from '../shared/Button';
import ErrorMessage from '../shared/ErrorMessage';
import { spacing, colors, borderRadius } from '../../styles';
import useChannels from '../../hooks/useChannels';
import useArchetypes from '../../hooks/useArchetypes';
import useGenerate from '../../hooks/useGenerate';

export default function GenerateForm() {
  const { channels } = useChannels();
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const { archetypes } = useArchetypes(selectedChannelId);
  const { loading, error, success, result, generateThumbnail, reset } = useGenerate();

  const [archetypeId, setArchetypeId] = useState('');
  const [videoTopic, setVideoTopic] = useState('');
  const [thumbnailText, setThumbnailText] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);

  const [validationErrors, setValidationErrors] = useState<{
    channelId?: string;
    archetypeId?: string;
    videoTopic?: string;
    thumbnailText?: string;
  }>({});

  // Reset archetype when channel changes
  useEffect(() => {
    setArchetypeId('');
  }, [selectedChannelId]);

  const validate = (): boolean => {
    const errors: any = {};

    if (!selectedChannelId) {
      errors.channelId = 'Please select a channel';
    }

    if (!archetypeId) {
      errors.archetypeId = 'Please select an archetype';
    }

    if (!videoTopic.trim()) {
      errors.videoTopic = 'Video topic is required';
    }

    if (!thumbnailText.trim()) {
      errors.thumbnailText = 'Thumbnail text is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await generateThumbnail({
        channelId: selectedChannelId,
        archetypeId,
        videoTopic: videoTopic.trim(),
        thumbnailText: thumbnailText.trim(),
        customPrompt: customPrompt.trim() || undefined,
      });
    } catch (err) {
      // Error is handled by useGenerate hook
    }
  };

  const handleReset = () => {
    reset();
    setSelectedChannelId('');
    setArchetypeId('');
    setVideoTopic('');
    setThumbnailText('');
    setCustomPrompt('');
    setShowCustomPrompt(false);
    setValidationErrors({});
  };

  return (
    <div>
      <h2 style={{ marginBottom: spacing.lg }}>Generate Thumbnail</h2>

      {success && result ? (
        // Success State
        <div
          style={{
            textAlign: 'center',
            padding: spacing.xxl,
            backgroundColor: colors.successLight,
            borderRadius: borderRadius.md,
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: spacing.md }}>✅</div>
          <h3 style={{ color: colors.success, marginBottom: spacing.md }}>
            Thumbnail Generated Successfully!
          </h3>

          {/* Thumbnail Preview */}
          <div
            style={{
              marginBottom: spacing.lg,
              display: 'inline-block',
              border: `2px solid ${colors.success}`,
              borderRadius: borderRadius.md,
              overflow: 'hidden',
            }}
          >
            <img
              src={result.job.outputUrl}
              alt="Generated thumbnail"
              style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
            />
          </div>

          <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'center' }}>
            <Button
              variant="secondary"
              onClick={() => window.open(result.job.outputUrl, '_blank')}
            >
              Open Full Size
            </Button>
            <Button onClick={handleReset}>Generate Another</Button>
          </div>
        </div>
      ) : (
        // Form State
        <form onSubmit={handleSubmit}>
          {error && <ErrorMessage message={error} onDismiss={() => reset()} />}

          {/* Channel Selector */}
          <div style={{ marginBottom: spacing.md }}>
            <label
              style={{
                display: 'block',
                marginBottom: spacing.sm,
                fontWeight: '500',
                color: colors.text,
              }}
            >
              Channel <span style={{ color: colors.error }}>*</span>
            </label>
            <select
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value)}
              disabled={loading}
              style={{
                padding: '0.625rem',
                border: `1px solid ${validationErrors.channelId ? colors.error : colors.border}`,
                borderRadius: borderRadius.md,
                fontSize: '1rem',
                width: '100%',
                fontFamily: 'inherit',
                backgroundColor: loading ? colors.backgroundDark : colors.white,
              }}
            >
              <option value="">Select a channel</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
            {validationErrors.channelId && (
              <div style={{ marginTop: spacing.sm, color: colors.error, fontSize: '0.875rem' }}>
                {validationErrors.channelId}
              </div>
            )}
          </div>

          {/* Archetype Selector */}
          <div style={{ marginBottom: spacing.md }}>
            <label
              style={{
                display: 'block',
                marginBottom: spacing.sm,
                fontWeight: '500',
                color: colors.text,
              }}
            >
              Archetype <span style={{ color: colors.error }}>*</span>
            </label>
            <select
              value={archetypeId}
              onChange={(e) => setArchetypeId(e.target.value)}
              disabled={!selectedChannelId || loading}
              style={{
                padding: '0.625rem',
                border: `1px solid ${validationErrors.archetypeId ? colors.error : colors.border}`,
                borderRadius: borderRadius.md,
                fontSize: '1rem',
                width: '100%',
                fontFamily: 'inherit',
                backgroundColor:
                  !selectedChannelId || loading ? colors.backgroundDark : colors.white,
                cursor: !selectedChannelId || loading ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="">
                {selectedChannelId
                  ? archetypes.length > 0
                    ? 'Select an archetype'
                    : 'No archetypes for this channel'
                  : 'Select a channel first'}
              </option>
              {archetypes.map((archetype) => (
                <option key={archetype.id} value={archetype.id}>
                  {archetype.name}
                </option>
              ))}
            </select>
            {validationErrors.archetypeId && (
              <div style={{ marginTop: spacing.sm, color: colors.error, fontSize: '0.875rem' }}>
                {validationErrors.archetypeId}
              </div>
            )}
          </div>

          {/* Video Topic */}
          <Input
            label="Video Topic"
            value={videoTopic}
            onChange={setVideoTopic}
            placeholder="e.g., How to master TypeScript in 2024"
            required
            error={validationErrors.videoTopic}
            disabled={loading}
          />

          {/* Thumbnail Text */}
          <Input
            label="Thumbnail Text"
            value={thumbnailText}
            onChange={setThumbnailText}
            placeholder="e.g., MASTER TYPESCRIPT"
            required
            error={validationErrors.thumbnailText}
            disabled={loading}
            maxLength={50}
          />

          {/* Custom Prompt (Optional) */}
          <div style={{ marginBottom: spacing.md }}>
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => setShowCustomPrompt(!showCustomPrompt)}
              disabled={loading}
            >
              {showCustomPrompt ? '▼' : '▶'} Advanced: Custom Prompt Override
            </Button>
          </div>

          {showCustomPrompt && (
            <Input
              label="Custom Prompt (Optional)"
              value={customPrompt}
              onChange={setCustomPrompt}
              placeholder="Override the default prompt with a custom one"
              multiline
              rows={4}
              disabled={loading}
            />
          )}

          {/* Submit Button */}
          <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'flex-end' }}>
            <Button type="submit" disabled={loading} style={{ minWidth: '200px' }}>
              {loading ? (
                <>
                  <span>Generating...</span>
                </>
              ) : (
                'Generate Thumbnail'
              )}
            </Button>
          </div>

          {loading && (
            <div
              style={{
                marginTop: spacing.lg,
                padding: spacing.lg,
                backgroundColor: colors.primaryLight,
                borderRadius: borderRadius.md,
                textAlign: 'center',
                color: colors.primary,
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: spacing.sm }}>⏳</div>
              <strong>Generating your thumbnail...</strong>
              <p style={{ margin: spacing.sm, fontSize: '0.875rem' }}>
                This may take 10-30 seconds
              </p>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
