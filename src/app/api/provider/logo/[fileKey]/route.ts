import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileKey: string }> },
) {
  const { fileKey } = await params;

  if (!/^[a-zA-Z0-9._-]+$/.test(fileKey)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = join(
    process.cwd(),
    "storage",
    "uploads",
    "provider-logos",
    fileKey,
  );

  if (!existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = await readFile(filePath);
  const ext = fileKey.split(".").pop()?.toLowerCase();
  const contentType =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : "application/octet-stream";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
