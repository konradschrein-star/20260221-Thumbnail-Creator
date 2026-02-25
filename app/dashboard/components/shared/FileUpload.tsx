'use client';

import { useState, useRef } from 'react';
import { colors, spacing, borderRadius, commonStyles } from '../../styles';
import Button from './Button';

interface FileUploadProps {
  label?: string;
  value?: string; // URL of uploaded file
  onChange: (url: string) => void;
  onError?: (error: string) => void;
  folder?: string; // 'archetypes' or 'personas'
  accept?: string;
  maxSizeMB?: number;
  required?: boolean;
}

export default function FileUpload({
  label,
  value,
  onChange,
  onError,
  folder = 'archetypes',
  accept = 'image/jpeg,image/jpg,image/png,image/webp',
  maxSizeMB = 5,
  required = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string>(value || '');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    const allowedTypes = accept.split(',');
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Only JPG, PNG, and WEBP images are allowed.';
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File too large. Maximum size is ${maxSizeMB}MB.`;
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setPreview(data.url);
      onChange(data.url);
    } catch (err: any) {
      const errorMessage = err.message || 'Upload failed';
      setError(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      if (onError) onError(validationError);
      return;
    }

    await uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileSelect(files[0]);
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileSelect(files[0]);
    }
  };

  const handleClear = () => {
    setPreview('');
    setError('');
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ marginBottom: spacing.md }}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: spacing.sm,
            fontWeight: '500',
            color: colors.text,
          }}
        >
          {label}
          {required && <span style={{ color: colors.error }}> *</span>}
        </label>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? colors.primary : error ? colors.error : colors.border}`,
          borderRadius: borderRadius.md,
          padding: spacing.lg,
          textAlign: 'center',
          cursor: isUploading ? 'wait' : 'pointer',
          backgroundColor: isDragging ? colors.primaryLight : colors.background,
          transition: 'all 0.2s ease',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />

        {preview ? (
          <div>
            <img
              src={preview}
              alt="Preview"
              style={{
                maxWidth: '200px',
                maxHeight: '200px',
                borderRadius: borderRadius.md,
                marginBottom: spacing.md,
              }}
            />
            <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'center' }}>
              <Button
                size="small"
                variant="secondary"
                onClick={(e) => {
                  e?.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Change Image
              </Button>
              <Button
                size="small"
                variant="danger"
                onClick={(e) => {
                  e?.stopPropagation();
                  handleClear();
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '2rem', marginBottom: spacing.sm }}>📁</div>
            <div style={{ color: colors.textLight, marginBottom: spacing.sm }}>
              {isUploading ? (
                <strong>Uploading...</strong>
              ) : (
                <>
                  <strong>Drop image here</strong> or click to browse
                </>
              )}
            </div>
            <div style={{ fontSize: '0.875rem', color: colors.textMuted }}>
              JPG, PNG, WEBP (max {maxSizeMB}MB)
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: spacing.sm,
            color: colors.error,
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
