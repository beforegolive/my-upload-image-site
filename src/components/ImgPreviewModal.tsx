import React from "react";
import { Modal } from "antd";

interface ImgPreviewModalProps {
  previewImage: string;
  open: boolean;
  previewImageName: string;
  onCancel: () => void;
}

const ImgPreviewModal: React.FC<ImgPreviewModalProps> = ({
  previewImage,
  open,
  previewImageName,
  onCancel,
}) => {
  return (
    <Modal
      title={previewImageName}
      open={open}
      footer={null}
      onCancel={onCancel}
      // style={{ padding: "30px" }}
    >
      <img
        src={previewImage}
        alt="预览"
        style={{ width: "100%", marginTop: "20px", marginBottom: "10px" }}
      />
    </Modal>
  );
};

export default ImgPreviewModal;
