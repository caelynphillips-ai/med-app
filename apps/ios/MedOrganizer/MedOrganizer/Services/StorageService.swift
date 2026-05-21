import FirebaseStorage
import Foundation

final class StorageService {
    private let storage = Storage.storage()

    func uploadAttachment(
        data: Data,
        fileName: String,
        contentType: String,
        userId: String,
        medicationId: String
    ) async throws -> MedicationAttachment {
        let safeName = fileName.replacingOccurrences(of: "[^a-zA-Z0-9._-]", with: "_", options: .regularExpression)
        let path = "users/\(userId)/medications/\(medicationId)/\(Int(Date().timeIntervalSince1970 * 1000))-\(safeName)"
        let reference = storage.reference(withPath: path)
        let metadata = StorageMetadata()
        metadata.contentType = contentType

        _ = try await putData(data, metadata: metadata, reference: reference)
        let url = try await downloadURL(reference: reference)

        return MedicationAttachment(
            name: fileName,
            path: path,
            url: url.absoluteString,
            contentType: contentType,
            uploadedAt: ISO8601DateFormatter().string(from: Date())
        )
    }

    private func putData(_ data: Data, metadata: StorageMetadata, reference: StorageReference) async throws -> StorageMetadata {
        try await withCheckedThrowingContinuation { continuation in
            reference.putData(data, metadata: metadata) { metadata, error in
                if let error {
                    continuation.resume(throwing: error)
                } else if let metadata {
                    continuation.resume(returning: metadata)
                } else {
                    continuation.resume(throwing: StorageFlowError.uploadFailed)
                }
            }
        }
    }

    private func downloadURL(reference: StorageReference) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            reference.downloadURL { url, error in
                if let error {
                    continuation.resume(throwing: error)
                } else if let url {
                    continuation.resume(returning: url)
                } else {
                    continuation.resume(throwing: StorageFlowError.missingDownloadURL)
                }
            }
        }
    }
}

enum StorageFlowError: LocalizedError {
    case uploadFailed
    case missingDownloadURL

    var errorDescription: String? {
        switch self {
        case .uploadFailed:
            return "The attachment could not be uploaded."
        case .missingDownloadURL:
            return "The attachment uploaded, but no download URL was returned."
        }
    }
}
