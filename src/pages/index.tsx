// my-upload-image-site/src/pages/index.tsx
import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { uploadedImagesAtom } from "../atoms";
import ImageList from "../components/ImageList";
import UploadButton from "../components/UploadButton";
import Pagination from "../components/Pagination";

const HomePage: React.FC = () => {
  const [uploadedImages, setUploadedImages] = useAtom(uploadedImagesAtom);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const fetchHistoryImages = async () => {
      setLoadingHistory(true);
      try {
        const response = await fetch(
          `/api/get-images?page=${currentPage}&limit=${itemsPerPage}`
        );
        const data = await response.json();
        console.log("从后端获取的图片数据:", data); // 添加日志输出
        if (response.ok) {
          setUploadedImages(data.imageUrls);
          setTotalPages(Math.ceil(data.totalCount / itemsPerPage));
        } else {
          console.error("获取历史图片失败:", data.error);
        }
      } catch (error) {
        console.error("获取历史图片出错:", error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistoryImages();
  }, [currentPage]);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">文件上传站点</h1>
      <UploadButton setUploadedImages={setUploadedImages} />
      {loadingHistory && (
        <div className="mt-4 text-gray-600 text-lg">正在加载历史图片...</div>
      )}
      <ImageList
        images={uploadedImages}
        onImageClick={() => {}} // 可根据需要添加具体逻辑
      />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        paginate={paginate}
      />
    </div>
  );
};

export default HomePage;
