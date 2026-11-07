import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

ScrollView {
    id: root
    clip: true

    Theme { id: theme }

    property var selectedHousehold: null

    Component.onCompleted: {
        refresh()
    }

    function refresh() {
        bridge.fetchHouseholds()
        bridge.refreshLibrary()
    }

    Connections {
        target: bridge
        function onHouseholdsChanged() {
            if (root.selectedHousehold && bridge.households) {
                for (var i = 0; i < bridge.households.length; i++) {
                    if (bridge.households[i].id === root.selectedHousehold.id) {
                        root.selectedHousehold = bridge.households[i]
                        return
                    }
                }
            }
        }
    }

    ColumnLayout {
        width: root.width - 20
        spacing: 12

        // Header Title
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Text { text: "👑"; font.pixelSize: 16 }

            ColumnLayout {
                spacing: 1
                Text {
                    text: "Households & Court Binders"
                    color: theme.accentPink
                    font.pixelSize: 13
                    font.bold: true
                }
                Text {
                    text: "Bind multiple character cards and generate multi-companion encounters."
                    color: theme.textMuted
                    font.pixelSize: 10
                    elide: Text.ElideRight
                    Layout.maximumWidth: root.width - 40
                }
            }
        }

        // Create New Household Box
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: 46
            color: theme.bgCard
            radius: theme.radiusSm
            border.color: theme.borderMain

            RowLayout {
                anchors.fill: parent
                anchors.margins: 6
                spacing: 6

                TextField {
                    id: newHhNameInput
                    Layout.fillWidth: true
                    implicitHeight: 32
                    placeholderText: "New household / court binder name..."
                    font.pixelSize: 11
                    color: theme.textMain
                    background: Rectangle {
                        color: theme.bgInput
                        border.color: theme.borderMain
                        radius: theme.radiusSm
                    }
                    onAccepted: btnAddHh.clicked()
                }

                Button {
                    id: btnAddHh
                    text: "+ Add Binder"
                    implicitHeight: 32
                    onClicked: {
                        if (newHhNameInput.text.trim().length > 0) {
                            var newHh = {
                                name: newHhNameInput.text.trim(),
                                category: "household",
                                description: "",
                                cardIds: []
                            }
                            bridge.saveHouseholdJson(JSON.stringify(newHh))
                            newHhNameInput.text = ""
                        }
                    }
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: parent.hovered ? "#db2777" : "#be185d"
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "#ffffff"
                        font.pixelSize: 10
                        font.bold: true
                    }
                }
            }
        }

        // Binders Selector Flow / List
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 4

            Text {
                text: "Select Active Binder (" + (bridge.households ? bridge.households.length : 0) + "):"
                color: theme.accentPink
                font.pixelSize: 10
                font.bold: true
            }

            Flow {
                Layout.fillWidth: true
                spacing: 6

                Repeater {
                    model: bridge.households || []
                    delegate: Rectangle {
                        id: hhChip
                        required property var modelData
                        radius: theme.radiusSm
                        implicitWidth: hhChipRow.implicitWidth + 14
                        implicitHeight: 28
                        color: root.selectedHousehold && root.selectedHousehold.id === hhChip.modelData.id
                            ? theme.withAlpha(theme.accentPink, 0.28)
                            : (hhChipMouse.containsMouse ? theme.bgHover : theme.bgCard)
                        border.color: root.selectedHousehold && root.selectedHousehold.id === hhChip.modelData.id ? theme.accentPink : theme.borderMain

                        RowLayout {
                            id: hhChipRow
                            anchors.centerIn: parent
                            spacing: 6
                            Text { text: "🏰"; font.pixelSize: 11 }
                            Text {
                                text: hhChip.modelData.name || "Untitled"
                                color: root.selectedHousehold && root.selectedHousehold.id === hhChip.modelData.id ? "#ffffff" : theme.textMain
                                font.pixelSize: 11
                                font.bold: root.selectedHousehold && root.selectedHousehold.id === hhChip.modelData.id
                            }
                            Rectangle {
                                radius: 7
                                color: theme.withAlpha(theme.accentPink, 0.3)
                                implicitWidth: cntTxt.implicitWidth + 6
                                implicitHeight: 14
                                Text {
                                    id: cntTxt
                                    anchors.centerIn: parent
                                    text: (hhChip.modelData.cardIds ? hhChip.modelData.cardIds.length : 0).toString()
                                    color: "#fbcfe8"
                                    font.pixelSize: 9
                                    font.bold: true
                                }
                            }
                            Text {
                                text: "🗑️"
                                font.pixelSize: 9
                                color: theme.textMuted
                                MouseArea {
                                    anchors.fill: parent
                                    onClicked: {
                                        if (root.selectedHousehold && root.selectedHousehold.id === hhChip.modelData.id) {
                                            root.selectedHousehold = null
                                        }
                                        bridge.deleteHousehold(hhChip.modelData.id)
                                    }
                                }
                            }
                        }

                        MouseArea {
                            id: hhChipMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            onClicked: root.selectedHousehold = hhChip.modelData
                        }
                    }
                }
            }
        }

        // Empty Notice if no binder selected
        Text {
            visible: !root.selectedHousehold
            text: bridge.households && bridge.households.length > 0
                ? "Select a binder above to manage members and synthesize group encounters."
                : "No household binders yet. Create one above to begin organizing multi-character dynamics."
            color: theme.textDim
            font.pixelSize: 11
            horizontalAlignment: Text.AlignHCenter
            Layout.fillWidth: true
            Layout.topMargin: 12
        }

        // Selected Household Content Card
        Rectangle {
            visible: !!root.selectedHousehold
            Layout.fillWidth: true
            implicitHeight: selHhCol.implicitHeight + 20
            color: theme.bgCard
            border.color: theme.withAlpha(theme.accentPink, 0.4)
            radius: theme.radiusSm

            ColumnLayout {
                id: selHhCol
                anchors.fill: parent
                anchors.margins: 10
                spacing: 8

                RowLayout {
                    Layout.fillWidth: true
                    Text {
                        text: "🏰 " + (root.selectedHousehold ? root.selectedHousehold.name : "")
                        color: theme.accentPink
                        font.pixelSize: 12
                        font.bold: true
                        Layout.fillWidth: true
                        elide: Text.ElideRight
                    }
                    Button {
                        text: "+ Add Active Card"
                        enabled: !!bridge.activeCardId
                        implicitHeight: 26
                        onClicked: {
                            if (root.selectedHousehold && bridge.activeCardId) {
                                var ids = root.selectedHousehold.cardIds || []
                                if (ids.indexOf(bridge.activeCardId) === -1) {
                                    ids.push(bridge.activeCardId)
                                    var updated = Object.assign({}, root.selectedHousehold, { cardIds: ids })
                                    bridge.saveHouseholdJson(JSON.stringify(updated))
                                }
                            }
                        }
                        background: Rectangle {
                            radius: theme.radiusSm
                            color: parent.hovered ? "#059669" : "#047857"
                        }
                        contentItem: Text {
                            text: parent.text
                            color: "#ffffff"
                            font.pixelSize: 9
                            font.bold: true
                        }
                    }
                }

                TextField {
                    id: hhDescField
                    Layout.fillWidth: true
                    implicitHeight: 32
                    text: (root.selectedHousehold && root.selectedHousehold.description) ? root.selectedHousehold.description : ""
                    placeholderText: "Household lore, environment, group hierarchy, or court dynamic..."
                    font.pixelSize: 10
                    color: theme.textMain
                    background: Rectangle {
                        color: theme.bgInput
                        border.color: theme.borderMain
                        radius: theme.radiusSm
                    }
                    onEditingFinished: {
                        if (root.selectedHousehold) {
                            var upd = Object.assign({}, root.selectedHousehold, { description: text })
                            bridge.saveHouseholdJson(JSON.stringify(upd))
                        }
                    }
                }

                // Member Cards List
                Text {
                    text: "Binder Members (" + (root.selectedHousehold && root.selectedHousehold.cardIds ? root.selectedHousehold.cardIds.length : 0) + "):"
                    color: theme.textMuted
                    font.pixelSize: 10
                    font.bold: true
                }

                Flow {
                    Layout.fillWidth: true
                    spacing: 4

                    Repeater {
                        model: (root.selectedHousehold && root.selectedHousehold.cardIds) ? root.selectedHousehold.cardIds : []
                        delegate: Rectangle {
                            required property string modelData
                            radius: 6
                            color: theme.bgTertiary
                            border.color: theme.borderMain
                            implicitWidth: mRow.implicitWidth + 10
                            implicitHeight: 22

                            RowLayout {
                                id: mRow
                                anchors.centerIn: parent
                                spacing: 4
                                Text {
                                    text: {
                                        if (bridge.library) {
                                            for (var i = 0; i < bridge.library.length; i++) {
                                                if (bridge.library[i].id === modelData) return bridge.library[i].name || "Card"
                                            }
                                        }
                                        return modelData.substring(0, 8) + "..."
                                    }
                                    color: theme.textMain
                                    font.pixelSize: 10
                                }
                                Text {
                                    text: "✕"
                                    color: theme.accentRed
                                    font.pixelSize: 9
                                    MouseArea {
                                        anchors.fill: parent
                                        onClicked: {
                                            var ids = (root.selectedHousehold.cardIds || []).filter(function(id) { return id !== modelData })
                                            var upd = Object.assign({}, root.selectedHousehold, { cardIds: ids })
                                            bridge.saveHouseholdJson(JSON.stringify(upd))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Group Encounter Synthesis
                Rectangle {
                    Layout.fillWidth: true
                    Layout.topMargin: 4
                    implicitHeight: encCol.implicitHeight + 14
                    color: theme.withAlpha(theme.accentPink, 0.08)
                    border.color: theme.withAlpha(theme.accentPink, 0.3)
                    radius: theme.radiusSm

                    ColumnLayout {
                        id: encCol
                        anchors.fill: parent
                        anchors.margins: 8
                        spacing: 6

                        Text {
                            text: "⚡ Synthesize Multi-Character Encounter"
                            color: "#f472b6"
                            font.pixelSize: 11
                            font.bold: true
                        }

                        TextField {
                            id: encounterPremiseField
                            Layout.fillWidth: true
                            implicitHeight: 32
                            placeholderText: "Encounter setting (e.g. 'Late night court interrogation', 'Shared dinner friction')..."
                            font.pixelSize: 10
                            color: theme.textMain
                            background: Rectangle {
                                color: theme.bgInput
                                border.color: theme.borderMain
                                radius: theme.radiusSm
                            }
                        }

                        Button {
                            Layout.fillWidth: true
                            implicitHeight: 32
                            enabled: !bridge.isBusy && root.selectedHousehold && root.selectedHousehold.cardIds && root.selectedHousehold.cardIds.length >= 2
                            text: bridge.isBusy && bridge.taskType === "group_encounter"
                                ? "Synthesizing Group Dynamic..."
                                : "⚔️ Forge Multi-Companion Encounter"
                            onClicked: {
                                bridge.synthesizeGroupEncounter(root.selectedHousehold.id, encounterPremiseField.text)
                            }
                            background: Rectangle {
                                radius: theme.radiusSm
                                color: parent.hovered ? "#db2777" : "#be185d"
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
}
