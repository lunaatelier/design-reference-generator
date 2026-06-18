"use client";

import { useRef, useState, type DragEvent } from "react";

const ACCEPTED_EXTENSIONS = [".md", ".txt", ".pdf", ".ppt", ".pptx"];

type FileDropzoneProps = {
  selectedFile: File | null;
  onFileSelected: (file: File) => void;
  disabled?: boolean;
};

export default function FileDropzone({ selectedFile, onFileSelected, disabled }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors ${
        isDragging ? "border-teal-300 bg-teal-300/10" : "border-white/20 bg-white/6 hover:border-teal-300/70"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />
      {selectedFile ? (
        <>
          <p className="max-w-full break-all font-semibold text-white">{selectedFile.name}</p>
          <p className="text-sm text-zinc-400">다른 파일을 선택하려면 클릭하거나 드래그하세요</p>
        </>
      ) : (
        <>
          <p className="font-semibold text-white">설계 문서를 드래그하거나 클릭해서 업로드</p>
          <p className="text-sm text-zinc-400">지원 형식: .md, .txt, .pdf, .ppt, .pptx</p>
        </>
      )}
    </div>
  );
}
