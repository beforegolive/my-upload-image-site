import React, { useRef, useState, useEffect } from "react";
import { useAtom } from "jotai";
import { uploadedImagesAtom } from "../atoms";
import ImageList from "../components/ImageList";

const HomePage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImages, setUploadedImages] = useAtom(uploadedImagesAtom);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const fetchHistoryImages = async () => {
      setLoadingHistory(true);
      try {
        const response = await fetch("/api/get-images");
        const data = await response.json();
        if (response.ok) {
          setUploadedImages(data.imageUrls);
        } else {
          console.error("获取历史图片失败:", data.error);
        }
      } catch (error) {
        console.error("获取历史图片出错:", error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistoryImages();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setIsUploading(true);
      setUploadError(null);
      const newImages: string[] = [];
      const totalFiles = files.length;
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        try {
          const formData = new FormData();
          const fileName = encodeURIComponent(file.name);
          formData.append("file", file, fileName);
          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          if (response.ok) {
            newImages.push(data.imageUrl);
          } else {
            throw new Error(data.error);
          }
        } catch (error) {
          console.error("图片上传失败:", error);
          setUploadError(`上传文件 ${file.name} 时出错: ${error}`);
        }
      }
      setUploadedImages([...uploadedImages, ...newImages]);
      setIsUploading(false);
    }
  };

  const handleUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">文件上传站点</h1>
      <button
        onClick={handleUpload}
        disabled={isUploading}
        className={`px-4 py-2 rounded-md ${
          isUploading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-500 text-white hover:bg-blue-600"
        }`}
      >
        {isUploading ? "上传中..." : "选择图片上传"}
      </button>
      {loadingHistory && (
        <div className="mt-4 text-gray-600 text-lg">正在加载历史图片...</div>
      )}
      {uploadError && (
        <div className="mt-4 text-red-500 text-lg">{uploadError}</div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*"
        className="hidden"
      />
      <ImageList images={uploadedImages} />
    </div>
  );
};

export default HomePage;
