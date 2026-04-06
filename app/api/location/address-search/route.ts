import { NextResponse } from "next/server";

import { searchAddresses } from "@/lib/kakao";
import { isAllowedServiceArea } from "@/lib/service-area";
import { addressSearchSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { query } = addressSearchSchema.parse({
      query: url.searchParams.get("query") ?? "",
    });

    const results = await searchAddresses(query);

    return NextResponse.json({
      results: results.filter((result) =>
        isAllowedServiceArea(result.region1DepthName, result.region2DepthName, result.region3DepthName),
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "주소 검색에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}
