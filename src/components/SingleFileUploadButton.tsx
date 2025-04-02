import React, { useRef } from "react";

interface SingleFileUploadButtonProps {
  setUploadedImages: (images: string[]) => void;
}

const SingleFileUploadButton: React.FC<SingleFileUploadButtonProps> = ({
  setUploadedImages,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    const input = inputRef.current;
    if (input && input.files && input.files.length > 0) {
      console.log("触发文件输入框点击");
      console.log("选择的文件数量:", input.files.length);
      const files = Array.from(input.files);
      const randomFactor = new Date().getTime().toString();

      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });
      formData.append("randomFactor", randomFactor);

      try {
        console.log("开始上传请求");
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        console.log("上传请求完成，响应状态:", response.status);
        const data = await response.json();
        if (response.ok) {
          setUploadedImages(data.imageUrls);
        } else {
          console.error("上传失败:", data.error);
        }
      } catch (error) {
        console.error("上传出错:", error);
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
