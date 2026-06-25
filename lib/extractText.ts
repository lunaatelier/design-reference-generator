import { OfficeParser, type SupportedFileType } from "officeparser";

const TEXT_EXTENSIONS = new Set(["md", "txt"]);
const OFFICE_EXTENSIONS = new Set(["pdf", "ppt", "pptx"]);
// 18,000자는 근거 없는 초기값이었음 — 메뉴가 여러 개인 홈페이지 리뉴얼 통합본처럼 메인페이지
// 분량만으로도 18K를 넘는 설계 문서가 있어, 그 이후 서브페이지 내용이 통째로 잘려나가는
// 문제가 있었다(메인페이지만 인식되는 버그의 원인). gemini-2.5-flash-lite는 컨텍스트가
// 넉넉해 60K자 정도는 비용/한도에 영향이 없다.
const MAX_TEXT_LENGTH = 60000;

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

/** 확장자를 뗀 파일명. 브로셔/제안서 같은 산출물 유형 시그널이 본문보다 파일명에 더 명확히 들어있는 경우가 많아 프롬프트에 함께 전달한다. */
export function getFileTitle(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? fileName : fileName.slice(0, dot);
}
