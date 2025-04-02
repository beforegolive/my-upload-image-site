import React, { useRef } from "react";

const DirectoryUploadButton: React.FC<{
  setUploadedImages: (images: string[]) => void;
}> = ({ setUploadedImages }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = () => {
    if (inputRef.current) {
      // 动态设置 webkitdirectory 和 directory 属性
      inputRef.current.setAttribute("webkitdirectory", "");
      inputRef.current.setAttribute("directory", "");
      inputRef.current.click();
    }
  };
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    if (input.files) {
      const files = Array.from(input.files);
      const randomFactor = new Date().getTime().toString();

      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file); // 确保字段名是 'files'
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
