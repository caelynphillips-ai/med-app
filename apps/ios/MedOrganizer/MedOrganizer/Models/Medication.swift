import FirebaseFirestore
import Foundation

enum MedicationCategory: String, CaseIterable, Codable, Identifiable {
    case prescription = "prescription"
    case overTheCounter = "over-the-counter"
    case vitamin
    case supplement

    var id: String { rawValue }

    var label: String {
        switch self {
        case .prescription: return "Prescription"
        case .overTheCounter: return "Over-the-counter"
        case .vitamin: return "Vitamin"
        case .supplement: return "Supplement"
        }
    }
}

enum IntakeInstruction: String, CaseIterable, Codable, Identifiable {
    case food
    case water
    case empty

    var id: String { rawValue }

    var label: String {
        switch self {
        case .food: return "Take with food"
        case .water: return "Take with water"
        case .empty: return "Take on an empty stomach"
        }
    }
}

struct MedicationScheduleSlot: Identifiable, Codable, Equatable {
    var id: String
    var label: String
    var time: String
}

struct MedicationReminder: Codable, Equatable {
    var enabled: Bool
    var leadMinutes: Int
}

struct MedicationAttachment: Codable, Equatable {
    var name: String
    var path: String
    var url: String
    var contentType: String
    var uploadedAt: String
}

struct Medication: Identifiable, Codable, Equatable {
    var id: String?
    var schemaVersion: Int
    var ownerId: String
    var name: String
    var genericName: String?
    var category: MedicationCategory
    var purpose: String
    var dosage: String
    var timesPerDay: Int
    var schedule: [MedicationScheduleSlot]
    var intake: IntakeInstruction
    var foodInstructions: String
    var notes: String
    var reminder: MedicationReminder
    var attachment: MedicationAttachment?

    static func empty(ownerId: String = "") -> Medication {
        Medication(
            id: nil,
            schemaVersion: 1,
            ownerId: ownerId,
            name: "",
            genericName: nil,
            category: .prescription,
            purpose: "",
            dosage: "",
            timesPerDay: 1,
            schedule: [MedicationScheduleSlot(id: "morning", label: "Morning", time: "08:00")],
            intake: .water,
            foodInstructions: "",
            notes: "",
            reminder: MedicationReminder(enabled: false, leadMinutes: 15),
            attachment: nil
        )
    }

    init(
        id: String?,
        schemaVersion: Int,
        ownerId: String,
        name: String,
        genericName: String?,
        category: MedicationCategory,
        purpose: String,
        dosage: String,
        timesPerDay: Int,
        schedule: [MedicationScheduleSlot],
        intake: IntakeInstruction,
        foodInstructions: String,
        notes: String,
        reminder: MedicationReminder,
        attachment: MedicationAttachment?
    ) {
        self.id = id
        self.schemaVersion = schemaVersion
        self.ownerId = ownerId
        self.name = name
        self.genericName = genericName
        self.category = category
        self.purpose = purpose
        self.dosage = dosage
        self.timesPerDay = timesPerDay
        self.schedule = schedule
        self.intake = intake
        self.foodInstructions = foodInstructions
        self.notes = notes
        self.reminder = reminder
        self.attachment = attachment
    }

    init?(id: String, data: [String: Any]) {
        guard
            let name = data["name"] as? String,
            let purpose = data["purpose"] as? String,
            let dosage = data["dosage"] as? String
        else {
            return nil
        }

        let categoryValue = data["category"] as? String ?? MedicationCategory.prescription.rawValue
        let intakeValue = data["intake"] as? String ?? IntakeInstruction.water.rawValue
        let scheduleData = data["schedule"] as? [[String: Any]] ?? []
        let reminderData = data["reminder"] as? [String: Any] ?? [:]
        let attachmentData = data["attachment"] as? [String: Any]

        self.id = id
        self.schemaVersion = data["schemaVersion"] as? Int ?? 1
        self.ownerId = data["ownerId"] as? String ?? ""
        self.name = name
        self.genericName = data["genericName"] as? String
        self.category = MedicationCategory(rawValue: categoryValue) ?? .prescription
        self.purpose = purpose
        self.dosage = dosage
        self.timesPerDay = data["timesPerDay"] as? Int ?? 1
        self.schedule = scheduleData.compactMap { item in
            guard let id = item["id"] as? String else { return nil }
            return MedicationScheduleSlot(
                id: id,
                label: item["label"] as? String ?? id.capitalized,
                time: item["time"] as? String ?? "08:00"
            )
        }
        if self.schedule.isEmpty {
            self.schedule = [MedicationScheduleSlot(id: "morning", label: "Morning", time: "08:00")]
        }
        self.intake = IntakeInstruction(rawValue: intakeValue) ?? .water
        self.foodInstructions = data["foodInstructions"] as? String ?? ""
        self.notes = data["notes"] as? String ?? ""
        self.reminder = MedicationReminder(
            enabled: reminderData["enabled"] as? Bool ?? false,
            leadMinutes: reminderData["leadMinutes"] as? Int ?? 15
        )
        self.attachment = attachmentData.flatMap { item in
            guard
                let name = item["name"] as? String,
                let path = item["path"] as? String,
                let url = item["url"] as? String
            else {
                return nil
            }
            return MedicationAttachment(
                name: name,
                path: path,
                url: url,
                contentType: item["contentType"] as? String ?? "application/octet-stream",
                uploadedAt: item["uploadedAt"] as? String ?? ISO8601DateFormatter().string(from: Date())
            )
        }
    }

    func firestoreData(userId: String, client: String) -> [String: Any] {
        var data: [String: Any] = [
            "schemaVersion": 1,
            "ownerId": userId,
            "name": name.trimmingCharacters(in: .whitespacesAndNewlines),
            "genericName": genericName ?? "",
            "category": category.rawValue,
            "purpose": purpose.trimmingCharacters(in: .whitespacesAndNewlines),
            "dosage": dosage.trimmingCharacters(in: .whitespacesAndNewlines),
            "timesPerDay": max(1, timesPerDay),
            "schedule": schedule.map { ["id": $0.id, "label": $0.label, "time": $0.time] },
            "intake": intake.rawValue,
            "foodInstructions": foodInstructions.trimmingCharacters(in: .whitespacesAndNewlines),
            "notes": notes.trimmingCharacters(in: .whitespacesAndNewlines),
            "reminder": ["enabled": reminder.enabled, "leadMinutes": reminder.leadMinutes],
            "updatedAt": FieldValue.serverTimestamp(),
            "updatedBy": userId,
            "updatedFrom": client
        ]

        if let attachment {
            data["attachment"] = [
                "name": attachment.name,
                "path": attachment.path,
                "url": attachment.url,
                "contentType": attachment.contentType,
                "uploadedAt": attachment.uploadedAt
            ]
        } else {
            data["attachment"] = NSNull()
        }

        return data
    }
}
