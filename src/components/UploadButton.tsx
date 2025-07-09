import React, { useRef, useState } from "react";
import DirectoryUploadButton from "./DirectoryUploadButton";
import { Image } from "../types";
import { useSnackbar } from "notistack";
import { maxLoadingToastDurationMs } from "@/constants";
import PngUploadConfirmDialog from "./PngUploadConfirmDialog";
import "antd/dist/reset.css";

const UploadButton: React.FC<{
  setUploadedImages: (images: Image[]) => void;
}> = ({ setUploadedImages }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [isCompressionEnabled, setIsCompressionEnabled] = useState(true);
  const [showPngDialog, setShowPngDialog] = useState(false);
  const [pngFiles, setPngFiles] = useState<File[]>([]);
  let pendingResolve: ((value: boolean) => void) | null = null;

  // 新增复用函数
  const confirmPngUpload = async (files: File[]) => {
    const pngFiles = files.filter((file) =>
      file.name.toLowerCase().endsWith(".png")
    );
    if (pngFiles.length > 0) {
      return new Promise<boolean>((resolve) => {
        pendingResolve = resolve;
        setShowPngDialog(true);
        setPngFiles(pngFiles);
      });
    }
    return true;
  };

  const handleUpload = async (files: File[]) => {
    const uploadToastKey = enqueueSnackbar("正在上传文件，请稍候...", {
      variant: "info",
      preventDuplicate: true,
      autoHideDuration: maxLoadingToastDurationMs,
    });

    const randomFactor = new Date().getTime().toString();
    const formData = new FormData();
    formData.append("compress", isCompressionEnabled ? "true" : "false");
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
        enqueueSnackbar("文件上传成功", { variant: "success" });
      } else {
        console.error("上传失败:", data.error);
        enqueueSnackbar("文件上传失败，请稍后重试", { variant: "error" });
      }
    } catch (error) {
      console.error("上传出错:", error);
      enqueueSnackbar("文件上传出错，请稍后重试", { variant: "error" });
    } finally {
      closeSnackbar(uploadToastKey);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const shouldUpload = await confirmPngUpload(files);
      if (shouldUpload) {
        handleUpload(files);
      }
    }
  };

  const handleDialogConfirm = () => {
    setShowPngDialog(false);
    if (pendingResolve) {
      pendingResolve(true);
      pendingResolve = null;
    }
  };

  const handleDialogCancel = () => {
    setShowPngDialog(false);
    if (pendingResolve) {
      pendingResolve(false);
      pendingResolve = null;
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-center space-x-4">
      <button
        onClick={handleClick}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        单一文件上传
      </button>
      <DirectoryUploadButton setUploadedImages={setUploadedImages} />
      <div className="flex items-center">
        <input
          type="checkbox"
          id="compressCheckbox"
          checked={isCompressionEnabled}
          onChange={(e) => setIsCompressionEnabled(e.target.checked)}
        />
        <label htmlFor="compressCheckbox" className="ml-2">
          启用图片压缩
        </label>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        // 添加 application/xml 支持 xml 文件上传
        accept="image/jpeg, image/png, audio/mpeg, application/json, application/xml"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      {showPngDialog && (
        <PngUploadConfirmDialog
          files={pngFiles}
          onConfirm={handleDialogConfirm}
          onCancel={handleDialogCancel}
          open={showPngDialog}
        />
      )}
    </div>
  );
};

export default UploadButton;
