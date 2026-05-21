import Foundation

enum DateHelpers {
    static func todayKey(date: Date = Date()) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    static func minutes(from time: String) -> Int {
        let parts = time.split(separator: ":").compactMap { Int($0) }
        guard parts.count == 2 else { return 0 }
        return parts[0] * 60 + parts[1]
    }

    static func clockLabel(_ time: String) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "HH:mm"

        let output = DateFormatter()
        output.locale = Locale.current
        output.timeStyle = .short

        guard let date = formatter.date(from: time) else { return time }
        return output.string(from: date)
    }

    static func date(from time: String) -> Date {
        var components = Calendar.current.dateComponents([.year, .month, .day], from: Date())
        let parts = time.split(separator: ":").compactMap { Int($0) }
        components.hour = parts.first ?? 8
        components.minute = parts.dropFirst().first ?? 0
        return Calendar.current.date(from: components) ?? Date()
    }

    static func time(from date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: date)
    }
}
