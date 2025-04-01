import React from "react";

const ImageList: React.FC<{ images: string[] }> = ({ images }) => {
  return (
    <div className="grid grid-cols-2 gap-4 mt-8">
      {images.map((imageUrl, index) => {
        const decodedFileName = decodeURIComponent(
          imageUrl.split("/").pop() || ""
        );
        const fileSize = (Math.random() * 1024).toFixed(2) + "KB";
        const fileExtension = decodedFileName?.split(".").pop();
        return (
          <div
            key={index}
            className="border border-gray-300 rounded-md p-4 flex space-x-4"
          >
            <img
              src={imageUrl}
              alt={`Uploaded ${index}`}
              className="w-1/3 h-100px object-cover rounded-md"
            />
            <div className="flex flex-col justify-center space-y-2">
              <div className="text-gray-700 text-lg">
                图片名称: {decodedFileName}
              </div>
              <div className="text-gray-700 text-lg">文件大小: {fileSize}</div>
              <div className="text-gray-700 text-lg">
                文件后缀: {fileExtension}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ImageList;
