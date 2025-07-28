import React, { useRef, useState } from 'react'
// import DirectoryUploadButton from "./DirectoryUploadButton";
// import { Image } from "../types";
import { App } from 'antd'
import PngUploadConfirmModal from './PngUploadConfirmDialog'
import DirectoryUploadButton from './DirectoryUploadButton'
import { isEmpty } from '@/utils'
import { specialFileExts } from '@/constants'
// import { isEmpty } from "@/utils";

const maxLoadingToastDurationMs = 5000

export interface IUploadedResult {
  uploadedFiles: any[]
}

const UploadButton: React.FC<{
  setUploadedImages: (images: any[]) => void
}> = ({ setUploadedImages }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isCompressionEnabled, setIsCompressionEnabled] = useState(true)
  const [showPngModal, setShowPngModal] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const { message } = App.useApp()
  // 文件上传核心逻辑，单文件和多文件复用。
  const handleUploadCore = async (files: File[]): Promise<IUploadedResult> => {
    console.log('== ')
    const loadingInstance = message.loading(
      '正在上传文件，请稍候...',
      maxLoadingToastDurationMs / 1000
    )

    const randomFactor = new Date().getTime().toString()
    const formData = new FormData()
    formData.append('compress', isCompressionEnabled ? 'true' : 'false')

    const validFiles = Array.from(files).filter((file) => !file.name.startsWith('.'))

    validFiles.forEach((file) => {
      formData.append('files', file)
    })
    formData.append('randomFactor', randomFactor)

    let predefinedNames: string[] = []
    // @ts-ignore
    if (files.some((item) => !isEmpty(item.preDefinedName))) {
      // @ts-ignore
      predefinedNames = files.map((item) => item.preDefinedName)
    }
    const hasPredefinedNames = predefinedNames.length > 0

    if (hasPredefinedNames) {
      formData.append('preDefinedNames', predefinedNames.join('|'))
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (response.ok) {
        setUploadedImages(data.imageUrls)
        message.success('文件上传成功')
        return { uploadedFiles: data.imageUrls }
      } else {
        console.error('上传失败:', data.error)
        message.error('文件上传失败，请稍后重试')

        return { uploadedFiles: [] }
      }
    } catch (error) {
      console.error('上传出错:', error)
      message.error('文件上传出错，请稍后重试')
      return { uploadedFiles: [] }
    } finally {
      loadingInstance()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      return handleUploadWithSpriteCheck(files)
    }
  }
  const handleUploadWithSpriteCheck = async (files: File[], skipCheck = false) => {
    if (skipCheck) {
      return handleUploadCore(files)
    }

    const passAndGoUpload = await beforeUploadCheck(files)

    if (passAndGoUpload) {
      return handleUploadCore(files)
    }
  }

  /** 检查是否有png图片，如果有则弹窗确认，之后才正式上传 */
  const beforeUploadCheck = (files: File[]) => {
    const hasSpecialFile = files.some((file) => {
      return specialFileExts.some((ext) => file.name.toLowerCase().endsWith(ext))
    })
    console.log('** hasSpecialFile:', hasSpecialFile)
    if (hasSpecialFile) {
      // 如有特别的待处理文件则走弹窗确认，否则直接上传
      setPendingFiles(files)
      setShowPngModal(true)
      return Promise.resolve(false)
    } else {
      return Promise.resolve(true)
    }
  }

  const handleCancelPngUpload = () => {
    setShowPngModal(false)
    setPendingFiles([])
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <>
      <div className="flex items-center space-x-4">
        <button
          onClick={handleClick}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          单一文件上传
        </button>
        <DirectoryUploadButton handleUploadWithSpriteCheck={handleUploadWithSpriteCheck} />

        <input
          ref={fileInputRef}
          type="file"
          // 添加 application/xml 支持 xml 文件上传
          accept="image/jpeg, image/png, audio/mpeg, application/json, application/xml"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
      {showPngModal && (
        <PngUploadConfirmModal
          files={pendingFiles}
          open={showPngModal}
          uploadHandler={handleUploadCore}
          onClose={handleCancelPngUpload}
        />
      )}
    </>
  )
}

export default UploadButton
