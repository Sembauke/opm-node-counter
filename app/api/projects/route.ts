import { getAllProjectTagChanges } from "@/actions/get-all-project-tag-changes";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const projects = await getAllProjectTagChanges();
  return NextResponse.json(projects);
}
