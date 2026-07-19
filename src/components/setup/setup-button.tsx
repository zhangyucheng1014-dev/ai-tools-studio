"use client";

import { useState } from "react";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/base";
import { SetupWizard } from "./setup-wizard";

export function SetupButton() {
  const [showSetup, setShowSetup] = useState(false);

  return (
    <>
      <div className="mt-6">
        <Button onClick={() => setShowSetup(!showSetup)} variant={showSetup ? "primary" : "secondary"}>
          <Wrench size={14} />
          {showSetup ? "收起设置" : "检测 & 安装外部引擎"}
        </Button>
      </div>
      {showSetup && (
        <section className="mb-10">
          <SetupWizard onComplete={() => setShowSetup(false)} />
        </section>
      )}
    </>
  );
}
