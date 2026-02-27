import { getAllMapperChanges } from "@/actions/get-all-mapper-changes";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const users = await getAllMapperChanges();
  return NextResponse.json(users);
}
