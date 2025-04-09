// src/pages/index.tsx
import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { uploadedImagesAtom } from "../atoms";
import ImageList from "../components/ImageList";
import UploadButton from "../components/UploadButton";
import Pagination from "../components/Pagination";
import Cookies from "js-cookie";
import { useRouter } from "next/router";

const HomePage: React.FC = () => {
  const router = useRouter();
  const [uploadedImages, setUploadedImages] = useAtom(uploadedImagesAtom);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      // 未登录，重定向到登录页
      router.push("/login");
    }
  }, []);

  useEffect(() => {
    const fetchHistoryImages = async () => {
      setLoadingHistory(true);
      try {
        const response = await fetch(
          `/api/get-images?page=${currentPage}&limit=${itemsPerPage}`
        );
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

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleLogout = () => {
    Cookies.remove("token");
    router.push("/login");
  };

  return (
    <div className="p-8 relative">
      <h1 className="text-4xl font-bold mb-4">文件上传站点</h1>
      <button
        onClick={handleLogout}
        className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 text-sm rounded-md"
      >
        退出登录
      </button>
      <UploadButton setUploadedImages={setUploadedImages} />
      {loadingHistory && (
        <div className="mt-4 text-gray-600 text-lg">正在加载历史图片...</div>
      )}
      <ImageList images={uploadedImages} onImageClick={() => {}} />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        paginate={paginate}
      />
    </div>
  );
};

export default HomePage;
