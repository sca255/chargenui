import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Rectangle {
    id: root
    Layout.fillWidth: true
    implicitHeight: loreSectionCol.implicitHeight + 16
    radius: theme.radiusSm
    color: theme.bgCard
    border.color: (bridge.activeLore && bridge.activeLore.length > 0) ? theme.accentCyan : theme.borderSubtle
    border.width: 1

    property var theme
    property string fallbackConcept: ""

    signal openLoreSearchRequested(string defaultQuery)

    function setLoreQuery(q) {
        if (q && loreQueryField) loreQueryField.text = q
        if (webLoreCheck) webLoreCheck.checked = true
    }

    ColumnLayout {
        id: loreSectionCol
        anchors.fill: parent
        anchors.margins: 10
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            CheckBox {
                id: webLoreCheck
                Layout.fillWidth: true
                checked: Boolean(bridge.activeLore && bridge.activeLore.length > 0)
                indicator: Rectangle {
                    implicitWidth: 16
                    implicitHeight: 16
                    x: 0
                    y: Math.round((parent.height - height) / 2)
                    radius: 3
                    color: root.theme.bgInput
                    border.color: webLoreCheck.checked ? root.theme.accentCyan : root.theme.borderMain
                    border.width: 1

                    Text {
                        anchors.centerIn: parent
                        text: "✓"
                        color: root.theme.accentCyan
                        font.pixelSize: 11
                        font.bold: true
                        visible: webLoreCheck.checked
                    }
                }
                contentItem: Text {
                    leftPadding: webLoreCheck.indicator.width + 8
                    text: "🌐 Fandom Lore & Wikis"
                    color: webLoreCheck.checked ? root.theme.accentCyan : root.theme.textMuted
                    font.pixelSize: 11
                    font.bold: webLoreCheck.checked
                    verticalAlignment: Text.AlignVCenter
                    elide: Text.ElideRight
                }
            }

            Button {
                text: "Researcher ↗"
                implicitHeight: 24
                onClicked: {
                    var q = (loreQueryField && loreQueryField.text.trim()) || root.fallbackConcept.trim().split("\n")[0].substring(0, 50)
                    root.openLoreSearchRequested(q)
                }
                background: Rectangle {
                    color: parent.hovered ? root.theme.bgHover : root.theme.withAlpha(root.theme.accentCyan, 0.1)
                    radius: root.theme.radiusSm
                    border.color: root.theme.withAlpha(root.theme.accentCyan, 0.4)
                }
                contentItem: Text {
                    text: parent.text
                    color: root.theme.accentCyan
                    font.pixelSize: 10
                    font.bold: true
                    leftPadding: 6
                    rightPadding: 6
                    verticalAlignment: Text.AlignVCenter
                }
            }
        }

        // Expandable controls when webLoreCheck is checked
        ColumnLayout {
            Layout.fillWidth: true
            visible: webLoreCheck.checked
            spacing: 6

            RowLayout {
                Layout.fillWidth: true
                spacing: 6

                TextField {
                    id: loreQueryField
                    Layout.fillWidth: true
                    Layout.minimumWidth: 0
                    implicitHeight: 32
                    placeholderText: "e.g. Malenia Elden Ring lore weapons"
                    font.pixelSize: 11
                    color: root.theme.textMain
                    placeholderTextColor: root.theme.textDim
                    background: Rectangle {
                        color: root.theme.bgInput
                        border.color: loreQueryField.activeFocus ? root.theme.accentCyan : root.theme.borderMain
                        radius: root.theme.radiusSm
                    }
                    onAccepted: {
                        if (text.trim().length > 0) {
                            bridge.searchLore(text.trim(), headcanonsCheck.checked)
                        }
                    }
                }

                Button {
                    id: btnFetchLore
                    implicitWidth: 64
                    implicitHeight: 32
                    enabled: !bridge.isBusy && (loreQueryField.text.trim().length > 0 || root.fallbackConcept.trim().length > 0)
                    onClicked: {
                        var q = loreQueryField.text.trim()
                        if (!q) {
                            q = root.fallbackConcept.trim().split("\n")[0].substring(0, 60)
                            loreQueryField.text = q
                        }
                        bridge.searchLore(q, headcanonsCheck.checked)
                    }
                    background: Rectangle {
                        radius: root.theme.radiusSm
                        color: parent.hovered ? root.theme.withAlpha(root.theme.accentCyan, 0.3) : root.theme.withAlpha(root.theme.accentCyan, 0.15)
                        border.color: root.theme.accentCyan
                    }
                    contentItem: RowLayout {
                        anchors.centerIn: parent
                        spacing: 4
                        Text {
                            text: bridge.taskType === "lore_search" ? "⏳" : "🔎"
                            font.pixelSize: 11
                        }
                        Text {
                            text: bridge.taskType === "lore_search" ? "..." : "Fetch"
                            color: "#7dd3fc"
                            font.pixelSize: 11
                            font.bold: true
                        }
                    }
                }
            }

            CheckBox {
                id: headcanonsCheck
                Layout.fillWidth: true
                checked: true
                indicator: Rectangle {
                    implicitWidth: 14
                    implicitHeight: 14
                    x: 0
                    y: Math.round((parent.height - height) / 2)
                    radius: 3
                    color: root.theme.bgInput
                    border.color: headcanonsCheck.checked ? root.theme.accentCyan : root.theme.borderMain
                    border.width: 1

                    Text {
                        anchors.centerIn: parent
                        text: "✓"
                        color: root.theme.accentCyan
                        font.pixelSize: 10
                        font.bold: true
                        visible: headcanonsCheck.checked
                    }
                }
                contentItem: Text {
                    leftPadding: headcanonsCheck.indicator.width + 6
                    text: "Extract Fan Headcanons & Tropes"
                    color: root.theme.textDim
                    font.pixelSize: 10
                    verticalAlignment: Text.AlignVCenter
                    elide: Text.ElideRight
                }
            }

            // Lore Preview Box if lore is active
            Rectangle {
                visible: Boolean(bridge.activeLore && bridge.activeLore.length > 0)
                Layout.fillWidth: true
                implicitHeight: Math.min(90, lorePreviewText.implicitHeight + 16)
                radius: root.theme.radiusSm
                color: root.theme.bgSecondary
                border.color: root.theme.withAlpha(root.theme.accentEmerald, 0.5)

                ScrollView {
                    anchors.fill: parent
                    anchors.margins: 6
                    clip: true

                    Text {
                        id: lorePreviewText
                        width: parent.width
                        wrapMode: Text.Wrap
                        text: bridge.activeLore || ""
                        color: root.theme.textMuted
                        font.pixelSize: 10
                    }
                }
            }

            RowLayout {
                visible: Boolean(bridge.activeLore && bridge.activeLore.length > 0)
                Layout.fillWidth: true
                Text {
                    text: "✓ Lore active (" + (bridge.activeLore ? bridge.activeLore.length : 0) + "c)"
                    color: root.theme.accentEmerald
                    font.pixelSize: 10
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Button {
                    text: "✕ Clear"
                    implicitHeight: 20
                    onClicked: bridge.clearActiveLore()
                    background: Rectangle { color: "transparent" }
                    contentItem: Text { text: parent.text; color: root.theme.textDim; font.pixelSize: 10 }
                }
            }
        }
    }
}
