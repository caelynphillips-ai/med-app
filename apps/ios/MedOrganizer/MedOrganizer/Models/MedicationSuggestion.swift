import Foundation

struct MedicationSuggestion: Codable, Identifiable, Equatable {
    var id: String { name }
    var name: String
    var genericName: String?
    var brandNames: [String]
    var category: String
    var rxTermsName: String?
    var strengthsAndForms: [String]
    var commonUses: [String]
    var foodInstructions: String
    var source: String
    var lastUpdated: String

    var normalizedCategory: MedicationCategory {
        let lowered = category.lowercased()
        if lowered.contains("over") || lowered.contains("otc") {
            return .overTheCounter
        }
        if lowered.contains("vitamin") {
            return .vitamin
        }
        if lowered.contains("supplement") {
            return .supplement
        }
        return .prescription
    }
}
