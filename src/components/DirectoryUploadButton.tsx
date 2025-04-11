import React, { useRef } from "react";
import { Image } from "../types";
import { useSnackbar } from "notistack";
import { maxLoadingToastDurationMs } from "@/constants";

const DirectoryUploadButton: React.FC<{
  setUploadedImages: (images: Image[]) => void;
}> = ({ setUploadedImages }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const handleUpload = () => {
    if (inputRef.current) {
      inputRef.current.setAttribute("webkitdirectory", "");
      inputRef.current.setAttribute("directory", "");
      inputRef.current.click();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    if (input.files) {
      console.log("开始上传，尝试显示 toast");
      const uploadToastKey = enqueueSnackbar("正在上传图片，请稍候...", {
        variant: "info",
        preventDuplicate: true,
        autoHideDuration: maxLoadingToastDurationMs,
      });

      const validFiles = Array.from(input.files).filter(
        (file) => !file.name.startsWith(".")
      );
      const randomFactor = new Date().getTime().toString();
      const formData = new FormData();
      formData.append("compress", "true"); // 假设默认启用压缩
      validFiles.forEach((file) => {
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
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />
      <button
        onClick={handleUpload}
        className="bg-green-500 text-white px-4 py-2 rounded-md"
      >
        目录上传图片
      </button>
    </div>
  );
};

export default DirectoryUploadButton;
