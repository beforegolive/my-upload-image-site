// src/components/ImageList.tsx
import React, { useState } from "react";
import ImagePreviewModal from "./ImagePreviewModal";
import { Image } from "../types";
import { useSnackbar } from "notistack";
import jsonIcon from "@/assets/imgs/json_icon.png";
import mp3Icon from "@/assets/imgs/mp3_icon.jpeg";
import xmlIcon from "@/assets/imgs/xml_icon.png"; // 假设图标路径是这样，根据实际情况调整

interface ImageListProps {
  images: Image[];
  onImageClick: (imageUrl: string) => void;
}

const ImageList: React.FC<ImageListProps> = ({ images, onImageClick }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [disabledButtons, setDisabledButtons] = useState<{
    [key: string]: boolean;
  }>({});
  const { enqueueSnackbar } = useSnackbar();

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    onImageClick(imageUrl);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      enqueueSnackbar("URL 复制成功", { variant: "success" });
      setDisabledButtons((prev) => ({ ...prev, [url]: true }));
      setTimeout(() => {
        setDisabledButtons((prev) => ({ ...prev, [url]: false }));
      }, 2000);
    } catch {
      enqueueSnackbar("URL 复制失败", { variant: "error" });
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {images.map(({ url, size, Key, uploadTime, width, height, mimeType }, index) => {
        let fileName = "";
        let fileExtension = "";
        if (Key && typeof Key === "string" && Key.length > 0) {
          fileName = Key.split("/").pop() || "";
          fileExtension = fileName.split(".").pop() || "";
        }
        const sizeInKb = (size / 1024).toFixed(2);
        const localUploadTime = new Date(uploadTime).toLocaleString();
        const isJson = fileExtension.toLowerCase() === "json";
        const isMp3 = fileExtension.toLowerCase() === "mp3";
        const isXml = fileExtension.toLowerCase() === "xml";
        const displayIcon = isJson
          ? jsonIcon
          : isMp3
          ? mp3Icon
          : isXml
          ? xmlIcon
          : null;
        const fileExtensionWithDimensions =
          isJson || isMp3 || isXml
            ? fileExtension
            : `${fileExtension} (${width}x${height})`;
      
        return (
          <div key={index} className="flex bg-white p-4 rounded shadow">
            <img
              src={displayIcon?.src || url}
              alt={`Uploaded File ${index}`}
              style={{ width: "100px", height: "auto" }}
              className="mr-4 cursor-pointer"
              onClick={() => handleImageClick(url)}
            />
            <div className="flex flex-col justify-center text-black">
              <p>文件名: {fileName}</p>
              <p>文件后缀: {fileExtensionWithDimensions} ({mimeType})</p>
              <p>文件大小: {sizeInKb} KB</p>
              <p>上传时间: {localUploadTime}</p>
            </div>
            <button
              className="ml-4 bg-blue-500 text-white px-2 py-1 rounded-md min-w-[80px] max-h-[42px]"
              onClick={() => handleCopyUrl(url)}
              disabled={disabledButtons[url]}
            >
              {disabledButtons[url] ? "已复制" : "复制url"}
            </button>
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
