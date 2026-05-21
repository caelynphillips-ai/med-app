import FirebaseFirestore
import Foundation

enum PersistedDoseStatus: String, CaseIterable, Identifiable {
    case taken
    case skipped
    case missed

    var id: String { rawValue }
    var label: String { rawValue.capitalized }
}

struct DoseStatusEntry: Equatable {
    var status: PersistedDoseStatus
    var updatedAt: String
    var updatedBy: String?
    var updatedFrom: String?

    init?(data: [String: Any]) {
        guard
            let statusValue = data["status"] as? String,
            let status = PersistedDoseStatus(rawValue: statusValue)
        else {
            return nil
        }

        self.status = status
        self.updatedAt = data["updatedAt"] as? String ?? ISO8601DateFormatter().string(from: Date())
        self.updatedBy = data["updatedBy"] as? String
        self.updatedFrom = data["updatedFrom"] as? String
    }
}

struct TodayDose: Identifiable, Equatable {
    var id: String { key }
    var key: String
    var medication: Medication
    var slot: MedicationScheduleSlot
    var status: String

    var sortMinutes: Int {
        DateHelpers.minutes(from: slot.time)
    }
}
