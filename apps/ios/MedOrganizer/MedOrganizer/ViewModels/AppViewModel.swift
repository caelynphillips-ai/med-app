import FirebaseFirestore
import Foundation

@MainActor
final class AppViewModel: ObservableObject {
    @Published private(set) var medications: [Medication] = []
    @Published private(set) var statuses: [String: DoseStatusEntry] = [:]
    @Published var isLoading = false
    @Published var appError: String?

    let suggestions = MedicationSuggestionService()

    private let repository = MedicationRepository()
    private let storage = StorageService()
    private var medicationListener: ListenerRegistration?
    private var statusListener: ListenerRegistration?
    private var currentUserId: String?

    deinit {
        medicationListener?.remove()
        statusListener?.remove()
    }

    func bind(userId: String?) {
        guard currentUserId != userId else { return }

        medicationListener?.remove()
        statusListener?.remove()
        currentUserId = userId
        medications = []
        statuses = [:]

        guard let userId else {
            isLoading = false
            return
        }

        isLoading = true
        medicationListener = repository.observeMedications(userId: userId) { [weak self] result in
            Task { @MainActor in
                self?.isLoading = false
                switch result {
                case .success(let medications):
                    self?.medications = medications
                case .failure(let error):
                    self?.appError = error.localizedDescription
                }
            }
        }

        statusListener = repository.observeDoseStatus(userId: userId, dateKey: DateHelpers.todayKey()) { [weak self] result in
            Task { @MainActor in
                switch result {
                case .success(let statuses):
                    self?.statuses = statuses
                case .failure(let error):
                    self?.appError = error.localizedDescription
                }
            }
        }
    }

    func todayDoses() -> [TodayDose] {
        medications.flatMap { medication in
            medication.schedule.map { slot in
                let key = doseKey(medicationId: medication.id ?? "", slotId: slot.id)
                let savedStatus = statuses[key]?.status.rawValue
                let autoMissed = savedStatus == nil && DateHelpers.minutes(from: slot.time) + 30 < currentMinutes()

                return TodayDose(
                    key: key,
                    medication: medication,
                    slot: slot,
                    status: savedStatus ?? (autoMissed ? "auto-missed" : "due")
                )
            }
        }
        .sorted {
            if $0.sortMinutes != $1.sortMinutes {
                return $0.sortMinutes < $1.sortMinutes
            }
            return $0.medication.name.localizedCaseInsensitiveCompare($1.medication.name) == .orderedAscending
        }
    }

    func saveMedication(_ medication: Medication, attachmentData: Data?, attachmentFileName: String?) async {
        guard let userId = currentUserId else { return }

        do {
            appError = nil
            var next = medication
            let isNew = next.id == nil
            if next.id == nil {
                next.id = repository.newMedicationId(userId: userId)
            }

            try await repository.saveMedication(next, userId: userId, isNew: isNew)

            if let attachmentData, let attachmentFileName, let id = next.id {
                let attachment = try await storage.uploadAttachment(
                    data: attachmentData,
                    fileName: attachmentFileName,
                    contentType: "image/jpeg",
                    userId: userId,
                    medicationId: id
                )
                next.attachment = attachment
                try await repository.saveMedication(next, userId: userId, isNew: false)
            }
        } catch {
            appError = error.localizedDescription
        }
    }

    func deleteMedication(_ medication: Medication) async {
        guard let userId = currentUserId, let id = medication.id else { return }

        do {
            appError = nil
            try await repository.deleteMedication(id: id, userId: userId)
        } catch {
            appError = error.localizedDescription
        }
    }

    func markDose(_ dose: TodayDose, status: PersistedDoseStatus) async {
        guard let userId = currentUserId else { return }

        do {
            appError = nil
            try await repository.updateDoseStatus(
                userId: userId,
                dateKey: DateHelpers.todayKey(),
                doseKey: dose.key,
                status: status
            )
        } catch {
            appError = error.localizedDescription
        }
    }

    private func doseKey(medicationId: String, slotId: String) -> String {
        "\(medicationId)_\(slotId)"
    }

    private func currentMinutes() -> Int {
        let components = Calendar.current.dateComponents([.hour, .minute], from: Date())
        return (components.hour ?? 0) * 60 + (components.minute ?? 0)
    }
}
