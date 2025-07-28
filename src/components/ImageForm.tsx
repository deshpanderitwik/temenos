'use client';

import { useState, useRef, useCallback } from 'react';

interface ImageFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (image: { id: string; title: string; created: string; lastModified: string; url: string }) => void;
  initialImage?: { id: string; title: string; created: string; lastModified: string; url: string };
  viewOnly?: boolean;
}

export default function ImageForm({ isOpen, onClose, onCreated, initialImage, viewOnly }: ImageFormProps) {
  const [title, setTitle] = useState(initialImage?.title || '');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImage?.url || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file size must be less than 10MB.');
      return;
    }

    setSelectedFile(file);
    setImageUrl(''); // Clear URL when file is selected
    setError(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    if (url.trim()) {
      setSelectedFile(null); // Clear file when URL is entered
      setPreviewUrl(url); // Use URL as preview
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      setPreviewUrl(null);
    }
    setError(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleUploadAreaClick = () => {
    if (!viewOnly && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Please enter a title for the image.');
      return;
    }

    if (!selectedFile && !imageUrl.trim()) {
      setError('Please either upload an image file or provide an image URL.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', title);
      if (selectedFile) {
        formData.append('image', selectedFile);
      }
      if (imageUrl.trim()) {
        formData.append('imageUrl', imageUrl.trim());
      }

      const response = await fetch('/api/images', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to upload image.');
        setLoading(false);
        return;
      }

      const data = await response.json();
      onCreated(data.image);
      setTitle('');
      setImageUrl('');
      setSelectedFile(null);
      setPreviewUrl(null);
      onClose();
    } catch (err) {
      setError('Failed to upload image.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <form
      className="flex flex-col flex-1 p-8"
      style={{ minHeight: 0 }}
      onSubmit={handleSubmit}
      onClick={e => e.stopPropagation()}
    >
      <label className="text-gray-300 text-sm mb-2 font-surt-medium" htmlFor="image-title">
        Title
      </label>
      <input
        id="image-title"
        className={`mb-6 px-4 py-2 rounded bg-[#232323] border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 font-surt-medium ${loading || viewOnly ? 'text-white/60 cursor-not-allowed' : 'text-white'}`}
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Give your image a title here"
        required
        disabled={loading || viewOnly}
        maxLength={100}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />

      <label className="text-gray-300 text-sm mb-2 font-surt-medium" htmlFor="image-url">
        Image URL
      </label>
      <input
        id="image-url"
        className={`mb-6 px-4 py-2 rounded bg-[#232323] border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 font-surt-medium ${loading || viewOnly ? 'text-white/60 cursor-not-allowed' : 'text-white'}`}
        type="url"
        value={imageUrl}
        onChange={e => handleUrlChange(e.target.value)}
        placeholder="https://example.com/image.jpg"
        disabled={loading || viewOnly}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />

      <label className="text-gray-300 text-sm mb-2 font-surt-medium">
        Image Upload
      </label>
      
      {/* Upload Area */}
      <div
        className={`flex-1 border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer min-h-0 mb-4 ${
          isDragOver
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-white/20 hover:border-white/40 hover:bg-white/5'
        } ${loading || viewOnly ? 'cursor-not-allowed opacity-60' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleUploadAreaClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={loading || viewOnly}
        />
        
        {previewUrl ? (
          <div className="flex flex-col h-full space-y-4">
            <div className="flex-1 flex items-center justify-center min-h-0">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-full rounded-lg object-contain"
              />
            </div>
            <div className="flex-shrink-0 space-y-2">
              {selectedFile && (
                <p className="text-sm text-gray-400">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
              {imageUrl && !selectedFile && (
                <p className="text-sm text-gray-400">
                  Image from URL
                </p>
              )}
              {!viewOnly && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setImageUrl('');
                    setPreviewUrl(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Remove image
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full items-center justify-center space-y-4">
            <svg
              className="h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
            <div className="text-gray-400 text-center">
              <p className="text-sm">
                <span className="font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs">PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>
        )}
      </div>

      {error && <div className="text-red-400 mb-4">{error}</div>}
      
      <div className="flex justify-end gap-3 mt-2">
        <button
          type="button"
          className={`px-5 py-2 rounded-full transition-colors text-base font-surt-medium shadow-none ${loading ? 'text-white/60 cursor-not-allowed' : 'bg-white/10 text-white hover:bg-white/20'}`}
          onClick={onClose}
          disabled={loading}
        >
          {viewOnly ? 'Close' : 'Cancel'}
        </button>
        <button
          type="submit"
          className={`px-5 py-2 rounded-full transition-colors text-base font-surt-medium shadow-none disabled:opacity-60 ${loading || viewOnly || !title.trim() || (!selectedFile && !imageUrl.trim()) ? 'bg-white/20 text-white/60 cursor-not-allowed' : 'bg-white/20 text-white hover:bg-white/30'}`}
          disabled={loading || viewOnly || !title.trim() || (!selectedFile && !imageUrl.trim())}
        >
          {initialImage ? 'Update Image' : 'Upload Image'}
        </button>
      </div>
    </form>
  );
} 