import Foundation

final class MedicationSuggestionService {
    private(set) var suggestions: [MedicationSuggestion] = []

    init() {
        suggestions = Self.loadBundledSuggestions()
    }

    func search(_ query: String) -> [MedicationSuggestion] {
        let search = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !search.isEmpty else { return [] }

        return suggestions
            .filter { suggestion in
                searchText(for: suggestion).contains(search)
            }
            .sorted { lhs, rhs in
                let leftRank = rank(lhs, search: search)
                let rightRank = rank(rhs, search: search)
                if leftRank != rightRank { return leftRank < rightRank }
                return lhs.name.localizedCaseInsensitiveCompare(rhs.name) == .orderedAscending
            }
            .prefix(8)
            .map { $0 }
    }

    func findByName(_ name: String) -> MedicationSuggestion? {
        let search = name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return suggestions.first { $0.name.lowercased() == search }
    }

    private func searchText(for suggestion: MedicationSuggestion) -> String {
        ([suggestion.name, suggestion.genericName ?? ""] + suggestion.brandNames + suggestion.strengthsAndForms + suggestion.commonUses)
            .joined(separator: " ")
            .lowercased()
    }

    private func rank(_ suggestion: MedicationSuggestion, search: String) -> Int {
        let fields = ([suggestion.name, suggestion.genericName ?? ""] + suggestion.brandNames + suggestion.strengthsAndForms)
            .map { $0.lowercased() }

        if fields.contains(search) { return 0 }
        if fields.contains(where: { $0.hasPrefix(search) }) { return 1 }
        if fields.contains(where: { $0.contains(search) }) { return 2 }
        return 3
    }

    private static func loadBundledSuggestions() -> [MedicationSuggestion] {
        guard
            let url = Bundle.main.url(forResource: "medications", withExtension: "json"),
            let data = try? Data(contentsOf: url)
        else {
            return []
        }

        return (try? JSONDecoder().decode([MedicationSuggestion].self, from: data)) ?? []
    }
}
