import QtQuick 6.5

QtObject {
    id: theme

    // Backgrounds
    readonly property color bgPrimary: "#0b0f17"
    readonly property color bgSecondary: "#121824"
    readonly property color bgTertiary: "#1a2234"
    readonly property color bgCard: "#151d2d"
    readonly property color bgInput: "#0d131f"
    readonly property color bgHover: "#1e293b"

    // Borders
    readonly property color borderMain: "#243048"
    readonly property color borderSubtle: "#1c2638"
    readonly property color borderFocus: "#38bdf8"
    readonly property color borderHover: "#3b82f6"

    // Accents
    readonly property color accentCyan: "#06b6d4"
    readonly property color accentBlue: "#3b82f6"
    readonly property color accentIndigo: "#6366f1"
    readonly property color accentPurple: "#a855f7"
    readonly property color accentPink: "#ec4899"
    readonly property color accentRed: "#ef4444"
    readonly property color accentEmerald: "#10b981"
    readonly property color accentGreen: "#10b981"
    readonly property color accentAmber: "#f59e0b"

    // Text
    readonly property color textMain: "#f1f5f9"
    readonly property color textMuted: "#94a3b8"
    readonly property color textDim: "#64748b"

    // Typography
    readonly property string fontFamily: "system-ui, -apple-system, sans-serif"
    readonly property int fontSizeSm: 11
    readonly property int fontSizeNormal: 13
    readonly property int fontSizeMd: 14
    readonly property int fontSizeLg: 16
    readonly property int fontSizeXl: 18

    // Radii
    readonly property real radiusSm: 6
    readonly property real radiusMd: 10
    readonly property real radiusLg: 14

    // Color Utility Functions
    function withAlpha(col, a) {
        return Qt.rgba(col.r, col.g, col.b, a)
    }

    function rgba(r, g, b, a) {
        return Qt.rgba(r / 255.0, g / 255.0, b / 255.0, a)
    }
}
