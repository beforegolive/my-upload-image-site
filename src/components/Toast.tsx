// src/components/Toast.tsx
import React, { useState, useEffect } from "react";

interface ToastProps {
  show: boolean;
  message: string;
  type: "success" | "error";
  duration: number;
  onHide: () => void;
}

const Toast: React.FC<ToastProps> = ({
  show,
  message,
  type,
  duration,
  onHide,
}) => {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
    if (show) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onHide();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onHide]);

  const backgroundColor = type === "success" ? "bg-green-500" : "bg-red-500";

  return (
    isVisible && (
      <div
        className={`fixed top-4 left-1/2 transform -translate-x-1/2 p-4 text-white rounded-md shadow-md ${backgroundColor}`}
        style={{ zIndex: 9999 }}
      >
        {message}
      </div>
    )
  );
};

export default Toast;
