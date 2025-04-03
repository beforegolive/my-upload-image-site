import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { uploadedImagesAtom } from "../atoms";
import ImageList from "../components/ImageList";
import UploadButton from "../components/UploadButton";

const HomePage: React.FC = () => {
  const [uploadedImages, setUploadedImages] = useAtom(uploadedImagesAtom);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    console.log("当前页码:", currentPage); // 确认页码状态是否正确更新
    const fetchHistoryImages = async () => {
      setLoadingHistory(true);
      try {
        const response = await fetch(
          `/api/get-images?page=${currentPage}&limit=${itemsPerPage}`
        );
        console.log(
          "请求的 URL:",
          `/api/get-images?page=${currentPage}&limit=${itemsPerPage}`
        ); // 确认请求的 URL 是否正确
        const data = await response.json();
        console.log("从后端获取的图片数据:", data);
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

  const paginate = (pageNumber: number) => {
    console.log("点击的页码:", pageNumber); // 确认点击的页码
    setCurrentPage(pageNumber);
  };

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">文件上传站点</h1>
      <UploadButton setUploadedImages={setUploadedImages} />
      {loadingHistory && (
        <div className="mt-4 text-gray-600 text-lg">正在加载历史图片...</div>
      )}
      <ImageList
        images={uploadedImages}
        currentPage={currentPage}
        totalPages={totalPages}
        paginate={paginate}
      />
    </div>
  );
};

export default HomePage;
