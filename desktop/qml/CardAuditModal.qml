import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Rectangle {
    id: root
    visible: false
    anchors.fill: parent
    color: Qt.rgba(0, 0, 0, 0.75)
    z: 200

    Theme { id: theme }

    property var auditData: null

    function openAudit() {
        root.visible = true
        bridge.runCardAudit()
    }

    Connections {
        target: bridge
        function onCardAuditFinished(data) {
            root.auditData = data
        }
    }

    // Modal Box
    Rectangle {
        width: Math.min(parent.width - 40, 860)
        height: Math.min(parent.height - 40, 700)
        anchors.centerIn: parent
        color: theme.bgSecondary
        radius: theme.radiusMd
        border.color: theme.borderMain
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 18
            spacing: 12

            // Header Bar
            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: "📊 Psychometric Health & Radar Audit"
                    color: theme.accentCyan
                    font.pixelSize: 15
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Button {
                    text: "✕"
                    onClicked: root.visible = false
                    background: Rectangle { color: "transparent" }
                    contentItem: Text { text: parent.text; color: theme.textMuted; font.pixelSize: 14 }
                }
            }

            // Top Grade & Summary Banner
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: topBannerLayout.implicitHeight + 16
                radius: theme.radiusSm
                color: theme.bgCard
                border.color: theme.borderMain

                RowLayout {
                    id: topBannerLayout
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 16

                    // Letter Grade Badge
                    Rectangle {
                        width: 56
                        height: 56
                        radius: 28
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
                            font.pixelSize: 24
                            font.bold: true
                        }
                    }

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 3

                        RowLayout {
                            spacing: 8
                            Text {
                                text: (bridge.card.name || "Character") + " Scorecard"
                                color: "#ffffff"
                                font.pixelSize: 13
                                font.bold: true
                            }
                            Text {
                                text: "Score: " + ((root.auditData && root.auditData.score) || 0) + " / 100"
                                color: theme.accentCyan
                                font.pixelSize: 12
                                font.bold: true
                            }
                            Text {
                                text: "• Tokens: " + ((root.auditData && root.auditData.tokenCount) || 0)
                                color: theme.textMuted
                                font.pixelSize: 11
                            }
                        }

                        Text {
                            Layout.fillWidth: true
                            text: (root.auditData && root.auditData.summary) || "Running psychometric evaluation..."
                            color: theme.textMuted
                            font.pixelSize: 11
                            wrapMode: Text.Wrap
                        }
                    }

                    Button {
                        text: "🔄 Re-Audit"
                        enabled: !bridge.isBusy
                        onClicked: bridge.runCardAudit()
                        background: Rectangle {
                            radius: theme.radiusSm
                            color: theme.bgTertiary
                            border.color: theme.borderMain
                        }
                        contentItem: Text {
                            text: parent.text
                            color: theme.textMain
                            font.pixelSize: 11
                            font.bold: true
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                    }
                }
            }

            // 6-Axis Psychometric Radar Metrics Bar Panel
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: radarLayout.implicitHeight + 16
                radius: theme.radiusSm
                color: theme.bgCard
                border.color: theme.borderMain

                ColumnLayout {
                    id: radarLayout
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 8

                    Text {
                        text: "🎯 6-Axis Psychometric Architecture Health"
                        color: theme.accentPurple
                        font.pixelSize: 11
                        font.bold: true
                    }

                    GridLayout {
                        Layout.fillWidth: true
                        columns: 2
                        columnSpacing: 16
                        rowSpacing: 8

                        // Axis 1: Idiolect & Cadence
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 2
                            RowLayout {
                                Text { text: "Idiolect & Vocal Rhythm"; color: theme.textMain; font.pixelSize: 11 }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: ((root.auditData && root.auditData.radarScores && root.auditData.radarScores.idiolect) || 0) + "%"
                                    color: theme.accentCyan; font.pixelSize: 10; font.bold: true
                                }
                            }
                            Rectangle {
                                Layout.fillWidth: true; height: 6; radius: 3; color: theme.bgInput
                                Rectangle {
                                    width: parent.width * (((root.auditData && root.auditData.radarScores && root.auditData.radarScores.idiolect) || 0) / 100)
                                    height: parent.height; radius: 3; color: theme.accentCyan
                                }
                            }
                        }

                        // Axis 2: Boundary Sharpness
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 2
                            RowLayout {
                                Text { text: "Boundary Sharpness & Gradient"; color: theme.textMain; font.pixelSize: 11 }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: ((root.auditData && root.auditData.radarScores && root.auditData.radarScores.boundaries) || 0) + "%"
                                    color: theme.accentPink; font.pixelSize: 10; font.bold: true
                                }
                            }
                            Rectangle {
                                Layout.fillWidth: true; height: 6; radius: 3; color: theme.bgInput
                                Rectangle {
                                    width: parent.width * (((root.auditData && root.auditData.radarScores && root.auditData.radarScores.boundaries) || 0) / 100)
                                    height: parent.height; radius: 3; color: theme.accentPink
                                }
                            }
                        }

                        // Axis 3: Sensory Immersion
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 2
                            RowLayout {
                                Text { text: "Sensory Physical Immersion"; color: theme.textMain; font.pixelSize: 11 }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: ((root.auditData && root.auditData.radarScores && root.auditData.radarScores.sensory) || 0) + "%"
                                    color: theme.accentAmber; font.pixelSize: 10; font.bold: true
                                }
                            }
                            Rectangle {
                                Layout.fillWidth: true; height: 6; radius: 3; color: theme.bgInput
                                Rectangle {
                                    width: parent.width * (((root.auditData && root.auditData.radarScores && root.auditData.radarScores.sensory) || 0) / 100)
                                    height: parent.height; radius: 3; color: theme.accentAmber
                                }
                            }
                        }

                        // Axis 4: Playability & Hook
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 2
                            RowLayout {
                                Text { text: "Playability & Turn-0 Hook"; color: theme.textMain; font.pixelSize: 11 }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: ((root.auditData && root.auditData.radarScores && root.auditData.radarScores.playability) || 0) + "%"
                                    color: theme.accentEmerald; font.pixelSize: 10; font.bold: true
                                }
                            }
                            Rectangle {
                                Layout.fillWidth: true; height: 6; radius: 3; color: theme.bgInput
                                Rectangle {
                                    width: parent.width * (((root.auditData && root.auditData.radarScores && root.auditData.radarScores.playability) || 0) / 100)
                                    height: parent.height; radius: 3; color: theme.accentEmerald
                                }
                            }
                        }

                        // Axis 5: Anti-Purple Prose
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 2
                            RowLayout {
                                Text { text: "Anti-Purple Prose Cleanliness"; color: theme.textMain; font.pixelSize: 11 }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: ((root.auditData && root.auditData.radarScores && root.auditData.radarScores.antiPurpleProse) || 0) + "%"
                                    color: theme.accentIndigo; font.pixelSize: 10; font.bold: true
                                }
                            }
                            Rectangle {
                                Layout.fillWidth: true; height: 6; radius: 3; color: theme.bgInput
                                Rectangle {
                                    width: parent.width * (((root.auditData && root.auditData.radarScores && root.auditData.radarScores.antiPurpleProse) || 0) / 100)
                                    height: parent.height; radius: 3; color: theme.accentIndigo
                                }
                            }
                        }

                        // Axis 6: Token Density
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 2
                            RowLayout {
                                Text { text: "Token Density & Balance"; color: theme.textMain; font.pixelSize: 11 }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: ((root.auditData && root.auditData.radarScores && root.auditData.radarScores.tokenDensity) || 0) + "%"
                                    color: theme.accentBlue; font.pixelSize: 10; font.bold: true
                                }
                            }
                            Rectangle {
                                Layout.fillWidth: true; height: 6; radius: 3; color: theme.bgInput
                                Rectangle {
                                    width: parent.width * (((root.auditData && root.auditData.radarScores && root.auditData.radarScores.tokenDensity) || 0) / 100)
                                    height: parent.height; radius: 3; color: theme.accentBlue
                                }
                            }
                        }
                    }
                }
            }

            // Scrollable Findings (Strengths & Recommendations)
            ScrollView {
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true

                ColumnLayout {
                    width: parent.width - 16
                    spacing: 10

                    // Weaknesses & Recommendations
                    Text {
                        text: "⚠️ Diagnostic Findings & Recommendations (" + ((root.auditData && root.auditData.weaknesses && root.auditData.weaknesses.length) || 0) + ")"
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
                            implicitHeight: wLayout.implicitHeight + 14
                            radius: theme.radiusSm
                            color: theme.withAlpha(theme.accentAmber, 0.08)
                            border.color: theme.withAlpha(theme.accentAmber, 0.3)

                            ColumnLayout {
                                id: wLayout
                                anchors.fill: parent
                                anchors.margins: 8
                                spacing: 3

                                RowLayout {
                                    spacing: 6
                                    Text {
                                        text: "⚠️ [" + (wCard.modelData.area || "general").toUpperCase() + "]"
                                        color: theme.accentAmber
                                        font.pixelSize: 10
                                        font.bold: true
                                    }
                                    Text {
                                        Layout.fillWidth: true
                                        text: wCard.modelData.issue
                                        color: theme.textMain
                                        font.pixelSize: 11
                                        font.bold: true
                                        wrapMode: Text.Wrap
                                    }
                                }

                                Text {
                                    Layout.fillWidth: true
                                    text: "→ " + wCard.modelData.recommendation
                                    color: "#fde68a"
                                    font.pixelSize: 10
                                    wrapMode: Text.Wrap
                                }
                            }
                        }
                    }

                    // Strengths
                    Text {
                        Layout.topMargin: 6
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
                            implicitHeight: 28
                            radius: theme.radiusSm
                            color: theme.withAlpha(theme.accentEmerald, 0.08)
                            border.color: theme.withAlpha(theme.accentEmerald, 0.25)

                            RowLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 8
                                anchors.rightMargin: 8
                                spacing: 6
                                Text { text: "✓"; color: theme.accentEmerald; font.pixelSize: 10; font.bold: true }
                                Text { text: modelData; color: "#a7f3d0"; font.pixelSize: 11 }
                            }
                        }
                    }
                }
            }

            // Footer
            RowLayout {
                Layout.fillWidth: true
                Item { Layout.fillWidth: true }
                Button {
                    text: "Close"
                    onClicked: root.visible = false
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: theme.bgTertiary
                        border.color: theme.borderMain
                    }
                    contentItem: Text {
                        text: parent.text
                        color: theme.textMain
                        font.pixelSize: 11
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }
        }
    }
}
