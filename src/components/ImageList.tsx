// components/ImageList.tsx
import React, { useState } from "react";
import ImagePreviewModal from "./ImagePreviewModal";

interface ImageListProps {
  images: { url: string; size: number; Key: string }[];
  currentPage: number;
  totalPages: number;
  paginate: (pageNumber: number) => void;
}

const ImageList: React.FC<ImageListProps> = ({
  images,
  currentPage,
  totalPages,
  paginate,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {images.map(({ url, size, Key }, index) => {
        let fileName = "";
        let fileExtension = "";
        if (Key && typeof Key === "string" && Key.length > 0) {
          fileName = Key.split("/").pop() || "";
          fileExtension = fileName.split(".").pop() || "";
        }
        const sizeInKb = (size / 1024).toFixed(2);

        return (
          <div key={index} className="flex bg-white p-4 rounded shadow">
            <img
              src={url}
              alt={`Uploaded Image ${index}`}
              style={{ width: "100px", height: "auto" }}
              className="mr-4 cursor-pointer"
              onClick={() => handleImageClick(url)}
            />
            <div className="flex flex-col justify-center text-black">
              <p>文件名: {fileName}</p>
              <p>文件后缀: {fileExtension}</p>
              <p>文件大小: {sizeInKb} KB</p>
              <p style={{ overflowWrap: "break-word", wordBreak: "break-all" }}>
                完整 URL: {url}
              </p>
            </div>
          </div>
        );
      })}
      <div className="flex justify-center mt-4 col-span-2">
        {Array.from({ length: totalPages }, (_, index) => (
          <button
            key={index}
            onClick={() => paginate(index + 1)}
            className={`px-3 py-1 mx-1 border rounded ${
              index + 1 === currentPage
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-700"
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <ImagePreviewModal
        isOpen={!!selectedImage}
        imageUrl={selectedImage || ""}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default ImageList;
