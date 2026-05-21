import SwiftUI

enum AppTheme {
    static let primary = Color(hex: 0x7A9D8E)
    static let secondary = Color(hex: 0x5F7D73)
    static let background = Color(hex: 0xEAF7F6)
    static let card = Color(hex: 0x6CA692)
    static let accent = Color(hex: 0xC9A66B)
    static let alert = Color(hex: 0xC97B63)
    static let text = Color(hex: 0x3F463F)
    static let pale = Color(hex: 0xCCF0ED)
}

extension Color {
    init(hex: UInt, alpha: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0,
            opacity: alpha
        )
    }
}
