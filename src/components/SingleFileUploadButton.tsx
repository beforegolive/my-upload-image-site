// src/components/SingleFileUploadButton.tsx
import React, { useRef } from "react";
import { Image } from "../types";
import { useSnackbar } from "notistack";

interface SingleFileUploadButtonProps {
  setUploadedImages: (images: Image[]) => void;
}

const SingleFileUploadButton: React.FC<SingleFileUploadButtonProps> = ({
  setUploadedImages,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const handleUpload = async () => {
    const input = inputRef.current;
    if (input && input.files && input.files.length > 0) {
      const uploadToastKey = enqueueSnackbar("正在上传图片，请稍候...", {
        variant: "info",
      });

      const files = Array.from(input.files);
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
          enqueueSnackbar("图片上传成功", { variant: "success" });
        } else {
          console.error("上传失败:", data.error);
          enqueueSnackbar("图片上传失败，请稍后重试", { variant: "error" });
        }
      } catch (error) {
        console.error("上传出错:", error);
        enqueueSnackbar("图片上传出错，请稍后重试", { variant: "error" });
      } finally {
        // 关闭上传中的 toast
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
        style={{ display: "none" }}
      />
      <button
        onClick={() => {
          inputRef.current?.click();
          handleUpload();
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded-md"
      >
        单独上传图片
      </button>
    </div>
  );
};

export default SingleFileUploadButton;
