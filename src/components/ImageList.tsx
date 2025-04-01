import React, { useState } from "react";

const CopyUrlButton: React.FC<{ imageUrl: string }> = ({ imageUrl }) => {
  const [isCopied, setIsCopied] = React.useState(false);

  const handleCopyClick = () => {
    navigator.clipboard
      .writeText(imageUrl)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      })
      .catch((error) => {
        console.error("复制失败:", error);
      });
  };

  return (
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
  );
};

const ImageList: React.FC<{
  images: string[];
  currentPage: number;
  totalPages: number;
  paginate: (pageNumber: number) => void;
}> = ({ images, currentPage, totalPages, paginate }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  const handleOutsideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mt-8">
        {images.map((imageUrl, index) => {
          const decodedFileName = decodeURIComponent(
            imageUrl.split("/").pop() || ""
          );
          const fileSize = (Math.random() * 1024).toFixed(2) + "KB";
          const fileExtension = decodedFileName?.split(".").pop();
          const pathParts = imageUrl.split("/");
          const directoryName = pathParts
            .slice(0, pathParts.length - 1)
            .join("/");
          const fullName = directoryName
            ? `${directoryName}/${decodedFileName}`
            : decodedFileName;

          return (
            <div
              key={index}
              className="border border-gray-300 rounded-md p-4 flex space-x-4"
            >
              <img
                src={imageUrl}
                alt={`Uploaded ${index}`}
                className="w-100px rounded-md cursor-pointer"
                onClick={() => handleImageClick(imageUrl)}
              />
              <div className="flex flex-col justify-center space-y-2 text-white break-words">
                <div className="text-gray-300 text-sm">
                  图片名称: {fullName}
                </div>
                <div className="text-gray-300 text-sm">
                  文件大小: {fileSize}
                </div>
                <div className="text-gray-300 text-sm">
                  文件后缀: {fileExtension}
                </div>
                <CopyUrlButton imageUrl={imageUrl} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center mt-4">
        <button
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 mx-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          上一页
        </button>
        {Array.from({ length: totalPages }, (_, index) => (
          <button
            key={index}
            onClick={() => paginate(index + 1)}
            className={`px-3 py-1 mx-1 rounded-md ${
              currentPage === index + 1
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {index + 1}
          </button>
        ))}
        <button
          onClick={() => paginate(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 mx-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          下一页
        </button>
      </div>
      {selectedImage && (
        <div
          className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={handleOutsideClick}
        >
          <div
            className="bg-white p-4 rounded-md relative max-w-[80vw] max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              alt="Preview"
              className="max-w-full max-h-full"
            />
            <button
              className="absolute top-4 right-4 text-white bg-gray-500 w-8 h-8 rounded-full flex justify-center items-center text-2xl font-bold"
              onClick={handleCloseModal}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageList;
