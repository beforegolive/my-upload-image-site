// src/components/UploadButton.tsx
import React, { useRef } from "react";
import SingleFileUploadButton from "./SingleFileUploadButton";
import DirectoryUploadButton from "./DirectoryUploadButton";
import { Image } from "../types";

const UploadButton: React.FC<{
  setUploadedImages: (images: Image[]) => void;
}> = ({ setUploadedImages }) => {
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleUpload = async (files: File[]) => {
    const randomFactor = new Date().getTime().toString();
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("randomFactor", randomFactor);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setUploadedImages(data.imageUrls);
      } else {
        console.error("上传失败:", data.error);
      }
    } catch (error) {
      console.error("上传出错:", error);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const dt = e.dataTransfer;
    if (dt && dt.files.length > 0) {
      const files = Array.from(dt.files);
      handleUpload(files);
    }
  };

  return (
    <div
      ref={dropZoneRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="border border-dashed border-gray-400 p-4 rounded-md text-center text-gray-600 cursor-pointer"
    >
      <p>点击选择图片或拖拽图片到此处上传</p>
      <SingleFileUploadButton setUploadedImages={setUploadedImages} />
      <div className="mt-4">
        <DirectoryUploadButton setUploadedImages={setUploadedImages} />
      </div>
    </div>
  );
};

export default UploadButton;
