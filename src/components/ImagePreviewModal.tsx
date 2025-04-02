// components/ImagePreviewModal.tsx
import React from "react";

interface ImagePreviewModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  imageUrl,
  onClose,
}) => {
  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white p-4 rounded shadow max-w-[80vw] max-h-[80vh] relative">
        <img src={imageUrl} alt="Preview" className="max-w-full max-h-full" />
        <button
          className="absolute top-2 right-2 text-white bg-red-500 p-1 rounded"
          onClick={onClose}
        >
          关闭
        </button>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
