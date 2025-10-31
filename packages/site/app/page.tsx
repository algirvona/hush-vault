"use client";

import { useTab } from "@/contexts/TabContext";
import { HushSave } from "@/components/HushSave";
import { Create } from "@/components/Create";

export default function Home() {
  const { activeTab } = useTab();

  return (
    <>
      {/* Tab Content */}
      {activeTab === "hushsave" && <HushSave />}
      {activeTab === "create" && <Create />}
    </>
  );
}
