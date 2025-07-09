import React, { useState } from "react";
import { Modal, Table } from "antd";

interface ConfirmPngUploadProps {
  files: File[];
  onConfirm: (selectedFiles: File[]) => void;
  onCancel: () => void;
  open: boolean;
}

const PngUploadConfirmModal: React.FC<ConfirmPngUploadProps> = ({
  files,
  onConfirm,
  onCancel,
  open,
}) => {
  const pngFiles = files.filter((file) =>
    file.name.toLowerCase().endsWith(".png")
  );
  const initialSelectedRowKeys = pngFiles.map((file) => file.name);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>(
    initialSelectedRowKeys
  );

  interface TableRecord {
    key: string;
    file: File;
    name: string;
    size: number;
  }

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
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    },
  };

  const handleConfirm = () => {
    const selectedFiles = dataSource
      .filter((item) => selectedRowKeys.includes(item.key))
      .map((item) => item.file);
    onConfirm(selectedFiles);
  };

  return (
    <Modal
      title="检测到 PNG 图片"
      open={open}
      onOk={handleConfirm}
      onCancel={onCancel}
    >
      <p>检测到上传文件中包含 PNG 图片，是否继续上传？</p>
      <h4>PNG 图片列表：</h4>
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
