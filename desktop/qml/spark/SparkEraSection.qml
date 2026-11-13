import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

ColumnLayout {
    id: root
    spacing: 8
    Layout.fillWidth: true

    property var theme
    property string selectedEra: "off"
    property string selectedEraName: ""
    property var activeEraData: null
    property bool promptSnippetExpanded: false

    signal openEraPickerRequested(string category)
    signal eraSelectionChanged(string era, string eraName, var eraData)

    RowLayout {
        Layout.fillWidth: true
        Text {
            text: "⏳ Era & Historical Setting"
            color: root.theme.textMuted
            font.pixelSize: 11
            font.bold: true
        }
        Item { Layout.fillWidth: true }
        Button {
            text: "🏛️ Browse Catalog (82+ Eras) ↗"
            implicitHeight: 22
            onClicked: root.openEraPickerRequested("All")
            background: Rectangle {
                color: parent.hovered ? root.theme.bgHover : root.theme.withAlpha(root.theme.accentPurple, 0.15)
                radius: root.theme.radiusSm
                border.color: root.theme.accentPurple
            }
            contentItem: Text {
                text: parent.text
                color: root.theme.accentPurple
                font.pixelSize: 10
                font.bold: true
                leftPadding: 6
                rightPadding: 6
                verticalAlignment: Text.AlignVCenter
            }
        }
    }

    // Quick Category Chips
    RowLayout {
        Layout.fillWidth: true
        spacing: 4

        // 1. Off
        Rectangle {
            Layout.fillWidth: true
            height: 26
            radius: root.theme.radiusSm
            color: root.selectedEra === "off" ? "#334155" : root.theme.bgInput
            border.color: root.selectedEra === "off" ? "#94a3b8" : root.theme.borderMain
            border.width: root.selectedEra === "off" ? 2 : 1
            Text {
                anchors.centerIn: parent
                text: "🚫 Off"
                font.bold: root.selectedEra === "off"
                font.pixelSize: 10
                color: root.selectedEra === "off" ? "#ffffff" : root.theme.textDim
            }
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    root.selectedEra = "off"
                    root.selectedEraName = ""
                    root.activeEraData = null
                    root.eraSelectionChanged("off", "", null)
                }
            }
        }

        // 2. Fantasy
        Rectangle {
            Layout.fillWidth: true
            height: 26
            radius: root.theme.radiusSm
            property bool isActive: root.selectedEra === "timeless_fantasy" || (root.selectedEra !== "off" && root.selectedEra.indexOf("fantasy") !== -1)
            color: isActive ? "#581c87" : root.theme.bgInput
            border.color: isActive ? "#c084fc" : root.theme.borderMain
            border.width: isActive ? 2 : 1
            Text {
                anchors.centerIn: parent
                text: "🌌 Fantasy"
                font.bold: parent.isActive
                font.pixelSize: 10
                color: parent.isActive ? "#ffffff" : "#c084fc"
            }
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    if (root.selectedEra !== "timeless_fantasy") {
                        root.selectedEra = "timeless_fantasy"
                        root.selectedEraName = "🌌 Timeless High Fantasy"
                        root.eraSelectionChanged(root.selectedEra, root.selectedEraName, root.activeEraData)
                    }
                    root.openEraPickerRequested("Fantasy")
                }
            }
        }

        // 3. Medieval
        Rectangle {
            Layout.fillWidth: true
            height: 26
            radius: root.theme.radiusSm
            property bool isActive: root.selectedEra.indexOf("medieval") !== -1 || root.selectedEra.indexOf("plantagenet") !== -1 || root.selectedEra.indexOf("feudal") !== -1
            color: isActive ? "#78350f" : root.theme.bgInput
            border.color: isActive ? "#f59e0b" : root.theme.borderMain
            border.width: isActive ? 2 : 1
            Text {
                anchors.centerIn: parent
                text: "🏰 Medieval"
                font.bold: parent.isActive
                font.pixelSize: 10
                color: parent.isActive ? "#ffffff" : "#fcd34d"
            }
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: root.openEraPickerRequested("Medieval")
            }
        }

        // 4. Antiquity
        Rectangle {
            Layout.fillWidth: true
            height: 26
            radius: root.theme.radiusSm
            property bool isActive: root.selectedEra.indexOf("antiquity") !== -1 || root.selectedEra.indexOf("rome") !== -1 || root.selectedEra.indexOf("greece") !== -1 || root.selectedEra.indexOf("egypt") !== -1
            color: isActive ? "#065f46" : root.theme.bgInput
            border.color: isActive ? "#34d399" : root.theme.borderMain
            border.width: isActive ? 2 : 1
            Text {
                anchors.centerIn: parent
                text: "🏛️ Antiquity"
                font.bold: parent.isActive
                font.pixelSize: 10
                color: parent.isActive ? "#ffffff" : "#6ee7b7"
            }
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: root.openEraPickerRequested("Antiquity")
            }
        }

        // 5. User Custom
        Rectangle {
            Layout.fillWidth: true
            height: 26
            radius: root.theme.radiusSm
            property bool isActive: root.selectedEra.indexOf("user_") === 0
            color: isActive ? "#0f766e" : root.theme.bgInput
            border.color: isActive ? "#2dd4bf" : root.theme.borderMain
            border.width: isActive ? 2 : 1
            Text {
                anchors.centerIn: parent
                text: "📜 User Eras"
                font.bold: parent.isActive
                font.pixelSize: 10
                color: parent.isActive ? "#ffffff" : "#5eead4"
            }
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: root.openEraPickerRequested("User Eras")
            }
        }
    }

    // Active Era Badge & Selection Summary
    Rectangle {
        Layout.fillWidth: true
        implicitHeight: 32
        radius: root.theme.radiusSm
        color: root.selectedEra !== "off" ? root.theme.withAlpha(root.theme.accentPurple, 0.12) : root.theme.bgInput
        border.color: root.selectedEra !== "off" ? root.theme.accentPurple : root.theme.borderMain
        border.width: 1

        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 8
            anchors.rightMargin: 8
            spacing: 6

            Text {
                text: root.selectedEra === "off" ? "🚫 No era constraint applied (Contemporary / Freeform)" : ("⏳ " + (root.selectedEraName || root.selectedEra))
                color: root.selectedEra === "off" ? root.theme.textDim : root.theme.accentPurple
                font.pixelSize: 11
                font.bold: root.selectedEra !== "off"
                elide: Text.ElideRight
                Layout.fillWidth: true
            }

            Button {
                visible: root.selectedEra !== "off"
                text: "✕ Clear"
                implicitHeight: 20
                onClicked: {
                    root.selectedEra = "off"
                    root.selectedEraName = ""
                    root.activeEraData = null
                    root.eraSelectionChanged("off", "", null)
                }
                background: Rectangle { color: "transparent" }
                contentItem: Text { text: parent.text; color: root.theme.textDim; font.pixelSize: 10 }
            }
        }
    }

    // Detailed Era Dossier & Prompt Directive Preview Card
    Rectangle {
        id: eraDossierCard
        Layout.fillWidth: true
        implicitHeight: eraDossierCol.implicitHeight + 16
        radius: root.theme.radiusSm
        visible: root.selectedEra !== "off" && root.selectedEra !== ""
        color: {
            var eraId = (root.selectedEra || "").toLowerCase();
            if (eraId.indexOf("user_") === 0) return "#022c22";
            if (eraId.indexOf("fantasy") !== -1 || eraId.indexOf("eldritch") !== -1) return "#240a34";
            return "#1c1408";
        }
        border.color: {
            var eraId = (root.selectedEra || "").toLowerCase();
            if (eraId.indexOf("user_") === 0) return "#10b981";
            if (eraId.indexOf("fantasy") !== -1 || eraId.indexOf("eldritch") !== -1) return "#a855f7";
            return "#b45309";
        }
        border.width: 1

        ColumnLayout {
            id: eraDossierCol
            anchors.fill: parent
            anchors.margins: 10
            spacing: 6

            // Header Row: Era Title & Span Tag
            RowLayout {
                Layout.fillWidth: true
                spacing: 6

                Text {
                    Layout.fillWidth: true
                    text: (root.activeEraData && (root.activeEraData.name || root.activeEraData.short_name))
                        ? (root.activeEraData.name || root.activeEraData.short_name)
                        : (root.selectedEraName || root.selectedEra || "HISTORICAL ERA")
                    font.bold: true
                    font.pixelSize: 11
                    color: {
                        var eraId = (root.selectedEra || "").toLowerCase();
                        if (eraId.indexOf("user_") === 0) return "#34d399";
                        if (eraId.indexOf("fantasy") !== -1 || eraId.indexOf("eldritch") !== -1) return "#c084fc";
                        return "#fbbf24";
                    }
                    elide: Text.ElideRight
                }

                Rectangle {
                    height: 18
                    visible: root.activeEraData && root.activeEraData.span ? true : false
                    width: spanDossierTxt.contentWidth + 10
                    radius: 4
                    color: "#0f172a"
                    border.color: "#334155"
                    Text {
                        id: spanDossierTxt
                        anchors.centerIn: parent
                        text: (root.activeEraData && root.activeEraData.span) ? root.activeEraData.span : ""
                        font.pixelSize: 9
                        color: "#cbd5e1"
                    }
                }
            }

            // Aesthetic / Flavor description
            Text {
                Layout.fillWidth: true
                visible: root.activeEraData && root.activeEraData.aesthetic ? true : false
                text: (root.activeEraData && root.activeEraData.aesthetic) ? root.activeEraData.aesthetic : ""
                font.pixelSize: 10
                color: "#cbd5e1"
                wrapMode: Text.WordWrap
                maximumLineCount: 3
                elide: Text.ElideRight
            }

            // Tech, Material, & Social Hierarchy highlights
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 3
                visible: root.activeEraData && (root.activeEraData.tech || root.activeEraData.social_codes) ? true : false

                Text {
                    Layout.fillWidth: true
                    visible: root.activeEraData && root.activeEraData.tech ? true : false
                    text: "⚙️ Tech & Limitations: " + (root.activeEraData ? root.activeEraData.tech : "")
                    font.pixelSize: 9
                    color: "#94a3b8"
                    wrapMode: Text.WordWrap
                    maximumLineCount: 2
                    elide: Text.ElideRight
                }

                Text {
                    Layout.fillWidth: true
                    visible: root.activeEraData && root.activeEraData.social_codes ? true : false
                    text: "📜 Social & Hierarchy: " + (root.activeEraData ? root.activeEraData.social_codes : "")
                    font.pixelSize: 9
                    color: "#94a3b8"
                    wrapMode: Text.WordWrap
                    maximumLineCount: 2
                    elide: Text.ElideRight
                }
            }

            // Expandable LLM Prompt Directive Snippet (shows what is injected into system prompt)
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: promptSnippetCol.implicitHeight + 8
                radius: 4
                color: "#090d16"
                border.color: "#1e293b"
                border.width: 1

                ColumnLayout {
                    id: promptSnippetCol
                    anchors.fill: parent
                    anchors.margins: 6
                    spacing: 4

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 4

                        Text {
                            text: "🤖 Injected Prompt Directive Preview"
                            font.bold: true
                            font.pixelSize: 9
                            color: "#38bdf8"
                            Layout.fillWidth: true
                        }

                        Text {
                            text: root.promptSnippetExpanded ? "▲ Collapse" : "▼ Show Prompt"
                            font.pixelSize: 9
                            font.bold: true
                            color: "#818cf8"
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: root.promptSnippetExpanded = !root.promptSnippetExpanded
                            }
                        }
                    }

                    Text {
                        Layout.fillWidth: true
                        text: (root.activeEraData && root.activeEraData.promptSnippet)
                            ? root.activeEraData.promptSnippet
                            : ("[ERA / SETTING CONSTRAINT: " + (root.selectedEraName || root.selectedEra) + "]\nAll dialogue, attire, social etiquette, technology, and terminology must authentically conform to this historical / setting period. Avoid anachronisms.")
                        font.pixelSize: 9
                        font.family: "Monospace"
                        color: "#94a3b8"
                        wrapMode: Text.WordWrap
                        maximumLineCount: root.promptSnippetExpanded ? 50 : 2
                        elide: root.promptSnippetExpanded ? Text.ElideNone : Text.ElideRight
                    }
                }
            }
        }
    }
}
