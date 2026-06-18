import { OfficeParser, type SupportedFileType } from "officeparser";

const TEXT_EXTENSIONS = new Set(["md", "txt"]);
const OFFICE_EXTENSIONS = new Set(["pdf", "ppt", "pptx"]);
const MAX_TEXT_LENGTH = 18000;

function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

export async function extractText(file: File): Promise<string> {
  const extension = getExtension(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  let text: string;

  if (TEXT_EXTENSIONS.has(extension)) {
    text = buffer.toString("utf-8");
  } else if (OFFICE_EXTENSIONS.has(extension)) {
    const fileType = (extension === "ppt" ? "pptx" : extension) as SupportedFileType;
    const ast = await OfficeParser.parseOffice(buffer, { fileType });
    text = ast.toText();
  } else {
    throw new Error(`지원하지 않는 파일 형식입니다: .${extension}`);
  }

  text = text.trim();
  if (!text) throw new Error("문서에서 텍스트를 추출할 수 없습니다.");
  return text.slice(0, MAX_TEXT_LENGTH);
}
