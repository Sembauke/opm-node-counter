import { getAllCountryChanges } from "@/actions/get-all-country-changes";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const countries = await getAllCountryChanges();
  return NextResponse.json(countries);
}
