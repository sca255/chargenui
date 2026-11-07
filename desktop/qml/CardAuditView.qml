import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

ScrollView {
    id: root
    clip: true

    Theme { id: theme }

    property var auditData: null
    signal prescribeToDoctorRequested(string instruction)

    Component.onCompleted: {
        refresh()
    }

    function refresh() {
        bridge.runCardAudit()
    }

    Connections {
        target: bridge
        function onCardAuditFinished(data) {
            root.auditData = data
        }
    }

    ColumnLayout {
        width: root.width - 20
        spacing: 12

        // Header Title
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Text { text: "📊"; font.pixelSize: 16 }

            ColumnLayout {
                spacing: 1
                Text {
                    text: "Card Health & Psychometric Audit"
                    color: theme.accentCyan
                    font.pixelSize: 13
                    font.bold: true
                }
                Text {
                    text: "Psychometric scorecard, 6-axis radar, and token density for '" + (bridge.card.name || "Character") + "'"
                    color: theme.textMuted
                    font.pixelSize: 10
                    elide: Text.ElideRight
                    Layout.maximumWidth: root.width - 40
                }
            }
        }

        // Top Grade & Summary Banner
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: topBannerLayout.implicitHeight + 14
            radius: theme.radiusSm
            color: theme.bgCard
            border.color: theme.borderMain

            RowLayout {
                id: topBannerLayout
                anchors.fill: parent
                anchors.margins: 10
                spacing: 12

                // Letter Grade Badge
                Rectangle {
                    width: 48
                    height: 48
                    radius: 24
                    color: {
                        var g = (root.auditData && root.auditData.grade) || "B"
                        if (g === "S") return theme.withAlpha(theme.accentEmerald, 0.25)
                        if (g === "A") return theme.withAlpha(theme.accentCyan, 0.25)
                        if (g === "B") return theme.withAlpha(theme.accentPurple, 0.25)
                        if (g === "C") return theme.withAlpha(theme.accentAmber, 0.25)
                        return theme.withAlpha(theme.accentRed, 0.25)
                    }
                    border.color: {
                        var g = (root.auditData && root.auditData.grade) || "B"
                        if (g === "S") return theme.accentEmerald
                        if (g === "A") return theme.accentCyan
                        if (g === "B") return theme.accentPurple
                        if (g === "C") return theme.accentAmber
                        return theme.accentRed
                    }
                    border.width: 2

                    Text {
                        anchors.centerIn: parent
                        text: (root.auditData && root.auditData.grade) || "—"
                        color: "#ffffff"
                        font.pixelSize: 20
                        font.bold: true
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2

                    RowLayout {
                        spacing: 8
                        Text {
                            text: "Score: " + ((root.auditData && root.auditData.score) || 0) + " / 100"
                            color: theme.accentCyan
                            font.pixelSize: 12
                            font.bold: true
                        }
                        Text {
                            text: "• " + ((root.auditData && root.auditData.tokenCount) || 0) + " tokens"
                            color: theme.textMuted
                            font.pixelSize: 10
                        }
                    }

                    Text {
                        Layout.fillWidth: true
                        text: (root.auditData && root.auditData.summary) || (bridge.isBusy ? "Running psychometric evaluation..." : "Card audit ready.")
                        color: theme.textMuted
                        font.pixelSize: 10
                        wrapMode: Text.Wrap
                    }
                }

                Button {
                    text: "🔄"
                    enabled: !bridge.isBusy
                    implicitWidth: 32
                    implicitHeight: 32
                    onClicked: bridge.runCardAudit()
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: parent.hovered ? theme.bgHover : theme.bgTertiary
                        border.color: theme.borderMain
                    }
                    contentItem: Text {
                        text: parent.text
                        color: theme.textMain
                        font.pixelSize: 12
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }
        }

        // 6-Axis Psychometric Radar Health
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: radarLayout.implicitHeight + 14
            radius: theme.radiusSm
            color: theme.bgCard
            border.color: theme.borderMain

            ColumnLayout {
                id: radarLayout
                anchors.fill: parent
                anchors.margins: 10
                spacing: 6

                Text {
                    text: "🎯 6-Axis Psychometric Architecture"
                    color: theme.accentPurple
                    font.pixelSize: 11
                    font.bold: true
                }

                // Axis 1: Idiolect
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    RowLayout {
                        Text { text: "Idiolect & Vocal Cadence"; color: theme.textMain; font.pixelSize: 10 }
                        Item { Layout.fillWidth: true }
                        Text { text: ((root.auditData && root.auditData.radarScores && root.auditData.radarScores.idiolect) || 0) + "%"; color: theme.accentCyan; font.pixelSize: 10; font.bold: true }
                    }
                    Rectangle {
                        Layout.fillWidth: true; height: 5; radius: 2.5; color: theme.bgInput
                        Rectangle {
                            width: parent.width * (((root.auditData && root.auditData.radarScores && root.auditData.radarScores.idiolect) || 0) / 100)
                            height: parent.height; radius: 2.5; color: theme.accentCyan
                        }
                    }
                }

                // Axis 2: Boundary Sharpness
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    RowLayout {
                        Text { text: "Boundary Sharpness & Gradient"; color: theme.textMain; font.pixelSize: 10 }
                        Item { Layout.fillWidth: true }
                        Text { text: ((root.auditData && root.auditData.radarScores && root.auditData.radarScores.boundaries) || 0) + "%"; color: theme.accentPink; font.pixelSize: 10; font.bold: true }
                    }
                    Rectangle {
                        Layout.fillWidth: true; height: 5; radius: 2.5; color: theme.bgInput
                        Rectangle {
                            width: parent.width * (((root.auditData && root.auditData.radarScores && root.auditData.radarScores.boundaries) || 0) / 100)
                            height: parent.height; radius: 2.5; color: theme.accentPink
                        }
                    }
                }

                // Axis 3: Sensory Immersion
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    RowLayout {
                        Text { text: "Sensory Physical Immersion"; color: theme.textMain; font.pixelSize: 10 }
                        Item { Layout.fillWidth: true }
                        Text { text: ((root.auditData && root.auditData.radarScores && root.auditData.radarScores.sensory) || 0) + "%"; color: theme.accentAmber; font.pixelSize: 10; font.bold: true }
                    }
                    Rectangle {
                        Layout.fillWidth: true; height: 5; radius: 2.5; color: theme.bgInput
                        Rectangle {
                            width: parent.width * (((root.auditData && root.auditData.radarScores && root.auditData.radarScores.sensory) || 0) / 100)
                            height: parent.height; radius: 2.5; color: theme.accentAmber
                        }
                    }
                }

                // Axis 4: Playability & Turn-0
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    RowLayout {
                        Text { text: "Playability & Turn-0 Hook"; color: theme.textMain; font.pixelSize: 10 }
                        Item { Layout.fillWidth: true }
                        Text { text: ((root.auditData && root.auditData.radarScores && root.auditData.radarScores.playability) || 0) + "%"; color: theme.accentEmerald; font.pixelSize: 10; font.bold: true }
                    }
                    Rectangle {
                        Layout.fillWidth: true; height: 5; radius: 2.5; color: theme.bgInput
                        Rectangle {
                            width: parent.width * (((root.auditData && root.auditData.radarScores && root.auditData.radarScores.playability) || 0) / 100)
                            height: parent.height; radius: 2.5; color: theme.accentEmerald
                        }
                    }
                }

                // Axis 5: Anti-Purple Prose
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    RowLayout {
                        Text { text: "Anti-Purple Prose Cleanliness"; color: theme.textMain; font.pixelSize: 10 }
                        Item { Layout.fillWidth: true }
                        Text { text: ((root.auditData && root.auditData.radarScores && root.auditData.radarScores.antiPurpleProse) || 0) + "%"; color: theme.accentIndigo; font.pixelSize: 10; font.bold: true }
                    }
                    Rectangle {
                        Layout.fillWidth: true; height: 5; radius: 2.5; color: theme.bgInput
                        Rectangle {
                            width: parent.width * (((root.auditData && root.auditData.radarScores && root.auditData.radarScores.antiPurpleProse) || 0) / 100)
                            height: parent.height; radius: 2.5; color: theme.accentIndigo
                        }
                    }
                }

                // Axis 6: Token Density
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    RowLayout {
                        Text { text: "Token Density & Balance"; color: theme.textMain; font.pixelSize: 10 }
                        Item { Layout.fillWidth: true }
                        Text { text: ((root.auditData && root.auditData.radarScores && root.auditData.radarScores.tokenDensity) || 0) + "%"; color: theme.accentBlue; font.pixelSize: 10; font.bold: true }
                    }
                    Rectangle {
                        Layout.fillWidth: true; height: 5; radius: 2.5; color: theme.bgInput
                        Rectangle {
                            width: parent.width * (((root.auditData && root.auditData.radarScores && root.auditData.radarScores.tokenDensity) || 0) / 100)
                            height: parent.height; radius: 2.5; color: theme.accentBlue
                        }
                    }
                }
            }
        }

        // Action: Prescribe Fixes to Doctor
        Button {
            Layout.fillWidth: true
            implicitHeight: 34
            text: "🩺 Prescribe Fixes to Agent Doctor"
            onClicked: {
                var prompt = "Here are the health audit findings for this card:\n"
                if (root.auditData && root.auditData.weaknesses) {
                    for (var i = 0; i < root.auditData.weaknesses.length; i++) {
                        var w = root.auditData.weaknesses[i]
                        prompt += "- " + w.issue + " -> Recommendation: " + w.recommendation + "\n"
                    }
                }
                prompt += "\nPlease surgically resolve these issues while preserving character voice."
                root.prescribeToDoctorRequested(prompt)
            }
            background: Rectangle {
                radius: theme.radiusSm
                color: theme.withAlpha(theme.accentEmerald, 0.25)
                border.color: theme.accentEmerald
            }
            contentItem: Text {
                text: parent.text
                color: "#6ee7b7"
                font.pixelSize: 11
                font.bold: true
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
        }

        // Diagnostic Findings List
        Text {
            text: "⚠️ Diagnostic Findings (" + ((root.auditData && root.auditData.weaknesses && root.auditData.weaknesses.length) || 0) + ")"
            color: theme.accentAmber
            font.pixelSize: 11
            font.bold: true
        }

        Repeater {
            model: (root.auditData && root.auditData.weaknesses) || []
            delegate: Rectangle {
                id: wCard
                required property var modelData
                Layout.fillWidth: true
                implicitHeight: wLayout.implicitHeight + 12
                radius: theme.radiusSm
                color: theme.withAlpha(theme.accentAmber, 0.08)
                border.color: theme.withAlpha(theme.accentAmber, 0.3)

                ColumnLayout {
                    id: wLayout
                    anchors.fill: parent
                    anchors.margins: 8
                    spacing: 2

                    RowLayout {
                        spacing: 4
                        Text {
                            text: "⚠️ [" + (wCard.modelData.area || "general").toUpperCase() + "]"
                            color: theme.accentAmber
                            font.pixelSize: 9
                            font.bold: true
                        }
                        Text {
                            Layout.fillWidth: true
                            text: wCard.modelData.issue
                            color: theme.textMain
                            font.pixelSize: 10
                            font.bold: true
                            wrapMode: Text.Wrap
                        }
                    }

                    Text {
                        Layout.fillWidth: true
                        text: "→ " + wCard.modelData.recommendation
                        color: "#fde68a"
                        font.pixelSize: 9
                        wrapMode: Text.Wrap
                    }
                }
            }
        }

        // Strengths
        Text {
            text: "✓ Architected Strengths (" + ((root.auditData && root.auditData.strengths && root.auditData.strengths.length) || 0) + ")"
            color: theme.accentEmerald
            font.pixelSize: 11
            font.bold: true
        }

        Repeater {
            model: (root.auditData && root.auditData.strengths) || []
            delegate: Rectangle {
                required property string modelData
                Layout.fillWidth: true
                implicitHeight: 24
                radius: theme.radiusSm
                color: theme.withAlpha(theme.accentEmerald, 0.08)
                border.color: theme.withAlpha(theme.accentEmerald, 0.25)

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 8
                    anchors.rightMargin: 8
                    spacing: 6
                    Text { text: "✓"; color: theme.accentEmerald; font.pixelSize: 10; font.bold: true }
                    Text { text: modelData; color: "#a7f3d0"; font.pixelSize: 10; Layout.fillWidth: true; elide: Text.ElideRight }
                }
            }
        }
    }
}
