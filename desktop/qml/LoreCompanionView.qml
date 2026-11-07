import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

ScrollView {
    id: root
    clip: true

    Theme { id: theme }

    property string selectedRole: "guide"
    property string selectedRelation: "stranger"
    property string selectedGender: "any"
    property var analyzedData: null

    function setLoreText(text) {
        loreArea.text = text
        if (text && text.trim().length > 10) {
            bridge.analyzeLorebook(text.trim())
        }
    }

    Connections {
        target: bridge
        function onLorebookAnalyzed(data) {
            root.analyzedData = data
        }
        function onLorebookCompanionFinished(data) {
            // Finished
        }
    }

    ColumnLayout {
        width: root.width - 20
        spacing: 12

        // Header Title
        RowLayout {
            spacing: 8
            Text { text: "📖"; font.pixelSize: 18 }
            ColumnLayout {
                spacing: 1
                Text {
                    text: "Lorebook Companion Creator"
                    color: theme.accentCyan
                    font.pixelSize: 14
                    font.bold: true
                }
                Text {
                    text: "Forge an authentic living guide, bodyguard, scholar, or rival to navigate any SillyTavern Lorebook"
                    color: theme.textMuted
                    font.pixelSize: 10
                    elide: Text.ElideRight
                    Layout.maximumWidth: root.width - 40
                }
            }
        }

        // Section 1: Lorebook Input & Source
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: loreSourceCol.implicitHeight + 16
            color: theme.bgCard
            radius: theme.radiusSm
            border.color: theme.borderMain

            ColumnLayout {
                id: loreSourceCol
                anchors.fill: parent
                anchors.margins: 10
                spacing: 8

                RowLayout {
                    Layout.fillWidth: true
                    Text {
                        text: "World Lorebook / Setting Input"
                        color: theme.textMain
                        font.pixelSize: 12
                        font.bold: true
                    }
                    Item { Layout.fillWidth: true }

                    // Load from Active Card
                    Button {
                        implicitHeight: 24
                        text: "⚡ Use Active Card Lorebook"
                        font.pixelSize: 10
                        onClicked: {
                            var raw = bridge.getActiveCardLorebook()
                            if (raw && raw !== "{}" && raw !== "null") {
                                loreArea.text = raw
                                bridge.analyzeLorebook(raw)
                            } else {
                                bridge.errorOccurred.emit("Active character does not have an embedded lorebook.")
                            }
                        }
                        background: Rectangle {
                            color: parent.hovered ? theme.bgHover : theme.bgSecondary
                            border.color: theme.accentCyan
                            radius: theme.radiusSm
                        }
                        contentItem: Text {
                            text: parent.text
                            color: theme.accentCyan
                            font.pixelSize: 10
                            font.bold: true
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                    }
                }

                // Lore text / JSON input area
                Item {
                    Layout.fillWidth: true
                    implicitHeight: 110

                    TextArea {
                        id: loreArea
                        anchors.fill: parent
                        wrapMode: TextEdit.Wrap
                        placeholderText: "Paste SillyTavern Lorebook JSON, worldbuilding notes, faction wikis, or markdown entries with headers..."
                        font.pixelSize: 11
                        color: theme.textMain
                        placeholderTextColor: theme.textDim
                        background: Rectangle {
                            color: theme.bgInput
                            border.color: loreArea.activeFocus ? theme.accentCyan : theme.borderMain
                            radius: theme.radiusSm
                        }
                    }
                }

                // Analysis Action & Summary
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 6

                    Button {
                        implicitHeight: 28
                        text: "🔍 Analyze Lorebook"
                        enabled: loreArea.text.trim().length > 10 && !bridge.isBusy
                        onClicked: bridge.analyzeLorebook(loreArea.text.trim())
                        background: Rectangle {
                            color: parent.hovered ? theme.withAlpha(theme.accentBlue, 0.4) : theme.withAlpha(theme.accentBlue, 0.2)
                            border.color: theme.accentBlue
                            radius: theme.radiusSm
                        }
                        contentItem: Text {
                            text: parent.text
                            color: "#93c5fd"
                            font.pixelSize: 11
                            font.bold: true
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                    }

                    Item { Layout.fillWidth: true }

                    Text {
                        visible: root.analyzedData !== null
                        text: {
                            if (!root.analyzedData || !root.analyzedData.summary) return ""
                            var s = root.analyzedData.summary
                            return "✓ " + s.entryCount + " entries detected (~" + s.totalTokensApprox + " tokens)"
                        }
                        color: theme.accentGreen
                        font.pixelSize: 11
                        font.bold: true
                    }
                }

                // Analyzed Factions & Key Terms preview chips
                ColumnLayout {
                    Layout.fillWidth: true
                    visible: root.analyzedData && root.analyzedData.summary && (root.analyzedData.summary.factions.length > 0 || root.analyzedData.summary.locations.length > 0)
                    spacing: 4

                    Text {
                        text: "Detected World Entities:"
                        color: theme.textMuted
                        font.pixelSize: 10
                    }

                    Flow {
                        Layout.fillWidth: true
                        spacing: 4
                        Repeater {
                            model: root.analyzedData ? (root.analyzedData.summary.factions || []).concat(root.analyzedData.summary.locations || []).slice(0, 8) : []
                            delegate: Rectangle {
                                implicitHeight: 20
                                implicitWidth: entityText.implicitWidth + 12
                                radius: 10
                                color: theme.withAlpha(theme.accentPurple, 0.15)
                                border.color: theme.withAlpha(theme.accentPurple, 0.4)
                                Text {
                                    id: entityText
                                    anchors.centerIn: parent
                                    text: modelData
                                    color: "#d8b4fe"
                                    font.pixelSize: 10
                                }
                            }
                        }
                    }
                }
            }
        }

        // Section 2: Companion Archetype / Role
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 6

            Text {
                text: "Companion Archetype & Role"
                color: theme.textMuted
                font.pixelSize: 11
                font.bold: true
            }

            Flow {
                Layout.fillWidth: true
                spacing: 6

                Repeater {
                    model: [
                        { id: "guide", label: "🧭 Native Guide", desc: "Wayfarer, tracker, local terrain expert" },
                        { id: "scholar", label: "📜 Lorekeeper Scholar", desc: "Archivist, occult linguist, relic researcher" },
                        { id: "bodyguard", label: "⚔️ Mercenary Escort", desc: "Hired blade, tactical protector, street veteran" },
                        { id: "defector", label: "🗡️ Faction Defector", desc: "Insider whistleblower hunted by ruling power" },
                        { id: "scoundrel", label: "🎭 Underworld Smuggler", desc: "Fence, black market fixer, secret tunnels" },
                        { id: "bound_familiar", label: "🔮 Bound Familiar", desc: "Spirit/AI tethered to user, ancient awareness" },
                        { id: "rival", label: "⚡ Reluctant Ally", desc: "Snarky frenemy bound by mutual survival" },
                        { id: "custom", label: "✍️ Custom Role", desc: "User-defined role" }
                    ]

                    delegate: Rectangle {
                        implicitHeight: 28
                        implicitWidth: roleLabel.implicitWidth + 16
                        radius: theme.radiusSm
                        color: root.selectedRole === modelData.id ? theme.withAlpha(theme.accentPurple, 0.3) : (roleMouse.containsMouse ? theme.bgHover : theme.bgCard)
                        border.color: root.selectedRole === modelData.id ? theme.accentPurple : theme.borderMain
                        border.width: root.selectedRole === modelData.id ? 1.5 : 1

                        Text {
                            id: roleLabel
                            anchors.centerIn: parent
                            text: modelData.label
                            color: root.selectedRole === modelData.id ? "#ffffff" : theme.textMain
                            font.pixelSize: 11
                            font.bold: root.selectedRole === modelData.id
                        }

                        MouseArea {
                            id: roleMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.selectedRole = modelData.id
                        }
                    }
                }
            }

            TextField {
                id: customRoleInput
                visible: root.selectedRole === "custom"
                Layout.fillWidth: true
                implicitHeight: 30
                placeholderText: "Specify custom companion role (e.g. 'Blind oracle of the Obsidian Coven')..."
                color: theme.textMain
                font.pixelSize: 11
                placeholderTextColor: theme.textDim
                background: Rectangle {
                    color: theme.bgInput
                    border.color: theme.accentPurple
                    radius: theme.radiusSm
                }
            }
        }

        // Section 3: Relationship to {{user}}
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 6

            Text {
                text: "{{user}}'s Identity & Stance in this World"
                color: theme.textMuted
                font.pixelSize: 11
                font.bold: true
            }

            Flow {
                Layout.fillWidth: true
                spacing: 6

                Repeater {
                    model: [
                        { id: "stranger", label: "🌍 Outsider / Stranger", desc: "{{user}} knows nothing of this realm" },
                        { id: "amnesiac", label: "❓ Amnesiac with Relic", desc: "{{user}} awoke with missing memories" },
                        { id: "heir", label: "👑 Fallen Heir", desc: "Hidden or exiled royalty of a collapsed house" },
                        { id: "contractor", label: "📜 Employer / Contractor", desc: "{{user}} hired the companion for a mission" },
                        { id: "fugitive", label: "🏹 Fugitives on the Run", desc: "Both marked for death by a ruling faction" },
                        { id: "custom", label: "✍️ Custom Relation", desc: "User-defined connection" }
                    ]

                    delegate: Rectangle {
                        implicitHeight: 28
                        implicitWidth: relLabel.implicitWidth + 16
                        radius: theme.radiusSm
                        color: root.selectedRelation === modelData.id ? theme.withAlpha(theme.accentCyan, 0.3) : (relMouse.containsMouse ? theme.bgHover : theme.bgCard)
                        border.color: root.selectedRelation === modelData.id ? theme.accentCyan : theme.borderMain
                        border.width: root.selectedRelation === modelData.id ? 1.5 : 1

                        Text {
                            id: relLabel
                            anchors.centerIn: parent
                            text: modelData.label
                            color: root.selectedRelation === modelData.id ? "#ffffff" : theme.textMain
                            font.pixelSize: 11
                            font.bold: root.selectedRelation === modelData.id
                        }

                        MouseArea {
                            id: relMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.selectedRelation = modelData.id
                        }
                    }
                }
            }

            TextField {
                id: customRelInput
                visible: root.selectedRelation === "custom"
                Layout.fillWidth: true
                implicitHeight: 30
                placeholderText: "Specify custom relationship (e.g. 'Childhood pact rekindled after a 10-year siege')..."
                color: theme.textMain
                font.pixelSize: 11
                placeholderTextColor: theme.textDim
                background: Rectangle {
                    color: theme.bgInput
                    border.color: theme.accentCyan
                    radius: theme.radiusSm
                }
            }
        }

        // Section 4: Preferences & Steering
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 6

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                // Gender
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text { text: "Gender Presentation"; color: theme.textMuted; font.pixelSize: 10 }
                    ComboBox {
                        id: genderBox
                        Layout.fillWidth: true
                        implicitHeight: 30
                        model: ["Any / Flexible", "Female", "Male", "Non-Binary"]
                        currentIndex: 0
                        background: Rectangle { color: theme.bgInput; border.color: theme.borderMain; radius: theme.radiusSm }
                    }
                }

                // NSFW Toggle
                ColumnLayout {
                    spacing: 2
                    Text { text: "Mature / NSFW"; color: theme.textMuted; font.pixelSize: 10 }
                    RowLayout {
                        spacing: 6
                        Switch { id: nsfwSwitch; checked: false }
                        Text { text: nsfwSwitch.checked ? "Enabled" : "Off"; color: nsfwSwitch.checked ? theme.accentRed : theme.textDim; font.pixelSize: 11 }
                    }
                }
            }

            // Tone & Atmosphere
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2
                Text { text: "Tone & Voice Atmosphere"; color: theme.textMuted; font.pixelSize: 10 }
                TextField {
                    id: toneField
                    Layout.fillWidth: true
                    implicitHeight: 30
                    text: "Tactical, atmospheric, dry banter, sharp perceptiveness"
                    color: theme.textMain
                    font.pixelSize: 11
                    background: Rectangle { color: theme.bgInput; border.color: theme.borderMain; radius: theme.radiusSm }
                }
            }

            // Steering Instructions
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2
                Text { text: "Director's Steering Notes (Optional)"; color: theme.textMuted; font.pixelSize: 10 }
                TextField {
                    id: steeringField
                    Layout.fillWidth: true
                    implicitHeight: 30
                    placeholderText: "e.g. 'She has a secret bounty from the Nightfall Syndicate', or 'Wears a clockwork gauntlet'..."
                    color: theme.textMain
                    font.pixelSize: 11
                    background: Rectangle { color: theme.bgInput; border.color: theme.borderMain; radius: theme.radiusSm }
                }
            }
        }

        // Section 5: Forge Action Button
        Button {
            id: btnForgeCompanion
            Layout.fillWidth: true
            implicitHeight: 42
            enabled: loreArea.text.trim().length > 10 && !bridge.isBusy
            onClicked: {
                var genderVal = "any"
                if (genderBox.currentIndex === 1) genderVal = "female"
                if (genderBox.currentIndex === 2) genderVal = "male"
                if (genderBox.currentIndex === 3) genderVal = "nonbinary"

                bridge.generateLorebookCompanion(
                    loreArea.text.trim(),
                    root.selectedRole,
                    customRoleInput.text.trim(),
                    root.selectedRelation,
                    customRelInput.text.trim(),
                    genderVal,
                    toneField.text.trim(),
                    nsfwSwitch.checked,
                    steeringField.text.trim()
                )
            }

            background: Rectangle {
                radius: theme.radiusSm
                gradient: Gradient {
                    orientation: Gradient.Horizontal
                    GradientStop { position: 0.0; color: btnForgeCompanion.hovered ? "#059669" : "#047857" }
                    GradientStop { position: 1.0; color: btnForgeCompanion.hovered ? "#0d9488" : "#0f766e" }
                }
                border.color: "#34d399"
                border.width: 1
            }

            contentItem: RowLayout {
                anchors.centerIn: parent
                spacing: 8
                Text {
                    text: bridge.taskType === "companion_forge" ? "⏳" : "⚡"
                    font.pixelSize: 14
                }
                Text {
                    text: bridge.taskType === "companion_forge"
                        ? "Synthesizing Companion & Embedding Lorebook..."
                        : "Forge Lorebook Companion (Embeds Lorebook into Card)"
                    color: "#ffffff"
                    font.pixelSize: 12
                    font.bold: true
                }
            }
        }

        Item { height: 16 }
    }
}
