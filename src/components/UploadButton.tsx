import React, { useRef, useState } from "react";

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).catch((error) => {
    console.error("复制失败:", error);
  });
};

// 新的组件来处理单个图片项
const ImageItem: React.FC<{ imageUrl: string }> = ({ imageUrl }) => {
  const decodedFileName = decodeURIComponent(imageUrl.split("/").pop() || "");
  const fileSize = (Math.random() * 1024).toFixed(2) + "KB";
  const fileExtension = decodedFileName?.split(".").pop();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyClick = () => {
    copyToClipboard(imageUrl);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return (
    <div className="border border-gray-300 rounded-md p-4 flex space-x-4">
      <img
        src={imageUrl}
        alt={`Uploaded ${imageUrl}`}
        className="w-1/3 h-100px object-cover rounded-md"
      />
      <div className="flex flex-col justify-center space-y-2">
        <div className="text-gray-700 text-sm">图片名称: {decodedFileName}</div>
        <div className="text-gray-700 text-sm">文件大小: {fileSize}</div>
        <div className="text-gray-700 text-sm">文件后缀: {fileExtension}</div>
        <button
          onClick={handleCopyClick}
          className={`px-2 py-1 rounded-md ${
            isCopied
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
          disabled={isCopied}
        >
          {isCopied ? "已复制" : "复制 URL"}
        </button>
      </div>
    </div>
  );
};

const ImageList: React.FC<{ images: string[] }> = ({ images }) => {
  return (
    <div className="grid grid-cols-2 gap-4 mt-8">
      {images.map((imageUrl, index) => (
        <ImageItem key={index} imageUrl={imageUrl} />
      ))}
    </div>
  );
};

const UploadButton: React.FC<{
  setUploadedImages: (images: string[]) => void;
}> = ({ setUploadedImages }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDirectoryUpload, setIsDirectoryUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setIsUploading(true);
      setUploadError(null);
      setUploadProgress(0);
      const newImages: string[] = [];
      const totalFiles = files.length;
      let uploadedFiles = 0;

      const uploadFile = async (file: File) => {
        try {
          const formData = new FormData();
          const fileName = encodeURIComponent(file.name);
          formData.append("file", file, fileName);
          if (isDirectoryUpload) {
            formData.append("isDirectoryUpload", "true");
          }

          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/upload", true);
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const progress =
                (event.loaded / event.total) * (100 / totalFiles);
              setUploadProgress((prevProgress) => prevProgress + progress);
            }
          });

          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                newImages.push(data.imageUrl);
              } else {
                const data = JSON.parse(xhr.responseText);
                throw new Error(data.error);
              }
              uploadedFiles++;
              if (uploadedFiles === totalFiles) {
                setUploadedImages((prevImages) => [
                  ...prevImages,
                  ...newImages,
                ]);
                setIsUploading(false);
                setIsDirectoryUpload(false);
              }
            }
          };

          xhr.send(formData);
        } catch (error) {
          console.error("图片上传失败:", error);
          setUploadError(`上传文件 ${file.name} 时出错: ${error}`);
        }
      };

      for (let i = 0; i < totalFiles; i++) {
        await uploadFile(files[i]);
      }
    }
  };

  const handleUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("webkitdirectory", "");
      fileInputRef.current.setAttribute("directory", "");
      fileInputRef.current.multiple = true;
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.click();
    }
  };

  const handleDirectoryUpload = () => {
    setIsDirectoryUpload(true);
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("webkitdirectory", "");
      fileInputRef.current.setAttribute("directory", "");
      fileInputRef.current.multiple = true;
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.click();
    }
  };

  return (
    <>
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
      <button
        onClick={handleDirectoryUpload}
        disabled={isUploading}
        className={`px-4 py-2 ml-2 rounded-md ${
          isUploading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-green-500 text-white hover:bg-green-600"
        }`}
      >
        {isUploading ? "上传中..." : "按目录上传图片"}
      </button>
      {uploadError && (
        <div className="mt-4 text-red-500 text-lg">{uploadError}</div>
      )}
      {isUploading && (
        <div className="mt-4">
          <div className="bg-gray-200 rounded-full h-2.5 mb-4">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <div className="text-gray-700 text-sm">
            上传进度: {uploadProgress.toFixed(2)}%
          </div>
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
};

export default UploadButton;
