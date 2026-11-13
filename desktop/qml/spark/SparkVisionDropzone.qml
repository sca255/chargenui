import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Rectangle {
    id: root
    Layout.fillWidth: true
    implicitHeight: attachedImage ? 76 : 42
    radius: theme.radiusSm
    color: sparkVisionDropArea.containsDrag ? theme.withAlpha(theme.accentCyan, 0.2) : (attachedImage ? theme.withAlpha(theme.accentCyan, 0.1) : theme.bgInput)
    border.color: attachedImage ? theme.accentCyan : (sparkVisionDropArea.containsDrag ? theme.accentCyan : theme.borderMain)
    border.width: attachedImage ? 1.5 : 1

    property var theme
    property string attachedImage: ""

    signal imageChanged(string path)
    signal zoomRequested(string path)
    signal browseRequested()

    DropArea {
        id: sparkVisionDropArea
        anchors.fill: parent
        onDropped: function(drop) {
            if (drop.hasUrls && drop.urls.length > 0) {
                var u = drop.urls[0];
                var p = (u.isLocalFile || String(u).startsWith("file:")) ? (u.toLocalFile ? u.toLocalFile() : String(u)) : String(u);
                root.imageChanged(p);
            }
        }
    }

    RowLayout {
        anchors.fill: parent
        anchors.margins: 6
        spacing: 10

        // Preview thumbnail or icon
        Rectangle {
            id: sparkThumbBox
            width: root.attachedImage ? 64 : 28
            height: root.attachedImage ? 64 : 28
            radius: root.theme.radiusSm
            color: root.theme.bgSecondary
            clip: true
            border.color: sparkThumbMa.containsMouse ? root.theme.accentCyan : (root.attachedImage ? root.theme.accentCyan : root.theme.borderMain)
            border.width: sparkThumbMa.containsMouse ? 2 : 1

            Image {
                anchors.fill: parent
                source: root.attachedImage ? (String(root.attachedImage).startsWith("file:") ? root.attachedImage : ("file://" + root.attachedImage)) : ""
                fillMode: Image.PreserveAspectCrop
                visible: root.attachedImage.length > 0
            }

            Rectangle {
                anchors.fill: parent
                color: "#80000000"
                visible: root.attachedImage.length > 0 && sparkThumbMa.containsMouse
                Text {
                    anchors.centerIn: parent
                    text: "🔍"
                    font.pixelSize: 16
                }
            }

            Text {
                anchors.centerIn: parent
                text: "📷"
                font.pixelSize: 14
                visible: !root.attachedImage
            }

            MouseArea {
                id: sparkThumbMa
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: root.attachedImage ? Qt.PointingHandCursor : Qt.ArrowCursor
                onClicked: {
                    if (root.attachedImage) {
                        root.zoomRequested(root.attachedImage);
                    }
                }
            }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 2

            RowLayout {
                spacing: 6
                Text {
                    text: root.attachedImage ? "👁️ Visual Reference Attached" : "Character Portrait / Concept Art (Optional)"
                    font.bold: true
                    font.pixelSize: 11
                    color: root.attachedImage ? root.theme.accentCyan : root.theme.textMain
                }
            }

            Text {
                text: root.attachedImage ? (String(root.attachedImage).split("/").pop()) : "Drag & drop portrait art here, or click Browse"
                font.pixelSize: 10
                color: root.attachedImage ? root.theme.accentCyan : root.theme.textMuted
                elide: Text.ElideMiddle
                Layout.fillWidth: true
            }
        }

        // Browse button
        Button {
            text: root.attachedImage ? "Change" : "Browse"
            implicitHeight: 28
            background: Rectangle {
                radius: root.theme.radiusSm
                color: parent.hovered ? root.theme.bgHover : root.theme.bgTertiary
                border.color: root.theme.borderMain
            }
            contentItem: Text {
                text: parent.text
                color: root.theme.textMain
                font.pixelSize: 10
                font.bold: true
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: root.browseRequested()
        }

        // Remove button if attached
        Button {
            text: "✕"
            visible: root.attachedImage.length > 0
            implicitHeight: 28
            implicitWidth: 28
            background: Rectangle {
                radius: root.theme.radiusSm
                color: parent.hovered ? "#991b1b" : "#7f1d1d"
            }
            contentItem: Text {
                text: parent.text
                color: "#fecaca"
                font.pixelSize: 11
                font.bold: true
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: root.imageChanged("")
        }
    }

    MouseArea {
        anchors.fill: parent
        z: -1
        cursorShape: Qt.PointingHandCursor
        onClicked: if (!root.attachedImage) root.browseRequested()
    }
}
