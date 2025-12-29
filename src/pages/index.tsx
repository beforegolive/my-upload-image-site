// src/pages/index.tsx
import React, { useState, useEffect, useRef } from "react";
import { useAtom } from "jotai";
import { uploadedImagesAtom } from "../atoms";
import ImageList from "../components/ImageList";
import UploadButton from "../components/UploadButton";
import Pagination from "../components/Pagination";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { App } from "antd";
import { maxLoadingToastDurationMs } from "@/constants";
import { Typography } from "antd";

const { Title } = Typography;

const defaultSnackBarKey = "";
const HomePage: React.FC = () => {
  const router = useRouter();
  // const adminToken = searchParams.get("token") || "";
  const { message } = App.useApp();
  const [uploadedImages, setUploadedImages] = useAtom(uploadedImagesAtom);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [totalPages, setTotalPages] = useState(0);
  const loadingRef = useRef<ReturnType<typeof message.loading> | null>(null);

  const fillImagesAtStart = (imgs: any[]) => {
    setUploadedImages((prev) => {
      return [...imgs, ...prev];
    });
  };

  const fetchHistoryImages = async () => {
    // 如果已有 loading，先关闭
    if (loadingRef.current) {
      loadingRef.current();
      loadingRef.current = null;
    }

    loadingRef.current = message.loading(
      "加载图片中...",
      maxLoadingToastDurationMs / 1000
    );

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
        message.error("获取历史图片失败，请稍后重试");
      }
    } catch (error) {
      console.error("获取历史图片出错:", error);
      message.error("获取历史图片出错，请稍后重试");
    } finally {
      if (loadingRef.current) {
        loadingRef.current();
        loadingRef.current = null;
      }
    }
  };

  useEffect(() => {
    const token = Cookies.get("token");
    const params = new URLSearchParams(window.location.search);
    // 给我个人留的快捷入口，方便测试
    const mockToken = params.get("token");

    if (!token && !mockToken) {
      // 未登录，重定向到登录页
      router.push("/login");

      return;
    }

    fetchHistoryImages();
  }, [currentPage]);

  // 监听 loadingHistory 的变化，当为 false 时关闭 loading 消息
  // useEffect(() => {
  //   if (!loadingHistory && loadingMessage) {
  //     loadingMessage();
  //     setLoadingMessage(null);
  //   }
  // }, [loadingHistory]);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleTitleClick = () => {
    window.location.reload();
  };

  return (
    <div>
      <h1
        onClick={handleTitleClick}
        className="text-4xl font-bold mb-4 cursor-pointer text-black"
      >
        文件管理
      </h1>
      <UploadButton setUploadedImages={fillImagesAtStart} />
      {/* 在图片列表上方添加分页组件，并添加边距 */}
      <div className="mt-4 mb-4">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          paginate={paginate}
        />
      </div>
      <ImageList images={uploadedImages} onImageClick={() => {}} />
      {/* 保留原有的分页组件 */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        paginate={paginate}
      />
    </div>
  );
};

export default HomePage;
