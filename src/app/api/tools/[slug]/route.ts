import { NextResponse } from "next/server";
import { runTool } from "@/services/ai-provider";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    let prompt = "";
    let options: Record<string, string | number | boolean> = {};
    let fileData: string | undefined;
    let fileName: string | undefined;
    let fileType: string | undefined;

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      // File upload mode
      const fd = await request.formData();
      prompt = String(fd.get("prompt") ?? "");
      const file = fd.get("file") as File | null;

      if (file) {
        const bytes = await file.arrayBuffer();
        fileData = Buffer.from(bytes).toString("base64");
        fileName = file.name;
        fileType = file.type;
      }

      // Extract options from FormData
      for (const [key, val] of fd.entries()) {
        if (key !== "prompt" && key !== "file") {
          options[key] = String(val);
        }
      }
    } else {
      // JSON mode
      const body = await request.json().catch(() => ({}));
      prompt = String(body.prompt ?? "");
      options = body.options ?? {};
    }

    const result = await runTool(slug, {
      toolSlug: slug,
      prompt,
      options,
      fileData,
      fileName,
      fileType
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, output: error instanceof Error ? error.message : "运行失败", mock: true },
      { status: error instanceof Error && error.message.includes("不存在") ? 404 : 500 }
    );
  }
}
