"use client";

import { useCallback, useState, useTransition } from "react";
import { AlgorithmCategoryPanel } from "@/components/admin/algorithm/AlgorithmCategoryPanel";
import { loadAlgorithmSettingsPageData } from "@/lib/admin/algorithm-settings-data";
import type { AlgorithmControlCenterData } from "@/types/algorithm-settings";

type AdminFairnessSettingsSectionProps = {
  initialData: AlgorithmControlCenterData;
};

export function AdminFairnessSettingsSection({
  initialData
}: AdminFairnessSettingsSectionProps) {
  const [data, setData] = useState(initialData);
  const [, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const next = await loadAlgorithmSettingsPageData();
      setData(next);
    });
  }, []);

  return (
    <AlgorithmCategoryPanel
      canUpdate={data.canUpdate}
      categories={["fairness"]}
      onRefresh={refresh}
      settings={data.settings}
      weightValidations={data.weightValidations}
    />
  );
}
