import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Rectangle {
    id: root
    visible: false
    anchors.fill: parent
    color: Qt.rgba(0, 0, 0, 0.78)
    z: 215

    Theme { id: theme }

    property var matrixData: null

    function openModal() {
        root.visible = true
        if (bridge.scenarioMatrix && bridge.scenarioMatrix.packages && bridge.scenarioMatrix.packages.length > 0) {
            root.matrixData = bridge.scenarioMatrix
        } else {
            bridge.generateScenarioMatrix(steeringField.text)
        }
    }

    Connections {
        target: bridge
        function onScenarioMatrixReady(data) {
            root.matrixData = data
        }
    }

    // Modal Card
    Rectangle {
        width: Math.min(parent.width - 48, 980)
        height: Math.min(parent.height - 48, 740)
        anchors.centerIn: parent
        color: theme.bgSecondary
        radius: theme.radiusMd
        border.color: theme.accentAmber
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 18
            spacing: 12

            // Header Bar
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Text { text: "🎲"; font.pixelSize: 20 }

                ColumnLayout {
                    spacing: 2
                    Text {
                        text: "Scenario Matrix (4 Tailored Roleplay Packages)"
                        color: theme.accentAmber
                        font.pixelSize: 16
                        font.bold: true
                    }
                    Text {
                        text: "Generates 4 distinct inciting crisis scenarios and tailored first messages for '" + (bridge.card.name || "Character") + "'"
                        color: theme.textMuted
                        font.pixelSize: 11
                    }
                }

                Item { Layout.fillWidth: true }

                Button {
                    text: "✕"
                    onClicked: root.visible = false
                    background: Rectangle { color: "transparent" }
                    contentItem: Text {
                        text: parent.text
                        color: theme.textMuted
                        font.pixelSize: 15
                        font.bold: true
                    }
                }
            }

            // Controls Bar
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: 48
                color: theme.bgCard
                radius: theme.radiusSm
                border.color: theme.borderMain

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 8
                    spacing: 10

                    TextField {
                        id: steeringField
                        Layout.fillWidth: true
                        placeholderText: "Optional custom scenario steering or twist (e.g. 'Trapped in a blizzard cabin', 'Enemies forced to cooperate')..."
                        font.pixelSize: 11
                        color: theme.textMain
                        placeholderTextColor: theme.textDim
                        background: Rectangle {
                            color: theme.bgInput
                            border.color: steeringField.activeFocus ? theme.accentAmber : theme.borderMain
                            radius: theme.radiusSm
                        }
                    }

                    Button {
                        text: bridge.isBusy && bridge.taskType === "scenario_matrix" ? "🎲 Synthesizing Matrix..." : "🎲 Regenerate 4 Scenarios"
                        enabled: !bridge.isBusy
                        onClicked: bridge.generateScenarioMatrix(steeringField.text)
                        background: Rectangle {
                            radius: theme.radiusSm
                            color: parent.hovered ? "#d97706" : "#b45309"
                        }
                        contentItem: Text {
                            text: parent.text
                            color: "#ffffff"
                            font.pixelSize: 11
                            font.bold: true
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                    }
                }
            }

            // Package Grid / Cards
            ScrollView {
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true

                ColumnLayout {
                    width: parent.width - 16
                    spacing: 14

                    Repeater {
                        model: (root.matrixData && root.matrixData.packages) ? root.matrixData.packages : []
                        delegate: Rectangle {
                            id: pkgDelegate
                            required property var modelData
                            required property int index
                            Layout.fillWidth: true
                            implicitHeight: pkgCol.implicitHeight + 24
                            color: theme.bgCard
                            border.color: theme.withAlpha(theme.accentAmber, 0.4)
                            radius: theme.radiusSm

                            ColumnLayout {
                                id: pkgCol
                                anchors.fill: parent
                                anchors.margins: 12
                                spacing: 8

                                RowLayout {
                                    Layout.fillWidth: true
                                    Rectangle {
                                        width: 24; height: 24; radius: 12
                                        color: theme.accentAmber
                                        Text { anchors.centerIn: parent; text: (pkgDelegate.index + 1).toString(); color: "#000000"; font.bold: true }
                                    }
                                    Text {
                                        text: pkgDelegate.modelData.title || ("Package " + (pkgDelegate.index + 1))
                                        color: theme.accentAmber
                                        font.pixelSize: 13
                                        font.bold: true
                                    }
                                    Rectangle {
                                        radius: 4
                                        color: theme.withAlpha(theme.accentCyan, 0.2)
                                        implicitWidth: themeText.implicitWidth + 10
                                        implicitHeight: 20
                                        Text {
                                            id: themeText
                                            anchors.centerIn: parent
                                            text: pkgDelegate.modelData.theme || "Roleplay Hook"
                                            color: theme.accentCyan
                                            font.pixelSize: 10
                                            font.bold: true
                                        }
                                    }
                                    Item { Layout.fillWidth: true }
                                    Button {
                                        text: "✓ Apply to Card"
                                        onClicked: {
                                            bridge.applyScenarioPackage(
                                                pkgDelegate.modelData.scenario || "",
                                                pkgDelegate.modelData.first_mes || ""
                                            )
                                            root.visible = false
                                        }
                                        background: Rectangle {
                                            radius: theme.radiusSm
                                            color: parent.hovered ? "#059669" : "#047857"
                                        }
                                        contentItem: Text {
                                            text: parent.text
                                            color: "#ffffff"
                                            font.pixelSize: 11
                                            font.bold: true
                                            horizontalAlignment: Text.AlignHCenter
                                            verticalAlignment: Text.AlignVCenter
                                        }
                                    }
                                }

                                Text {
                                    text: "Hook: " + (pkgDelegate.modelData.incitingHook || "")
                                    color: "#fde68a"
                                    font.pixelSize: 11
                                    font.bold: true
                                    wrapMode: Text.Wrap
                                    Layout.fillWidth: true
                                }

                                Text {
                                    text: "Scenario Setting:"
                                    color: theme.textMuted
                                    font.pixelSize: 10
                                    font.bold: true
                                }
                                Text {
                                    text: pkgDelegate.modelData.scenario || ""
                                    color: theme.textMain
                                    font.pixelSize: 11
                                    wrapMode: Text.Wrap
                                    Layout.fillWidth: true
                                }

                                Text {
                                    text: "Opening Message Preview:"
                                    color: theme.textMuted
                                    font.pixelSize: 10
                                    font.bold: true
                                }
                                Text {
                                    text: pkgDelegate.modelData.first_mes || ""
                                    color: theme.textDim
                                    font.pixelSize: 11
                                    wrapMode: Text.Wrap
                                    maximumLineCount: 4
                                    elide: Text.ElideRight
                                    Layout.fillWidth: true
                                }
                            }
                        }
                    }

                    // Empty placeholder
                    Text {
                        visible: !root.matrixData || !root.matrixData.packages || root.matrixData.packages.length === 0
                        text: bridge.isBusy && bridge.taskType === "scenario_matrix" ? "Synthesizing scenario matrix packages..." : "No scenario packages loaded. Click 'Regenerate 4 Scenarios' above."
                        color: theme.textDim
                        font.pixelSize: 12
                        horizontalAlignment: Text.AlignHCenter
                        Layout.fillWidth: true
                        Layout.topMargin: 40
                    }
                }
            }
        }
    }
}
