import { NextResponse } from "next/server";
import { fetchMoodImages } from "@/lib/moodImages";
import type { MoodImagesResponse } from "@/types";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : [];
}

export async function POST(request: Request) {
  const body = await request.json();
  const queries = asStringArray(body?.queries).length ? asStringArray(body?.queries) : asStringArray([body?.query]);
  const gainTerms = asStringArray(body?.gainTerms);
  const page = Number.isInteger(body?.page) && body.page > 0 ? body.page : 1;

  if (!queries.length) {
    return NextResponse.json({ error: "검색어가 필요합니다." }, { status: 400 });
  }

  const { images, providers } = await fetchMoodImages(queries, gainTerms, page);
  const response: MoodImagesResponse = { images, queries, providers };
  return NextResponse.json(response);
}
