import React, { useRef } from "react";
import { Image } from "../types";
import { useSnackbar } from "notistack";
import { maxLoadingToastDurationMs } from "@/constants";

interface SingleFileUploadButtonProps {
  setUploadedImages: (images: Image[]) => void;
}

const SingleFileUploadButton: React.FC<SingleFileUploadButtonProps> = ({
  setUploadedImages,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    if (input.files && input.files.length > 0) {
      const uploadToastKey = enqueueSnackbar("正在上传图片，请稍候...", {
        variant: "info",
        preventDuplicate: true,
        autoHideDuration: maxLoadingToastDurationMs,
      });

      const files = Array.from(input.files);
      const randomFactor = new Date().getTime().toString();
      const formData = new FormData();
      formData.append("compress", "true"); // 假设默认启用压缩
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
          enqueueSnackbar("图片上传成功", { variant: "success" });
        } else {
          console.error("上传失败:", data.error);
          enqueueSnackbar("图片上传失败，请稍后重试", { variant: "error" });
        }
      } catch (error) {
        console.error("上传出错:", error);
        enqueueSnackbar("图片上传出错，请稍后重试", { variant: "error" });
      } finally {
        closeSnackbar(uploadToastKey);
      }
    }
  };

  return (
    <div>
      <input
        type="file"
        ref={inputRef}
        multiple
        accept="image/*"
        onChange={handleFileSelect}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="bg-blue-500 text-white px-4 py-2 rounded-md"
      >
        单独上传图片
      </button>
    </div>
  );
};

export default SingleFileUploadButton;
