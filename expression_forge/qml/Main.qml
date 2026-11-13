import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Dialogs

ApplicationWindow {
    id: appWindow
    visible: true
    width: 1100
    height: 780
    minimumWidth: 850
    minimumHeight: 600
    title: "CharGen Expression Forge (Img2Img Facial Variant Studio)"
    color: "#0f172a"

    // Exposed backend bridge
    // backend is injected from PySide6

    header: ToolBar {
        background: Rectangle {
            color: "#1e293b"
            border.color: "#334155"
            border.width: 1
        }
        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 12
            anchors.rightMargin: 12
            spacing: 12

            Label {
                text: "🎭 CharGen Expression Forge"
                font.bold: true
                font.pixelSize: 15
                color: "#38bdf8"
            }

            Rectangle { width: 1; height: 20; color: "#334155" }

            Label {
                text: "Zero-LLM Fast Img2Img Facial Variant Generator"
                font.pixelSize: 12
                color: "#94a3b8"
            }

            Item { Layout.fillWidth: true }

            Label {
                text: "Engine:"
                font.pixelSize: 11
                color: "#94a3b8"
            }

            ComboBox {
                id: engineModeBox
                implicitWidth: 200
                font.pixelSize: 11
                model: ["sd.cpp Server (Persistent RAM)", "ComfyUI (img2img)"]
                currentIndex: (backend && backend.engineMode === "comfy") ? 1 : 0
                onActivated: function(index) {
                    if (backend) backend.engineMode = (index === 1) ? "comfy" : "sdcpp_server"
                }
            }

            Rectangle { width: 1; height: 16; color: "#334155" }

            // sd.cpp server URL bar
            RowLayout {
                visible: engineModeBox.currentIndex === 0
                spacing: 6
                Label {
                    text: "sd.cpp URL:"
                    font.pixelSize: 11
                    color: "#38bdf8"
                }
                TextField {
                    id: sdServerUrlField
                    text: backend ? backend.sdServerUrl : "http://127.0.0.1:8080"
                    font.pixelSize: 11
                    implicitWidth: 160
                    onEditingFinished: if (backend) backend.sdServerUrl = text
                }
            }

            // ComfyUI URL bar
            RowLayout {
                visible: engineModeBox.currentIndex === 1
                spacing: 6
                Label {
                    text: "ComfyUI:"
                    font.pixelSize: 11
                    color: "#94a3b8"
                }
                TextField {
                    id: serverUrlField
                    text: backend ? backend.comfyUrl : "http://127.0.0.1:8188"
                    font.pixelSize: 11
                    implicitWidth: 150
                    onEditingFinished: if (backend) backend.comfyUrl = text
                }
                Button {
                    text: "Check"
                    font.pixelSize: 11
                    onClicked: if (backend) backend.checkConnection()
                }
            }
        }
    }

    RowLayout {
        anchors.fill: parent
        anchors.margins: 14
        spacing: 14

        // LEFT COLUMN: Source Avatar & Configuration
        Rectangle {
            Layout.preferredWidth: 360
            Layout.fillHeight: true
            color: "#1e293b"
            radius: 8
            border.color: "#334155"

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 12
                spacing: 10

                Label {
                    text: "1. Base Character Avatar"
                    font.bold: true
                    font.pixelSize: 13
                    color: "#f8fafc"
                }

                // Image Preview / Drop Target
                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 220
                    color: "#0f172a"
                    radius: 6
                    border.color: "#334155"
                    clip: true

                    Image {
                        id: sourceAvatarImg
                        anchors.fill: parent
                        anchors.margins: 4
                        fillMode: Image.PreserveAspectFit
                        source: backend ? backend.sourceImagePath : ""
                    }

                    ColumnLayout {
                        anchors.centerIn: parent
                        visible: !sourceAvatarImg.source || sourceAvatarImg.status !== Image.Ready
                        spacing: 6

                        Label {
                            text: "🖼️ Drop Avatar or Load File"
                            color: "#64748b"
                            font.pixelSize: 12
                            Layout.alignment: Qt.AlignHCenter
                        }
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: fileDialog.open()
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    Button {
                        Layout.fillWidth: true
                        text: "📁 Browse Image"
                        onClicked: fileDialog.open()
                    }
                    Button {
                        text: "🔄 Sync Active Card"
                        onClicked: if (backend) backend.syncFromCharGen()
                    }
                }

                Rectangle { Layout.fillWidth: true; height: 1; color: "#334155" }

                Label {
                    text: "2. Prompt & Model"
                    font.bold: true
                    font.pixelSize: 13
                    color: "#f8fafc"
                }

                // Info banner for sd.cpp server mode
                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 38
                    visible: engineModeBox.currentIndex === 0
                    color: "#0c4a6e"
                    radius: 4
                    border.color: "#0284c7"
                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 6
                        Label {
                            text: "💡 Model permanently resident in RAM/VRAM on sd.cpp server (Zero disk reloads)"
                            font.pixelSize: 10
                            color: "#e0f2fe"
                            wrapMode: Text.Wrap
                            Layout.fillWidth: true
                        }
                    }
                }

                // ComfyUI Checkpoint selector (Visible in comfy mode)
                ColumnLayout {
                    Layout.fillWidth: true
                    visible: engineModeBox.currentIndex === 1
                    spacing: 4
                    Label { text: "ComfyUI Checkpoint:"; font.pixelSize: 11; color: "#94a3b8" }
                    ComboBox {
                        id: checkpointBox
                        Layout.fillWidth: true
                        model: backend ? backend.checkpoints : []
                        editable: true
                    }
                }

                Label { text: "Base Character Tags:"; font.pixelSize: 11; color: "#94a3b8" }
                TextArea {
                    id: basePromptInput
                    Layout.fillWidth: true
                    Layout.preferredHeight: 65
                    font.pixelSize: 11
                    color: "#f8fafc"
                    wrapMode: Text.Wrap
                    placeholderText: "1girl, silver hair, ponytail, blue eyes, upper body portrait..."
                    background: Rectangle { color: "#0f172a"; radius: 4; border.color: "#334155" }
                }

                Label { text: "Denoising Strength (Identity Lock):"; font.pixelSize: 11; color: "#94a3b8" }
                RowLayout {
                    Layout.fillWidth: true
                    Slider {
                        id: denoiseSlider
                        Layout.fillWidth: true
                        from: 0.20
                        to: 0.60
                        stepSize: 0.01
                        value: 0.38
                    }
                    Label {
                        text: denoiseSlider.value.toFixed(2)
                        font.bold: true
                        font.pixelSize: 12
                        color: "#38bdf8"
                    }
                }

                Item { Layout.fillHeight: true }

                Button {
                    Layout.fillWidth: true
                    text: "🚀 Generate Selected Expressions"
                    font.bold: true
                    font.pixelSize: 12
                    highlighted: true
                    enabled: backend ? !backend.isGenerating : true
                    onClicked: {
                        if (backend) {
                            backend.generateSelected(
                                checkpointBox.currentText,
                                basePromptInput.text,
                                denoiseSlider.value
                            )
                        }
                    }
                }
            }
        }

        // RIGHT COLUMN: Expression Matrix Grid & Output Gallery
        Rectangle {
            Layout.fillWidth: true
            Layout.fillHeight: true
            color: "#1e293b"
            radius: 8
            border.color: "#334155"

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 12
                spacing: 10

                RowLayout {
                    Layout.fillWidth: true
                    Label {
                        text: "3. Expression Preset Selection"
                        font.bold: true
                        font.pixelSize: 13
                        color: "#f8fafc"
                    }
                    Item { Layout.fillWidth: true }
                    Button {
                        text: "Select All"
                        font.pixelSize: 11
                        onClicked: if (backend) backend.selectAllExpressions(true)
                    }
                    Button {
                        text: "Deselect All"
                        font.pixelSize: 11
                        onClicked: if (backend) backend.selectAllExpressions(false)
                    }
                }

                // Grid of Expressions
                ScrollView {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 180
                    clip: true

                    Flow {
                        width: parent.width
                        spacing: 8

                        Repeater {
                            model: backend ? backend.expressionList : []
                            delegate: Rectangle {
                                width: 140
                                height: 36
                                radius: 4
                                color: modelData.selected ? "#0369a1" : "#0f172a"
                                border.color: modelData.selected ? "#38bdf8" : "#334155"

                                RowLayout {
                                    anchors.fill: parent
                                    anchors.margins: 6
                                    spacing: 6

                                    CheckBox {
                                        checked: modelData.selected
                                        onToggled: if (backend) backend.toggleExpression(modelData.key, checked)
                                    }

                                    Label {
                                        text: modelData.label
                                        font.pixelSize: 11
                                        font.bold: modelData.selected
                                        color: modelData.selected ? "#f8fafc" : "#94a3b8"
                                        Layout.fillWidth: true
                                        elide: Text.ElideRight
                                    }
                                }

                                MouseArea {
                                    anchors.fill: parent
                                    onClicked: if (backend) backend.toggleExpression(modelData.key, !modelData.selected)
                                }
                            }
                        }
                    }
                }

                Rectangle { Layout.fillWidth: true; height: 1; color: "#334155" }

                RowLayout {
                    Layout.fillWidth: true
                    Label {
                        text: "Generated Expression Gallery"
                        font.bold: true
                        font.pixelSize: 13
                        color: "#f8fafc"
                    }
                    Item { Layout.fillWidth: true }
                    Label {
                        text: backend ? backend.statusMessage : ""
                        font.pixelSize: 11
                        color: "#38bdf8"
                    }
                }

                // Results Grid
                GridView {
                    id: resultsGrid
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true
                    cellWidth: 160
                    cellHeight: 200
                    model: backend ? backend.generatedResults : []

                    delegate: Rectangle {
                        width: 150
                        height: 190
                        radius: 6
                        color: "#0f172a"
                        border.color: "#334155"

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 6
                            spacing: 4

                            Image {
                                Layout.fillWidth: true
                                Layout.fillHeight: true
                                fillMode: Image.PreserveAspectCrop
                                source: modelData.imagePath
                            }

                            Label {
                                text: modelData.label
                                font.pixelSize: 11
                                font.bold: true
                                color: "#38bdf8"
                                Layout.alignment: Qt.AlignHCenter
                            }

                            Button {
                                Layout.fillWidth: true
                                text: "Send to Card"
                                font.pixelSize: 10
                                onClicked: if (backend) backend.sendToCard(modelData.key, modelData.imagePath)
                            }
                        }
                    }
                }
            }
        }
    }

    FileDialog {
        id: fileDialog
        title: "Select Character Avatar Image"
        nameFilters: ["Image files (*.png *.jpg *.jpeg *.webp)"]
        onAccepted: {
            if (backend && selectedFile) {
                var path = selectedFile.toString().replace("file://", "")
                backend.setSourceImage(path)
            }
        }
    }

    FileDialog {
        id: modelFileDialog
        title: "Select Model Checkpoint for sd.cpp"
        nameFilters: ["Diffusion Models (*.safetensors *.ckpt *.gguf *.bin)", "All files (*)"]
        onAccepted: {
            if (backend && selectedFile) {
                var path = selectedFile.toString().replace("file://", "")
                backend.sdModelPath = path
            }
        }
    }
}
