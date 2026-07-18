import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/layout/shell";
import { ModelLoader } from "@/components/ui/model-loader";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: site.name, template: `%s | ${site.name}` },
  description: site.description
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="pt-8 pb-12">
        {children}
        <ModelLoader />
        <Footer />
      </body>
    </html>
  );
}
