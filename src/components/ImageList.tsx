// src/components/ImageList.tsx
import React, { useState } from "react";
import ImagePreviewModal from "./ImagePreviewModal";
import { Image } from "../types";

interface ImageListProps {
  images: Image[];
  onImageClick: (imageUrl: string) => void;
}

const ImageList: React.FC<ImageListProps> = ({ images, onImageClick }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    onImageClick(imageUrl);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {images.map(({ url, size, Key, uploadTime }, index) => {
        let fileName = "";
        let fileExtension = "";
        if (Key && typeof Key === "string" && Key.length > 0) {
          fileName = Key.split("/").pop() || "";
          fileExtension = fileName.split(".").pop() || "";
        }
        const sizeInKb = (size / 1024).toFixed(2);

        // 将 uploadTime 转换为当前电脑时区的时间
        const localUploadTime = new Date(uploadTime).toLocaleString();

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
              <p>上传时间: {localUploadTime}</p>
            </div>
          </div>
        );
      })}
      <ImagePreviewModal
        isOpen={!!selectedImage}
        imageUrl={selectedImage || ""}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default ImageList;
