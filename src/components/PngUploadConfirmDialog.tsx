import React, { useEffect, useState } from "react";
import { Modal, Table } from "antd";
import { IUploadedResult } from "./UploadButton";
import {
  extractFirstFrameEdges,
  simplifyVerticesV2,
} from "@/utils/webCanvasTool";
import { calculateSpriteFrames } from "@/utils";
import { Vertices } from "matter-js";

interface IConfirmPngUploadProps {
  files: File[];
  // onConfirm: (selectedFiles: File[]) => void;
  onClose: () => void;
  open: boolean;
  uploadHandler: (files: File[]) => Promise<IUploadedResult>;
}

interface TableRecord {
  key: string;
  file: File;
  name: string;
  size: number;
}

const PngUploadConfirmModal: React.FC<IConfirmPngUploadProps> = ({
  files,
  // onConfirm,
  onClose,
  open,
  uploadHandler,
}) => {
  const pngFiles = files.filter((file) =>
    file.name.toLowerCase().endsWith(".png")
  );
  const initialSelectedRowKeys: any[] = [];
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>(
    initialSelectedRowKeys
  );

  const [spriteInfoFiles, setSpriteInfoFiles] = useState<any[]>([]);

  const columns = [
    {
      title: "缩略图",
      dataIndex: "thumbnail",
      key: "thumbnail",
      render: (_: any, record: TableRecord) => (
        <img
          src={URL.createObjectURL(record.file)}
          alt={record.file.name}
          style={{ width: 50, height: 50, objectFit: "cover" }}
        />
      ),
    },
    {
      title: "图片名",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "图片尺寸",
      dataIndex: "size",
      key: "size",
      render: (size: number) => `${(size / 1024).toFixed(2)} KB`,
    },
  ];

  const dataSource = pngFiles.map((file) => ({
    key: file.name,
    file,
    name: file.name,
    size: file.size,
  }));

  const rowSelection = {
    selectedRowKeys,
    onChange: async (selectedKeys: React.Key[]) => {
      const clonedSpriteInfoFiles = [...spriteInfoFiles];
      for (let selectedKey of selectedKeys) {
        const foundSpriteFile = clonedSpriteInfoFiles.find(
          (spriteFile: any) => {
            return spriteFile.name === selectedKey;
          }
        );

        if (!foundSpriteFile.jsonFile) {
          foundSpriteFile.jsonFile = await extractSpriteImgMetaToJsonFile(
            foundSpriteFile.file
          );
          console.log(
            "==== foundSpriteFile.jsonFile",
            foundSpriteFile.jsonFile
          );
        }
      }

      setSpriteInfoFiles(clonedSpriteInfoFiles);
      setSelectedRowKeys(selectedKeys);
    },
  };

  const extractSpriteImgMetaToJsonFile = (
    pngFile: File
  ): Promise<File | null> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");

      const ctx = canvas.getContext("2d");

      const file = pngFile;
      console.log("选择的文件:", file);
      const reader = new FileReader();
      reader.onerror = () => {
        console.error("文件读取错误:", reader.error);
      };
      reader.onload = (event) => {
        console.log("=== reader.onload");
        const nativeImage = new Image();
        nativeImage.onload = async () => {
          if (!ctx) return;
          canvas.width = nativeImage.width;
          canvas.height = nativeImage.height;
          ctx.drawImage(nativeImage, 0, 0);

          const imageData = ctx.getImageData(
            0,
            0,
            nativeImage.width,
            nativeImage.height
          );

          const detectedImageData = await extractFirstFrameEdges(imageData);
          console.log("== detectedImageData", detectedImageData);

          const { vertices, frameWidth, frameHeight, wholeWidth, wholeHeight } =
            detectedImageData;
          // console.log(
          //   "=== detected frameWidth: %s, frameHeight: %s",
          //   frameWidth,
          //   frameHeight
          // );

          const calFrameResult = calculateSpriteFrames(
            wholeWidth,
            wholeHeight,
            35,
            frameWidth,
            frameHeight
          );

          console.log("== calFrameResult", calFrameResult);
          if (!calFrameResult || calFrameResult.totalFrames <= 3) {
            // 无法分析出结果，或检测的帧数较少，暂定其不是sprite图
            // return reject(new Error("无法计算出帧数"));
            return resolve(null);
          }
          // const { frameSize, totalFrames, cols, rows } =
          //   calFrameResult || {};

          const sortedVertices = Vertices.clockwiseSort(vertices);
          // const simplifiedVertices = simplifyVerticesV2(sortedVertices);
          // const simplifiedVertices30 = simplifyVerticesV2(sortedVertices, 30);
          const simplifiedVertices20 = simplifyVerticesV2(sortedVertices, 20);

          const imageInfo: any = {
            name: file.name,
            lastModified: file.lastModified,
            frameWidth: frameWidth,
            frameHeight: frameHeight,
            // vertices: vertices,
            vertices: simplifiedVertices20,
            // lastModifiedDate: file.lastModifiedDate,
            width: nativeImage.width,
            height: nativeImage.height,
            size: file.size,
          };

          console.log("图片信息:", imageInfo);

          const jsonStr = JSON.stringify(imageInfo, null, 2);
          // 创建 File 对象
          const resultJsonFile = new File([jsonStr], "data.json", {
            type: "application/json",
          });

          resolve(resultJsonFile);
        };

        if (event.target) {
          nativeImage.src = event.target.result as string;
        }
      };
      console.log("开始读取文件...");
      reader.readAsDataURL(file);

      // const jsonStr = JSON.stringify(spriteMeta, null, 2);
      // // 创建 File 对象
      // const file = new File([jsonStr], "data.json", {
      //   type: "application/json",
      // });
      // return file;
    });
  };
  const handleConfirm = async () => {
    // const [firstSelectedFileObj] = dataSource;

    // const extractedJsonFile = await extractSpriteImgMetaToJsonFile(
    //   firstSelectedFileObj.file
    // );

    // console.log("== extractedJsonFile: ", extractedJsonFile);

    // onClose();
    // return;
    // 第1步：上传原文件列表
    // 第2步：提取选中的png图片，将信息保存到json元文件中
    // 第3步：获取上传后文件的url地址和选中png元文件做个映射，再上传（元文件url和图片地址匹配，仅后缀不同）
    const { uploadedFiles } = await uploadHandler(files);
    const selectedFulSpriteFilesInfo = spriteInfoFiles.filter((item: any) =>
      selectedRowKeys.includes(item.key)
    );

    const mappedSpriteFiles = selectedFulSpriteFilesInfo.map((item) => {
      const uploadedFile = uploadedFiles.find(
        (file: any) => file.originalName === item.name
      );

      const urlObj = new URL(uploadedFile.url);
      const preDefinedName = urlObj.pathname.replace(".png", ".json");

      if (item.jsonFile) {
        item.jsonFile.preDefinedName = preDefinedName;
      }
      return item.jsonFile;
    });

    await uploadHandler(mappedSpriteFiles);

    // { url, originalName } = uploadedFiles;

    // const selectedFiles = dataSource
    //   .filter((item) => selectedRowKeys.includes(item.key))
    //   .map((item) => item.file);

    // await uploadHandler(selectedFiles);
    // onConfirm(selectedFiles);
  };

  useEffect(() => {
    const asyncInit = async () => {
      console.log("selectedRowKeys: ", selectedRowKeys);
      if (open) {
        const mappedFiles = pngFiles.map((file) => {
          return {
            key: file.name,
            file,
            name: file.name,
            size: file.size,
            jsonFile: null,
          };
        });

        for (let item of mappedFiles) {
          const extractedJsonFile = await extractSpriteImgMetaToJsonFile(
            item.file
          );

          // @ts-ignore
          item.jsonFile = extractedJsonFile;
        }

        setSpriteInfoFiles(mappedFiles);

        const detectedSpriteFile = mappedFiles.filter(
          (item: any) => item.jsonFile
        );

        const detectedSpriteFileNames = detectedSpriteFile.map(
          (item: any) => item.name
        );

        console.log("=== mappedFiles", mappedFiles);
        console.log("=== detectedSpriteFile", detectedSpriteFile);
        console.log("=== detectedSpriteFileNames", detectedSpriteFileNames);
        setSelectedRowKeys(detectedSpriteFileNames);
      }
    };

    asyncInit();
  }, [open]);

  return (
    <Modal
      title="检测到可能的动效图片"
      open={open}
      onOk={handleConfirm}
      onCancel={onClose}
    >
      <p>从勾选的图片中提取动效信息并以json格式上传</p>
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        style={{ marginTop: 16 }}
        rowSelection={rowSelection}
      />
    </Modal>
  );
};

export default PngUploadConfirmModal;
