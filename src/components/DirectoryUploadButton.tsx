import React, { useRef } from "react";
import { Image } from "../types";
import { message } from "antd";
import { IUploadedResult } from "./UploadButton";
// import { maxLoadingToastDurationMs } from "@/constants";
// import { confirmPngUpload } from "./UploadButton";

const maxLoadingToastDurationMs = 5000;

export interface DirectoryUploadButtonProps {
  // setUploadedImages: (images: Image[]) => void;
  // onBeforeUpload: (files: File[]) => Promise<boolean>;
  handleUploadWithSpriteCheck: (
    files: File[],
    skipCheck?: boolean
  ) => Promise<IUploadedResult | undefined>;
}

const DirectoryUploadButton: React.FC<DirectoryUploadButtonProps> = ({
  // setUploadedImages,
  // onBeforeUpload,
  handleUploadWithSpriteCheck,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

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
      const pendingFiles = Array.from(input.files);
      handleUploadWithSpriteCheck(pendingFiles);
      // const beforeUploadCheckResult = await onBeforeUpload(pendingFiles);
      // if (beforeUploadCheckResult === false) {
      //   message.error("上传终止");
      //   return;
      // }
      // const files = Array.from(input.files);
      // // if (!confirmPngUpload(files)) {
      // //   return;
      // // }
      // console.log("开始上传，尝试显示 toast");
      // const loadingInstance = message.loading(
      //   "正在上传图片，请稍候...",
      //   maxLoadingToastDurationMs / 1000
      // );

      // const validFiles = Array.from(input.files).filter(
      //   (file) => !file.name.startsWith(".")
      // );
      // const randomFactor = new Date().getTime().toString();
      // const formData = new FormData();
      // formData.append("compress", "true"); // 假设默认启用压缩
      // validFiles.forEach((file) => {
      //   formData.append("files", file);
      // });
      // formData.append("randomFactor", randomFactor);

      // try {
      //   const response = await fetch("/api/upload", {
      //     method: "POST",
      //     body: formData,
      //   });
      //   const data = await response.json();
      //   if (response.ok) {
      //     setUploadedImages(data.imageUrls);
      //     message.success("图片上传成功");
      //   } else {
      //     console.error("上传失败:", data.error);
      //     message.error("图片上传失败，请稍后重试");
      //   }
      // } catch (error) {
      //   console.error("上传出错:", error);
      //   message.error("图片上传出错，请稍后重试");
      // } finally {
      //   loadingInstance();
      // }
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
