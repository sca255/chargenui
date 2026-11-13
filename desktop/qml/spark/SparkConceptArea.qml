import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

ColumnLayout {
    id: root
    Layout.fillWidth: true
    spacing: 4

    property var theme
    property string botMode: "single"
    property alias text: conceptArea.text

    RowLayout {
        Layout.fillWidth: true
        Text {
            text: root.botMode === "multi_character"
                ? "Multi-Character Cast / Duo / Household Concept"
                : root.botMode === "rpg_world"
                ? "RPG World / Game Master Setting & Inciting Incident"
                : "Character Concept / Seed / Trope"
            color: root.theme.textMuted
            font.pixelSize: 11
            font.bold: true
        }
        Item { Layout.fillWidth: true }
        Text {
            text: "💡 type 'era:' for setting or 'erac:' for category"
            color: root.theme.accentCyan
            font.pixelSize: 10
            visible: conceptArea.activeFocus
        }
    }

    Item {
        Layout.fillWidth: true
        implicitHeight: 88

        TextArea {
            id: conceptArea
            anchors.fill: parent
            wrapMode: TextEdit.Wrap
            placeholderText: root.botMode === "multi_character"
                ? "e.g. Two rival inquisitor partners bound by a blood contract: one ruthless and methodical, the other empathetic and reckless, hunting heretics while hiding their own forbidden pact."
                : root.botMode === "rpg_world"
                ? "e.g. The Sunken Citadel of Oakhaven: A flooded gothic kingdom ruled by competing merchant factions, ancient sea cults, and drowned automatons. High-stakes survival and political intrigue."
                : "e.g. era: desert fortress... A weary inquisitor who broke their sacred oath to protect a heretic child. Cold, formal, scarred, haunted by ghosts they refuse to name."
            font.pixelSize: 12
            color: root.theme.textMain
            placeholderTextColor: root.theme.textDim
            background: Rectangle {
                color: root.theme.bgInput
                border.color: conceptArea.activeFocus ? root.theme.accentCyan : root.theme.borderMain
                radius: root.theme.radiusSm
            }
            onTextChanged: {
                var matchErac = /(?:^|\s)erac:\s*([^\s]*)$/i.exec(text || "");
                var matchEra = /(?:^|\s)era:\s*([^\s]*)$/i.exec(text || "");
                if (matchErac && typeof bridge !== "undefined" && bridge.searchEraCategoriesForAutocomplete) {
                    var qc = matchErac[1] || "";
                    var resc = [];
                    try {
                        resc = JSON.parse(bridge.searchEraCategoriesForAutocomplete(qc, 8));
                    } catch(e) {
                        resc = [];
                    }
                    if (resc.length > 0) {
                        eraAcModel.clear();
                        for (var ic = 0; ic < resc.length; ic++) {
                            eraAcModel.append(resc[ic]);
                        }
                        eraAcPopup.visible = true;
                    } else {
                        eraAcPopup.visible = false;
                    }
                } else if (matchEra && typeof bridge !== "undefined" && bridge.searchErasForAutocomplete) {
                    var qe = matchEra[1] || "";
                    var rese = [];
                    try {
                        rese = JSON.parse(bridge.searchErasForAutocomplete(qe, 8));
                    } catch(e) {
                        rese = [];
                    }
                    if (rese.length > 0) {
                        eraAcModel.clear();
                        for (var ie = 0; ie < rese.length; ie++) {
                            eraAcModel.append(rese[ie]);
                        }
                        eraAcPopup.visible = true;
                    } else {
                        eraAcPopup.visible = false;
                    }
                } else {
                    eraAcPopup.visible = false;
                }
            }
        }

        // Era Autocomplete Dropdown Popup
        Rectangle {
            id: eraAcPopup
            visible: false
            z: 999
            width: parent.width
            height: Math.min(eraAcList.contentHeight + 8, 200)
            anchors.top: parent.bottom
            anchors.topMargin: 4
            color: root.theme.bgCard
            border.color: root.theme.accentCyan
            border.width: 1
            radius: root.theme.radiusSm

            ListModel { id: eraAcModel }

            ListView {
                id: eraAcList
                anchors.fill: parent
                anchors.margins: 4
                model: eraAcModel
                clip: true
                delegate: Rectangle {
                    width: eraAcList.width
                    height: 32
                    radius: 4
                    color: acItemMa.containsMouse ? root.theme.withAlpha(root.theme.accentCyan, 0.15) : "transparent"

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 8
                        anchors.rightMargin: 8
                        spacing: 8

                        Text {
                            text: model.name || ""
                            font.bold: true
                            font.pixelSize: 11
                            color: root.theme.textMain
                            elide: Text.ElideRight
                            Layout.fillWidth: true
                        }

                        Text {
                            text: model.region ? ("📍 " + model.region) : ""
                            font.pixelSize: 10
                            color: root.theme.textDim
                            visible: model.region !== ""
                        }

                        Rectangle {
                            height: 18
                            implicitWidth: acSrcTxt.implicitWidth + 8
                            radius: 3
                            color: model.is_extension ? root.theme.withAlpha(root.theme.accentPurple, 0.2) : root.theme.withAlpha(root.theme.accentBlue, 0.2)
                            Text {
                                id: acSrcTxt
                                anchors.centerIn: parent
                                text: model.is_extension ? "Extension" : "Core"
                                font.pixelSize: 9
                                color: model.is_extension ? root.theme.accentPurple : root.theme.accentCyan
                            }
                        }
                    }

                    MouseArea {
                        id: acItemMa
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            var eraId = model.id;
                            var currentText = conceptArea.text;
                            var markerC = "erac:";
                            var markerE = "era:";
                            var idxC = currentText.toLowerCase().lastIndexOf(markerC);
                            var idxE = currentText.toLowerCase().lastIndexOf(markerE);
                            if (idxC >= 0 && (idxE < 0 || idxC > idxE)) {
                                var beforeC = currentText.substring(0, idxC + markerC.length);
                                conceptArea.text = beforeC + " " + eraId + " ";
                                conceptArea.cursorPosition = conceptArea.text.length;
                            } else if (idxE >= 0) {
                                var beforeE = currentText.substring(0, idxE + markerE.length);
                                conceptArea.text = beforeE + " " + eraId + " ";
                                conceptArea.cursorPosition = conceptArea.text.length;
                            }
                            eraAcPopup.visible = false;
                            conceptArea.forceActiveFocus();
                        }
                    }
                }
            }
        }
    }
}
