import QtQuick 6.5

pragma Singleton

QtObject {
    readonly property color bgDark: "#090d16"
    readonly property color bgSurface: "#111827"
    readonly property color bgCard: "#1e293b"
    readonly property color bgCardHover: "#283548"
    readonly property color bgInput: "#0f172a"
    readonly property color border: "#334155"
    readonly property color borderActive: "#6366f1"
    
    readonly property color primary: "#8b5cf6"
    readonly property color primaryHover: "#a78bfa"
    readonly property color primaryDark: "#6d28d9"
    readonly property color secondary: "#ec4899"
    readonly property color accent: "#06b6d4"
    readonly property color success: "#10b981"
    readonly property color warning: "#f59e0b"
    readonly property color danger: "#ef4444"

    readonly property color textMain: "#f8fafc"
    readonly property color textMuted: "#94a3b8"
    readonly property color textDim: "#64748b"

    readonly property int radiusSm: 6
    readonly property int radiusMd: 10
    readonly property int radiusLg: 14
}
