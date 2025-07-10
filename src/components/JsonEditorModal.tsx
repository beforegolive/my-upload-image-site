import React from "react";
import { Modal } from "antd";
import { JsonEditor } from "json-edit-react";

interface JSONEditorModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: () => void;
  data: Record<string, any>;
  setData: (newData: Record<string, any>) => void;
}

const JsonEditorModal: React.FC<JSONEditorModalProps> = ({
  visible,
  onCancel,
  onOk,
  data,
  setData,
}) => {
  return (
    <Modal
      title="编辑 JSON"
      open={visible}
      onCancel={onCancel}
      onOk={onOk}
      width={"80vw"}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          overflowY: "scroll",
          maxHeight: "60vh",
        }}
      >
        <JsonEditor
          maxWidth={"100%"}
          data={data}
          setData={(newData: any) => setData(newData as any)}
        />
      </div>
    </Modal>
  );
};

export default JsonEditorModal;
