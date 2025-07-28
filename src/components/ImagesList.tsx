'use client';

import { useState, useEffect } from 'react';
import ItemListBrowser from './ItemListBrowser';
import ImageForm from './ImageForm';
import Modal from './Modal';

interface Image {
  id: string;
  title: string;
  created: string;
  lastModified: string;
  url: string;
}

interface ImagesListProps {
  isOpen: boolean;
  onClose: () => void;
  currentImageId: string | null;
  onImageSelect: (imageId: string) => void;
  onNewImage: () => void;
  onDeleteImage: (imageId: string) => void;
  preloadedImages?: Array<{ id: string; title: string; created: string; lastModified: string; url: string }>;
  refreshTrigger?: number;
  viewingImage?: { id: string; title: string; url: string } | null;
  onViewingImageChange?: (image: { id: string; title: string; url: string } | null) => void;
  isInsideModal?: boolean;
}

export default function ImagesList({
  isOpen,
  onClose,
  currentImageId,
  onImageSelect,
  onNewImage,
  onDeleteImage,
  preloadedImages,
  refreshTrigger = 0,
  viewingImage,
  onViewingImageChange,
  isInsideModal = false,
}: ImagesListProps) {
  const [images, setImages] = useState<Image[]>([]);

  // Load images when the modal is opened, when preloaded data changes, or when refresh is triggered
  useEffect(() => {
    if (isOpen) {
      if (preloadedImages && preloadedImages.length > 0) {
        // Use preloaded data if available, sorted by creation date (newest first)
        const sortedImages = preloadedImages.sort((a, b) => 
          new Date(b.created).getTime() - new Date(a.created).getTime()
        );
        setImages(sortedImages);
      } else {
        // Fallback to API call if no preloaded data
        loadImages();
      }
    } else {
      // Reset state when modal closes
      setImages([]);
    }
  }, [isOpen, preloadedImages, refreshTrigger]);

  const loadImages = async () => {
    try {
      const response = await fetch('/api/images');
      const data = await response.json();
      
      if (data.images) {
        // Sort images by creation date (newest first)
        const sortedImages = data.images.sort((a: Image, b: Image) => 
          new Date(b.created).getTime() - new Date(a.created).getTime()
        );
        setImages(sortedImages);
      }
    } catch (error) {
      // Silent error handling for privacy
    }
  };

  const handleDelete = async (imageId: string) => {
    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setImages(prev => prev.filter(img => img.id !== imageId));
        onDeleteImage(imageId);
      }
    } catch (error) {
      // Silent error handling for privacy
    }
  };

  // If not inside a modal, use the full ItemListBrowser component
  if (!isInsideModal) {
    return (
      <ItemListBrowser<Image>
        isOpen={isOpen}
        onClose={onClose}
        items={images}
        currentItemId={currentImageId}
        onItemSelect={img => {
          onViewingImageChange?.({ id: img.id, title: img.title, url: img.url });
        }}
        onNewItem={onNewImage}
        onDeleteItem={handleDelete}
        renderItemTitle={img => img.title}
        renderItemDate={img => {
          const date = new Date(img.lastModified);
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          const year = date.getFullYear();
          return `${month}/${day}/${year}`;
        }}
        getItemId={img => img.id}
        newItemLabel={'+ New Image'}
        closeOnNewItem={false}
      />
    );
  }

  // If inside a modal, render just the content without the modal wrapper
  return (
    <>
      {/* New Item Button */}
      <div className="flex justify-center px-4 pt-6 pb-4">
        <button
          onClick={onNewImage}
          className="px-5 pt-2 pb-2.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors text-base font-surt-medium shadow-none"
        >
          + New Image
        </button>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 scrollbar-hide">
        {images.length > 0 ? (
          <div>
            {images.map((item, index) => {
              const id = item.id;
              return (
                <div key={id}>
                  <div
                    onClick={() => {
                      onViewingImageChange?.({ id: item.id, title: item.title, url: item.url });
                      onClose();
                    }}
                    className={`flex items-center justify-between px-4 py-4 cursor-pointer transition-all ${
                      currentImageId === id
                        ? 'bg-[rgba(255,255,255,0.1)] rounded-[12px]' : 'hover:bg-white/5 hover:rounded-[12px]'
                    }`}
                  >
                    <div className="truncate text-white text-base font-surt-medium">
                      {item.title}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 text-sm font-surt-medium">
                        {(() => {
                          const date = new Date(item.lastModified);
                          const month = (date.getMonth() + 1).toString().padStart(2, '0');
                          const day = date.getDate().toString().padStart(2, '0');
                          const year = date.getFullYear();
                          return `${month}/${day}/${year}`;
                        })()}
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
                            handleDelete(id);
                          }
                        }}
                        className="text-gray-400 p-2 transition-all rounded hover:text-white hover:bg-white/10"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-start justify-center h-full pt-8">
            <div className="text-center text-gray-400">
              <p className="text-sm leading-relaxed max-w-xs">
                No images yet
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Modal wrapper component that follows SystemPromptsModal pattern
export function ImagesListModal({
  isOpen,
  onClose,
  currentImageId,
  onImageSelect,
  onNewImage,
  onDeleteImage,
  preloadedImages,
  refreshTrigger = 0,
  viewingImage,
  onViewingImageChange,
}: Omit<ImagesListProps, 'isInsideModal'>) {
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [editingImage, setEditingImage] = useState<null | { id: string; title: string; created: string; lastModified: string; url: string }>(null);
  const [viewOnly, setViewOnly] = useState(false);

  // Always reset to list mode when modal is closed
  if (!isOpen) {
    if (mode !== 'list') setMode('list');
    if (editingImage) setEditingImage(null);
    if (viewOnly) setViewOnly(false);
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} zIndex={100000}>
      {mode === 'list' && !editingImage ? (
        <ImagesList
          isOpen={true}
          onClose={onClose}
          currentImageId={currentImageId}
          onImageSelect={onImageSelect}
          onNewImage={() => setMode('form')}
          onDeleteImage={onDeleteImage}
          preloadedImages={preloadedImages}
          refreshTrigger={refreshTrigger}
          viewingImage={viewingImage}
          onViewingImageChange={onViewingImageChange}
          isInsideModal={true}
        />
      ) : (
        <ImageForm
          isOpen={true}
          onClose={() => { setMode('list'); setEditingImage(null); setViewOnly(false); }}
          onCreated={() => {
            setMode('list');
            setEditingImage(null);
            setViewOnly(false);
            onNewImage();
          }}
          initialImage={editingImage || undefined}
          viewOnly={viewOnly}
        />
      )}
    </Modal>
  );
} 