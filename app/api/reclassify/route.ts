import { NextResponse } from "next/server";
import { applyAssetTypeOverride } from "@/lib/generatorAnalysis";
import type { GeneratorAnalysis } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const analysis = body?.analysis as GeneratorAnalysis | undefined;
    const assetType = typeof body?.assetType === "string" ? body.assetType.trim() : "";

    if (!analysis || !assetType) {
      return NextResponse.json({ error: "재분류에 필요한 정보가 부족합니다." }, { status: 400 });
    }

    const updated = applyAssetTypeOverride(analysis, assetType);
    return NextResponse.json({ analysis: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
