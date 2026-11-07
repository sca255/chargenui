import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

ScrollView {
    id: root
    clip: true

    Theme { id: theme }

    property var matrixData: null

    Component.onCompleted: {
        refresh()
    }

    function refresh() {
        if (bridge.scenarioMatrix && bridge.scenarioMatrix.packages && bridge.scenarioMatrix.packages.length > 0) {
            root.matrixData = bridge.scenarioMatrix
        } else if (!bridge.isBusy) {
            bridge.generateScenarioMatrix(steeringField.text)
        }
    }

    Connections {
        target: bridge
        function onScenarioMatrixReady(data) {
            root.matrixData = data
        }
    }

    ColumnLayout {
        width: root.width - 20
        spacing: 12

        // Header Title
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Text { text: "🎲"; font.pixelSize: 16 }

            ColumnLayout {
                spacing: 1
                Text {
                    text: "Scenario Matrix (4 Inciting Packages)"
                    color: theme.accentAmber
                    font.pixelSize: 13
                    font.bold: true
                }
                Text {
                    text: "4 distinct opening scenarios and first messages for '" + (bridge.card.name || "Character") + "'"
                    color: theme.textMuted
                    font.pixelSize: 10
                    elide: Text.ElideRight
                    Layout.maximumWidth: root.width - 40
                }
            }
        }

        // Controls Bar
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: controlsLayout.implicitHeight + 14
            color: theme.bgCard
            radius: theme.radiusSm
            border.color: theme.borderMain

            ColumnLayout {
                id: controlsLayout
                anchors.fill: parent
                anchors.margins: 8
                spacing: 6

                TextField {
                    id: steeringField
                    Layout.fillWidth: true
                    implicitHeight: 32
                    placeholderText: "Optional steering or twist (e.g. 'Trapped in a blizzard cabin')..."
                    font.pixelSize: 11
                    color: theme.textMain
                    placeholderTextColor: theme.textDim
                    background: Rectangle {
                        color: theme.bgInput
                        border.color: steeringField.activeFocus ? theme.accentAmber : theme.borderMain
                        radius: theme.radiusSm
                    }
                    onAccepted: btnGenMatrix.clicked()
                }

                Button {
                    id: btnGenMatrix
                    Layout.fillWidth: true
                    implicitHeight: 32
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

        // Empty / Loading Placeholder
        Text {
            visible: !root.matrixData || !root.matrixData.packages || root.matrixData.packages.length === 0
            text: bridge.isBusy && bridge.taskType === "scenario_matrix"
                ? "Synthesizing scenario matrix packages with local AI..."
                : "No scenario packages loaded. Click 'Regenerate 4 Scenarios' above."
            color: theme.textDim
            font.pixelSize: 11
            horizontalAlignment: Text.AlignHCenter
            Layout.fillWidth: true
            Layout.topMargin: 20
        }

        // Package Cards List
        Repeater {
            model: (root.matrixData && root.matrixData.packages) ? root.matrixData.packages : []
            delegate: Rectangle {
                id: pkgDelegate
                required property var modelData
                required property int index
                Layout.fillWidth: true
                implicitHeight: pkgCol.implicitHeight + 18
                color: theme.bgCard
                border.color: theme.withAlpha(theme.accentAmber, 0.4)
                radius: theme.radiusSm

                ColumnLayout {
                    id: pkgCol
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 6

                    RowLayout {
                        Layout.fillWidth: true
                        Rectangle {
                            width: 20; height: 20; radius: 10
                            color: theme.accentAmber
                            Text { anchors.centerIn: parent; text: (pkgDelegate.index + 1).toString(); color: "#000000"; font.bold: true; font.pixelSize: 10 }
                        }
                        Text {
                            text: pkgDelegate.modelData.title || ("Package " + (pkgDelegate.index + 1))
                            color: theme.accentAmber
                            font.pixelSize: 12
                            font.bold: true
                            elide: Text.ElideRight
                            Layout.fillWidth: true
                        }
                        Rectangle {
                            radius: 4
                            color: theme.withAlpha(theme.accentCyan, 0.2)
                            implicitWidth: themeText.implicitWidth + 8
                            implicitHeight: 18
                            Text {
                                id: themeText
                                anchors.centerIn: parent
                                text: pkgDelegate.modelData.theme || "Hook"
                                color: theme.accentCyan
                                font.pixelSize: 9
                                font.bold: true
                            }
                        }
                    }

                    Text {
                        text: "Hook: " + (pkgDelegate.modelData.incitingHook || "")
                        color: "#fde68a"
                        font.pixelSize: 10
                        font.bold: true
                        wrapMode: Text.Wrap
                        Layout.fillWidth: true
                    }

                    Text {
                        text: "Scenario Setting:"
                        color: theme.textMuted
                        font.pixelSize: 9
                        font.bold: true
                    }
                    Text {
                        text: pkgDelegate.modelData.scenario || ""
                        color: theme.textMain
                        font.pixelSize: 10
                        wrapMode: Text.Wrap
                        Layout.fillWidth: true
                    }

                    Text {
                        text: "Opening Message Preview:"
                        color: theme.textMuted
                        font.pixelSize: 9
                        font.bold: true
                    }
                    Text {
                        text: pkgDelegate.modelData.first_mes || ""
                        color: theme.textDim
                        font.pixelSize: 10
                        wrapMode: Text.Wrap
                        maximumLineCount: 4
                        elide: Text.ElideRight
                        Layout.fillWidth: true
                    }

                    Button {
                        Layout.fillWidth: true
                        implicitHeight: 28
                        text: "✓ Apply to Card (Scenario + Starter)"
                        onClicked: {
                            bridge.applyScenarioPackage(
                                pkgDelegate.modelData.scenario || "",
                                pkgDelegate.modelData.first_mes || ""
                            )
                        }
                        background: Rectangle {
                            radius: theme.radiusSm
                            color: parent.hovered ? "#059669" : "#047857"
                        }
                        contentItem: Text {
                            text: parent.text
                            color: "#ffffff"
                            font.pixelSize: 10
                            font.bold: true
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                    }
                }
            }
        }
    }
}
