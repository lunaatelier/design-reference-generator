import { NextResponse } from "next/server";
import { fetchMoodImages } from "@/lib/moodImages";
import type { MoodImagesResponse } from "@/types";

export async function POST(request: Request) {
  const body = await request.json();
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  if (!query) {
    return NextResponse.json({ error: "검색어가 필요합니다." }, { status: 400 });
  }

  const { images, providers } = await fetchMoodImages(query);
  const response: MoodImagesResponse = { images, query, providers };
  return NextResponse.json(response);
}
