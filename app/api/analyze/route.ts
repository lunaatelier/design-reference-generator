import { NextResponse } from "next/server";
import { extractText } from "@/lib/extractText";
import { analyzeDocument } from "@/lib/generatorAnalysis";
import type { AnalyzeResponse } from "@/types";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const primaryColor = formData.get("primaryColor");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일이 업로드되지 않았습니다." }, { status: 400 });
  }

  try {
    const text = await extractText(file);
    const { analysis, source, documentText } = await analyzeDocument(text, typeof primaryColor === "string" && primaryColor.trim() ? primaryColor.trim() : undefined);
    const response: AnalyzeResponse = { analysis, extractedTextLength: text.length, documentText, analysisSource: source };
    return NextResponse.json(response);
  } catch (error) {
    console.error("analyze 실패:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
