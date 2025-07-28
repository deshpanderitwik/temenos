import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  zIndex?: number;
}

export default function Modal({ 
  isOpen, 
  onClose, 
  children, 
  maxWidth = '2xl',
  zIndex = 100000 
}: ModalProps) {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  };

  const handleScrimClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed top-0 left-0 w-full h-full transition-opacity duration-300 cursor-pointer"
        onClick={handleScrimClick}
        style={{ 
          background: 'rgba(0,0,0,0.6)', 
          pointerEvents: 'auto',
          zIndex: zIndex - 10
        }}
      />
      {/* Modal Container */}
      <div 
        className="fixed top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none"
        style={{ zIndex }}
      >
        <div
          className={`bg-[#141414] border border-white/10 rounded-xl w-full ${maxWidthClasses[maxWidth]} h-[672px] shadow-xl flex flex-col transition-transform duration-300 scale-100 pointer-events-auto scrollbar-hide`}
          onClick={e => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </>
  );
} 