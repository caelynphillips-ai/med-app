import { useMemo, useState } from "react";
import { sampleMedications } from "../../../src/data/sampleMedications.js";
import { buildTodayDoses } from "../../../shared/doseStatus.js";
import { currentMinutes } from "../../../shared/dateTime.js";

const sampleMobileMedications = sampleMedications.map((medication, index) => ({
  ...medication,
  id: `sample-${index + 1}`,
}));

export function useTodayDoses() {
  const [statuses, setStatuses] = useState({});

  const doses = useMemo(() => buildTodayDoses(sampleMobileMedications, statuses, currentMinutes()), [statuses]);

  const summary = useMemo(() => {
    const markedTaken = doses.filter((dose) => dose.status === "taken").length;
    const nextDose = doses.find((dose) => dose.status === "due");
    return {
      totalDoses: doses.length,
      markedTaken,
      nextDose,
    };
  }, [doses]);

  function markDose(doseKey, status) {
    setStatuses((current) => ({
      ...current,
      [doseKey]: {
        status,
        updatedAt: new Date().toISOString(),
        updatedFrom: "mobile-local-preview",
      },
    }));
  }

  return {
    doses,
    medications: sampleMobileMedications,
    summary,
    markDose,
  };
}
