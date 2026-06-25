import { NextResponse } from "next/server";
import { regenerateMoods } from "@/lib/generatorAnalysis";
import type { GeneratorAnalysis, RegenerateMoodsApiResponse } from "@/types";

export async function POST(request: Request) {
  const body = await request.json();
  const documentText = body?.documentText;
  const projectIntent = body?.projectIntent as GeneratorAnalysis["projectIntent"] | undefined;
  const brief = typeof body?.brief === "string" ? body.brief : undefined;
  const primaryColor = typeof body?.primaryColor === "string" && body.primaryColor.trim() ? body.primaryColor.trim() : undefined;

  if (typeof documentText !== "string" || !documentText.trim() || !projectIntent) {
    return NextResponse.json({ error: "재생성에 필요한 정보가 부족합니다." }, { status: 400 });
  }

  try {
    const { result, source, error } = await regenerateMoods(documentText, projectIntent, brief, primaryColor);
    const response: RegenerateMoodsApiResponse = { ...result, source, ...(error ? { regenerateError: error } : {}) };
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
