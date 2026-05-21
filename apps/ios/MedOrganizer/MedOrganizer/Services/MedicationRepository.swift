import FirebaseFirestore
import Foundation

final class MedicationRepository {
    private let db = Firestore.firestore()
    private let client = "ios"

    func newMedicationId(userId: String) -> String {
        db.collection("users").document(userId).collection("medications").document().documentID
    }

    func observeMedications(userId: String, onChange: @escaping (Result<[Medication], Error>) -> Void) -> ListenerRegistration {
        db.collection("users")
            .document(userId)
            .collection("medications")
            .order(by: "createdAt", descending: false)
            .addSnapshotListener { snapshot, error in
                if let error {
                    onChange(.failure(error))
                    return
                }

                let medications = snapshot?.documents.compactMap { document in
                    Medication(id: document.documentID, data: document.data())
                } ?? []
                onChange(.success(medications))
            }
    }

    func observeDoseStatus(
        userId: String,
        dateKey: String,
        onChange: @escaping (Result<[String: DoseStatusEntry], Error>) -> Void
    ) -> ListenerRegistration {
        db.collection("users")
            .document(userId)
            .collection("doseStatus")
            .document(dateKey)
            .addSnapshotListener { snapshot, error in
                if let error {
                    onChange(.failure(error))
                    return
                }

                let rawStatuses = snapshot?.data()?["statuses"] as? [String: [String: Any]] ?? [:]
                let statuses = rawStatuses.compactMapValues(DoseStatusEntry.init(data:))
                onChange(.success(statuses))
            }
    }

    func saveMedication(_ medication: Medication, userId: String, isNew: Bool) async throws {
        guard let id = medication.id else { return }
        var data = medication.firestoreData(userId: userId, client: client)
        if isNew {
            data["createdAt"] = FieldValue.serverTimestamp()
        }

        try await setData(
            data,
            at: db.collection("users").document(userId).collection("medications").document(id)
        )
    }

    func deleteMedication(id: String, userId: String) async throws {
        try await deleteDocument(
            db.collection("users").document(userId).collection("medications").document(id)
        )
    }

    func updateDoseStatus(userId: String, dateKey: String, doseKey: String, status: PersistedDoseStatus) async throws {
        let reference = db.collection("users").document(userId).collection("doseStatus").document(dateKey)
        let payload: [String: Any] = [
            "statuses.\(doseKey)": [
                "status": status.rawValue,
                "updatedAt": ISO8601DateFormatter().string(from: Date()),
                "updatedBy": userId,
                "updatedFrom": client
            ],
            "updatedAt": FieldValue.serverTimestamp(),
            "updatedBy": userId,
            "updatedFrom": client
        ]

        try await setData(payload, at: reference, merge: true)
    }

    private func setData(_ data: [String: Any], at reference: DocumentReference, merge: Bool = true) async throws {
        try await withCheckedThrowingContinuation { continuation in
            reference.setData(data, merge: merge) { error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
    }

    private func deleteDocument(_ reference: DocumentReference) async throws {
        try await withCheckedThrowingContinuation { continuation in
            reference.delete { error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
    }
}
