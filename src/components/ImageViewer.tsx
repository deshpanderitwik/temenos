'use client';

import { useState } from 'react';

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToList: () => void;
  image: { id: string; title: string; url: string } | null;
  images?: Array<{ id: string; title: string; url: string }>;
  onImageChange?: (image: { id: string; title: string; url: string }) => void;
}

export default function ImageViewer({ 
  isOpen, 
  onClose, 
  onBackToList, 
  image, 
  images = [], 
  onImageChange 
}: ImageViewerProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!isOpen || !image) return null;

  const currentIndex = images.findIndex(img => img.id === image.id);
  const isFirstImage = currentIndex === 0;
  const isLastImage = currentIndex === images.length - 1;

  const handlePrevious = () => {
    if (!isFirstImage && onImageChange && images[currentIndex - 1]) {
      onImageChange(images[currentIndex - 1]);
      setImageLoaded(false);
      setImageError(false);
    }
  };

  const handleNext = () => {
    if (!isLastImage && onImageChange && images[currentIndex + 1]) {
      onImageChange(images[currentIndex + 1]);
      setImageLoaded(false);
      setImageError(false);
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  return (
    <div className="fixed inset-0 top-0 left-0 w-screen h-screen bg-[#141414] z-[99999] flex" style={{ margin: 0, padding: 0 }}>
      {/* Left Sidebar */}
      <div className="w-16 flex flex-col items-center justify-center flex-shrink-0 pl-12 z-50 relative">
        {/* Navigation Buttons Container */}
        <div className="bg-white/10 rounded-lg p-2 space-y-2">
          {/* Back to List Button */}
          <button
            onClick={onBackToList}
            className="w-10 h-10 rounded transition-colors flex items-center justify-center hover:bg-white/20 text-white/40 hover:text-white/95 group"
            title="Back to Images"
          >
            <svg 
              className="w-5 h-5 transition-colors duration-300 text-white/40 group-hover:text-white/95" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth="1.5" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </button>

          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            disabled={isFirstImage}
            className={`w-10 h-10 rounded transition-colors flex items-center justify-center group ${
              isFirstImage 
                ? 'opacity-40 cursor-not-allowed text-gray-600' 
                : 'hover:bg-white/20 text-white/40 hover:text-white/95'
            }`}
            title="Previous Image"
          >
            <svg 
              className="w-5 h-5 transition-colors duration-300" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth="1.5" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={isLastImage}
            className={`w-10 h-10 rounded transition-colors flex items-center justify-center group ${
              isLastImage 
                ? 'opacity-40 cursor-not-allowed text-gray-600' 
                : 'hover:bg-white/20 text-white/40 hover:text-white/95'
            }`}
            title="Next Image"
          >
            <svg 
              className="w-5 h-5 transition-colors duration-300" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth="1.5" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded transition-colors flex items-center justify-center hover:bg-white/20 text-white/40 hover:text-white/95 group"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content - Centered Image */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative w-full h-full flex items-center justify-center">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-gray-400 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-sm">Loading image...</p>
              </div>
            </div>
          )}
          
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-gray-400 text-center">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-sm">Failed to load image</p>
              </div>
            </div>
          )}
          
          <img
            src={image.url}
            alt={image.title}
            className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              height: '100%',
              width: 'auto',
              maxWidth: '100%'
            }}
          />
        </div>
      </div>
    </div>
  );
} 