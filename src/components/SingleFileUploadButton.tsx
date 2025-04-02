import React, { useRef } from "react";

const SingleFileUploadButton: React.FC<{
  setUploadedImages: (images: string[]) => void;
}> = ({ setUploadedImages }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    const input = inputRef.current;
    if (input && input.files && input.files.length > 0) {
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
