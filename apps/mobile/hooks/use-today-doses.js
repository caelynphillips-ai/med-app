import { useMemo, useState } from "react";
import { buildTodayDoses } from "../../../shared/doseStatus.js";
import { currentMinutes } from "../../../shared/dateTime.js";

export function useTodayDoses({ medications = [], statuses, onMarkDose } = {}) {
  const [localStatuses, setLocalStatuses] = useState({});
  const sourceMedications = medications;
  const sourceStatuses = statuses || localStatuses;

  const doses = useMemo(() => buildTodayDoses(sourceMedications, sourceStatuses, currentMinutes()), [sourceMedications, sourceStatuses]);

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
    if (onMarkDose) {
      void onMarkDose(doseKey, status);
      return;
    }
    setLocalStatuses((current) => ({
      ...current,
      [doseKey]: {
        status,
        updatedAt: new Date().toISOString(),
        updatedFrom: "ios",
      },
    }));
  }

  return {
    doses,
    medications: sourceMedications,
    summary,
    markDose,
  };
}
