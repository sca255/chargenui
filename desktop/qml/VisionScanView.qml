import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5
import QtQuick.Dialogs 6.5

ScrollView {
    id: root
    clip: true

    signal requestForgeFromScan(var characterData)

    Theme { id: theme }

    property var selectedImageUrl: ""
    property bool isScanning: false

    function clearSelection() {
        selectedImageUrl = ""
        imagePreview.source = ""
        imagePreview.visible = false
        dropzoneText.visible = true
        dropzoneIcon.visible = true
        scanBtn.enabled = true
        findingsBox.visible = false
    }

    ColumnLayout {
        width: parent.width - 20
        spacing: 12

        // Section Title
        RowLayout {
            spacing: 8
            Text { text: "👁️"; font.pixelSize: 16 }
            Text {
                text: "Vision Image Scanner"
                color: theme.accentCyan
                font.pixelSize: 14
                font.bold: true
            }
        }

        // Dropzone
        Rectangle {
            id: dropzone
            Layout.fillWidth: true
            implicitHeight: 200
            radius: theme.radiusMd
            border.color: selectedImageUrl ? theme.accentCyan : (containsMouse ? theme.accentCyan : theme.borderMain)
            border.width: selectedImageUrl || containsMouse ? 2 : 1
            border.style: selectedImageUrl ? Qt.SolidLine : Qt.DashLine
            color: selectedImageUrl ? theme.bgCardHover : (containsMouse ? theme.bgHover : theme.bgCard)

            MouseArea {
                anchors.fill: parent
                hoverEnabled: true
                onEntered: containsMouse = true
                onExited: containsMouse = false
                onClicked: fileDialog.open()
                onDropped: {
                    if (drop.urls.length > 0) {
                        var url = drop.urls[0]
                        if (url.isLocalFile || url.scheme === "file") {
                            root.selectedImageUrl = url.toLocalFile()
                        } else {
                            root.selectedImageUrl = url.toString()
                        }
                    }
                }
            }

            DropArea {
                id: drop
                anchors.fill: parent
                keys: ["urls"]
                onDropped: {
                    if (drop.urls.length > 0) {
                        var url = drop.urls[0]
                        if (url.isLocalFile || url.scheme === "file") {
                            root.selectedImageUrl = url.toLocalFile()
                        } else {
                            root.selectedImageUrl = url.toString()
                        }
                    }
                }
            }

            // Dropzone text/icon (hidden when image selected)
            Column {
                id: dropzoneContent
                anchors.centerIn: parent
                spacing: 8
                visible: !root.selectedImageUrl

                Text {
                    id: dropzoneIcon
                    text: "📷"
                    font.pixelSize: 48
                    horizontalAlignment: Text.AlignHCenter
                }
                Text {
                    id: dropzoneText
                    text: "<strong>Drag & Drop</strong> character portrait or concept art, or click to browse"
                    font.pixelSize: 13
                    color: theme.textMuted
                    horizontalAlignment: Text.AlignHCenter
                    wrapMode: Text.WordWrap
                    width: parent.width - 40
                }
            }

            // Image Preview
            Image {
                id: imagePreview
                visible: root.selectedImageUrl
                anchors.fill: parent
                anchors.margins: 8
                fillMode: Image.PreserveAspectFit
                source: root.selectedImageUrl
                asynchronous: true
            }

            // Clear button overlay
            Button {
                anchors.top: parent.top
                anchors.right: parent.right
                anchors.margins: 8
                visible: root.selectedImageUrl
                implicitWidth: 32
                implicitHeight: 32
                flat: true
                contentItem: Text { text: "✕"; font.pixelSize: 16; color: theme.textMuted }
                onClicked: root.clearSelection()
            }
        }

        // Hints & Options
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 10

            TextField {
                id: hintsField
                Layout.fillWidth: true
                placeholderText: "Additional context / hints (e.g. 'Cyberpunk mercenary, sarcastic, secretly protective')"
                font.pixelSize: 12
                background: Rectangle {
                    color: theme.bgInput
                    border.color: theme.borderMain
                    border.width: 1
                    radius: theme.radiusSm
                }
            }

            RowLayout {
                CheckBox {
                    id: nsfwCheck
                    checked: true
                }
                Text {
                    text: "Uncensored character synthesis from visual scan"
                    color: theme.textMuted
                    font.pixelSize: 11
                }
            }
        }

        // Scan Button
        Button {
            id: scanBtn
            Layout.fillWidth: true
            implicitHeight: 40
            enabled: root.selectedImageUrl && !root.isScanning && bridge.backendConnected
            onClicked: {
                root.isScanning = true
                scanBtn.enabled = false
                bridge.scanImage(root.selectedImageUrl)
            }

            background: Rectangle {
                radius: theme.radiusSm
                color: scanBtn.hovered && scanBtn.enabled ? "#2563eb" : (scanBtn.enabled ? "#1d4ed8" : theme.bgDisabled)
                border.color: theme.accentBlue
            }

            contentItem: RowLayout {
                anchors.centerIn: parent
                spacing: 8
                Text { text: root.isScanning ? "⏳" : "👁️"; font.pixelSize: 14 }
                Text {
                    text: root.isScanning ? "Scanning & Deconstructing..." : "👁️ Scan Image & Synthesize Card"
                    color: "#ffffff"
                    font.pixelSize: 12
                    font.bold: true
                }
            }
        }

        // Findings Box
        Rectangle {
            id: findingsBox
            visible: false
            Layout.fillWidth: true
            color: theme.bgCard
            border.color: theme.accentCyan
            border.width: 1
            radius: theme.radiusSm

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 12
                spacing: 8

                Text {
                    text: "FORENSIC VISUAL DECONSTRUCTION"
                    color: theme.accentCyan
                    font.pixelSize: 11
                    font.bold: true
                }

                Text {
                    id: findingsText
                    Layout.fillWidth: true
                    wrapMode: Text.WordWrap
                    color: theme.textMuted
                    font.pixelSize: 11
                    lineHeight: 1.5
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8
                    Item { Layout.fillWidth: true }

                    Button {
                        text: "🔄 New Scan"
                        flat: true
                        contentItem: Text { text: parent.text; color: theme.accentCyan; font.pixelSize: 11; font.bold: true }
                        onClicked: root.clearSelection()
                    }

                    Button {
                        id: forgeFromScanBtn
                        text: "⚡ Forge Character from Scan"
                        enabled: bridge.backendConnected
                        onClicked: {
                            // Emit signal with scanned data to parent
                            root.requestForgeFromScan(findingsData)
                        }
                        background: Rectangle {
                            radius: theme.radiusSm
                            color: forgeFromScanBtn.hovered ? "#059669" : "#0d9488"
                            border.color: "#34d399"
                        }
                        contentItem: Text { text: parent.text; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
                    }
                }
            }
        }
    }

    Connections {
        target: bridge
        function onVisionScanFinished(data) {
            root.isScanning = false
            root.scanBtn.enabled = true
            if (data && Object.keys(data).length > 0) {
                root.findingsData = data
                var lines = []
                for (var key in data) {
                    if (data[key]) {
                        var label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ")
                        lines.push("<b>" + label + ":</b> " + data[key])
                    }
                }
                root.findingsText.text = lines.join("<br/>")
                root.findingsBox.visible = true
            }
        }
        function onErrorOccurred(msg) {
            root.isScanning = false
            root.scanBtn.enabled = true
        }
        function onNotification(msg) {
            if (msg.indexOf("Vision") >= 0) {
                root.findingsBox.visible = true
            }
        }
    }

    property var findingsData: {}

    FileDialog {
        id: fileDialog
        fileMode: FileDialog.OpenFile
        nameFilters: ["Image files (*.png *.jpg *.jpeg *.webp)"]
        onAccepted: {
            if (fileDialog.fileUrls.length > 0) {
                root.selectedImageUrl = fileDialog.fileUrls[0].toLocalFile()
            }
        }
    }
}