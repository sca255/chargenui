import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

RowLayout {
id: studioWorkspaceView
            visible: root.currentTab === 0
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.alignment: Qt.AlignTop
            Layout.minimumHeight: 0
            spacing: 0

            // ------------------------------------------
            // LEFT COLUMN: CONTROLS & GENERATOR
            // ------------------------------------------
            Rectangle {
                Layout.preferredWidth: 430
                Layout.fillHeight: true
                color: "#0f172a"
                border.color: "#1e293b"
                border.width: 1

                ScrollView {
                    anchors.fill: parent
                    contentWidth: availableWidth
                    clip: true

                    ColumnLayout {
                        width: parent.width
                        spacing: 16
                        anchors.margins: 18

                        // Header
                        Text {
                            text: "Character Generator Setup"
                            font.bold: true
                            font.pixelSize: 15
                            color: "#f8fafc"
                        }

                        // Presets Row
                        Text {
                            text: "QUICK ARCHETYPE PRESETS"
                            font.bold: true
                            font.pixelSize: 11
                            color: "#a78bfa"
                        }

                        Flow {
                            Layout.fillWidth: true
                            spacing: 6

                            Repeater {
                                model: [
                                    { "name": "Rowena (Domestic Brat)", "genre": "Modern Domestic / Slice of Life", "dynamic": "Domestic Discipline & Brat Taming", "intensity": "mild", "tropes": ["Brat / Brat Tamer", "Domestic Discipline", "Married Couple", "Spanking"] },
                                    { "name": "Clara (Mischievous Wife)", "genre": "Modern Slice of Life", "dynamic": "Domestic Discipline & Playful Defiance", "intensity": "mild", "tropes": ["Brat / Brat Tamer", "Domestic Discipline", "Married Couple", "Aftercare"] },
                                    { "name": "Darcy (Bistro Chef)", "genre": "Modern Slice of Life", "dynamic": "Kitchen Brat & Over-The-Knee Discipline", "intensity": "mild", "tropes": ["Chef Wife", "Domestic Discipline", "Married Couple"] },
                                    { "name": "Dr. Valerie (Surgeon Wife)", "genre": "Modern Domestic / High Stakes", "dynamic": "Enforced Rest & Strict Bedtime Discipline", "intensity": "medium", "tropes": ["Overworked Surgeon", "Domestic Discipline", "Strict Rules"] },
                                    { "name": "Julianna (Overworked Surrender)", "genre": "Modern Slice of Life", "dynamic": "Overworked Surrender & Restraint", "intensity": "heavy", "tropes": ["Overworked Wife", "Rope Bondage", "Sensory Deprivation", "Aftercare"] },
                                    { "name": "Lady Vivienne (Gothic Consort)", "genre": "Victorian / Gothic Romance", "dynamic": "Arranged Marriage Protocol", "intensity": "heavy", "tropes": ["Arranged Marriage", "Noblewoman", "Chamber Protocols", "Possessive"] },
                                    { "name": "Mara (Cabin Homesteader)", "genre": "Low-Fantasy / Cabin", "dynamic": "Protective Dominance & Reluctant Sub", "intensity": "medium", "tropes": ["Frontier / Cabin", "Domestic Authority", "Tactile", "Stubborn Wife"] },
                                    { "name": "Tessa (Sarcastic Mechanic)", "genre": "Cyberpunk / Gritty Sci-Fi", "dynamic": "Workbench Discipline & Brat Taming", "intensity": "medium", "tropes": ["Mechanic Wife", "Workplace Friction", "Possessive", "Brat Tamer"] },
                                    { "name": "Sylvie (Overthinking Scholar)", "genre": "Dark Academia / Fantasy", "dynamic": "Intellectual Brat & Lap Discipline", "intensity": "mild", "tropes": ["Scholar Wife", "Domestic Discipline", "Aftercare", "High-IQ Brat"] },
                                    { "name": "Elena (Starship Commander)", "genre": "Sci-Fi / Space Opera", "dynamic": "Role Reversal & Quarters Surrender", "intensity": "heavy", "tropes": ["Commander Wife", "Role Reversal", "Strict Chamber Rules", "Power Exchange"] }
                                ]

                                Rectangle {
                                    height: 28
                                    implicitWidth: presetLabel.implicitWidth + 18
                                    radius: 14
                                    color: presetMouse.containsMouse ? "#312e81" : "#1e1b4b"
                                    border.color: "#6366f1"
                                    border.width: 1

                                    Text {
                                        id: presetLabel
                                        anchors.centerIn: parent
                                        text: modelData.name
                                        font.pixelSize: 11
                                        color: "#e0e7ff"
                                    }

                                    MouseArea {
                                        id: presetMouse
                                        anchors.fill: parent
                                        hoverEnabled: true
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            genreCombo.currentText = modelData.genre;
                                            dynamicInput.text = modelData.dynamic;
                                            tropesInput.text = modelData.tropes.join(", ");
                                            if (modelData.intensity) {
                                                root.selectedIntensity = modelData.intensity;
                                            }
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.toast("Applied preset: " + modelData.name);
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // ==========================================
                        // FEATURE 2A: POWER DYNAMIC & CORRECTION DIAL (WITH OFF SWITCH)
                        // ==========================================
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "⚡ DYNAMIC & CORRECTION DIAL"
                                    font.bold: true
                                    font.pixelSize: 11
                                    color: root.correctionColor(root.selectedCorrectionTier)
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: root.correctionTitle(root.selectedCorrectionTier)
                                    font.pixelSize: 10
                                    font.bold: true
                                    color: root.correctionColor(root.selectedCorrectionTier)
                                }
                            }

                            // Row 1: Mode & Any Selectors
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                // Option 1: Off Switch
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedCorrectionTier === "off" ? "#334155" : "#0f172a"
                                    border.color: root.selectedCorrectionTier === "off" ? "#94a3b8" : "#1e293b"
                                    border.width: root.selectedCorrectionTier === "off" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🚫 Off"
                                        font.bold: root.selectedCorrectionTier === "off"
                                        font.pixelSize: 10
                                        color: root.selectedCorrectionTier === "off" ? "#ffffff" : "#64748b"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedCorrectionTier = "off"
                                    }
                                }

                                // Option 2: Any:R (Random 1 of 3)
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: (root.selectedCorrectionTier === "any:r" || root.selectedCorrectionTier === "any_r") ? "#0369a1" : "#082f49"
                                    border.color: (root.selectedCorrectionTier === "any:r" || root.selectedCorrectionTier === "any_r") ? "#38bdf8" : "#0c4a6e"
                                    border.width: (root.selectedCorrectionTier === "any:r" || root.selectedCorrectionTier === "any_r") ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🎲 Any:R"
                                        font.bold: (root.selectedCorrectionTier === "any:r" || root.selectedCorrectionTier === "any_r")
                                        font.pixelSize: 10
                                        color: (root.selectedCorrectionTier === "any:r" || root.selectedCorrectionTier === "any_r") ? "#ffffff" : "#7dd3fc"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedCorrectionTier = "any:r"
                                    }
                                }

                                // Option 3: Any:AI (AI Choice / No Prompt)
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: (root.selectedCorrectionTier === "any:ai" || root.selectedCorrectionTier === "any_ai") ? "#4c1d95" : "#2e1065"
                                    border.color: (root.selectedCorrectionTier === "any:ai" || root.selectedCorrectionTier === "any_ai") ? "#a78bfa" : "#3b0764"
                                    border.width: (root.selectedCorrectionTier === "any:ai" || root.selectedCorrectionTier === "any_ai") ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "✨ Any:AI"
                                        font.bold: (root.selectedCorrectionTier === "any:ai" || root.selectedCorrectionTier === "any_ai")
                                        font.pixelSize: 10
                                        color: (root.selectedCorrectionTier === "any:ai" || root.selectedCorrectionTier === "any_ai") ? "#ffffff" : "#d8b4fe"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedCorrectionTier = "any:ai"
                                    }
                                }
                            }

                            // Row 2: Explicit Tiers
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                // Option 4: Mild
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedCorrectionTier === "mild" ? "#831843" : "#2a0826"
                                    border.color: root.selectedCorrectionTier === "mild" ? "#f472b6" : "#4c0519"
                                    border.width: root.selectedCorrectionTier === "mild" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🌸 Mild"
                                        font.bold: root.selectedCorrectionTier === "mild"
                                        font.pixelSize: 10
                                        color: root.selectedCorrectionTier === "mild" ? "#ffffff" : "#fbcfe8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedCorrectionTier = "mild"
                                    }
                                }

                                // Option 5: Correction
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: (root.selectedCorrectionTier === "correction" || root.selectedCorrectionTier === "medium") ? "#581c87" : "#1c0b38"
                                    border.color: (root.selectedCorrectionTier === "correction" || root.selectedCorrectionTier === "medium") ? "#c084fc" : "#4c1d95"
                                    border.width: (root.selectedCorrectionTier === "correction" || root.selectedCorrectionTier === "medium") ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "⚖️ Correction"
                                        font.bold: (root.selectedCorrectionTier === "correction" || root.selectedCorrectionTier === "medium")
                                        font.pixelSize: 10
                                        color: (root.selectedCorrectionTier === "correction" || root.selectedCorrectionTier === "medium") ? "#ffffff" : "#e9d5ff"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedCorrectionTier = "correction"
                                    }
                                }

                                // Option 6: Heavy
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedCorrectionTier === "heavy" ? "#7f1d1d" : "#300808"
                                    border.color: root.selectedCorrectionTier === "heavy" ? "#ef4444" : "#991b1b"
                                    border.width: root.selectedCorrectionTier === "heavy" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🔥 Heavy"
                                        font.bold: root.selectedCorrectionTier === "heavy"
                                        font.pixelSize: 10
                                        color: root.selectedCorrectionTier === "heavy" ? "#ffffff" : "#fca5a5"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedCorrectionTier = "heavy"
                                    }
                                }
                            }
                        }

                        // ==========================================
                        // FEATURE 2B: DRAMATIC & EMOTIONAL STAKES DIAL
                        // ==========================================
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "🎭 DRAMATIC & EMOTIONAL STAKES"
                                    font.bold: true
                                    font.pixelSize: 11
                                    color: root.intensityColor(root.selectedIntensity)
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: root.intensityTitle(root.selectedIntensity)
                                    font.pixelSize: 10
                                    font.bold: true
                                    color: root.intensityColor(root.selectedIntensity)
                                }
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                // Option 1: Any
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedIntensity === "any" ? "#312e81" : "#1e1b4b"
                                    border.color: root.selectedIntensity === "any" ? "#818cf8" : "#3730a3"
                                    border.width: root.selectedIntensity === "any" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "✨ Any"
                                        font.bold: root.selectedIntensity === "any"
                                        font.pixelSize: 10
                                        color: root.selectedIntensity === "any" ? "#ffffff" : "#c7d2fe"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedIntensity = "any"
                                    }
                                }

                                // Option 2: Low Stakes
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedIntensity === "mild" ? "#831843" : "#2a0826"
                                    border.color: root.selectedIntensity === "mild" ? "#f472b6" : "#4c0519"
                                    border.width: root.selectedIntensity === "mild" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🌸 Low"
                                        font.bold: root.selectedIntensity === "mild"
                                        font.pixelSize: 10
                                        color: root.selectedIntensity === "mild" ? "#ffffff" : "#fbcfe8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedIntensity = "mild"
                                    }
                                }

                                // Option 3: Med
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedIntensity === "medium" ? "#581c87" : "#1c0b38"
                                    border.color: root.selectedIntensity === "medium" ? "#c084fc" : "#4c1d95"
                                    border.width: root.selectedIntensity === "medium" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "⚖️ Med"
                                        font.bold: root.selectedIntensity === "medium"
                                        font.pixelSize: 10
                                        color: root.selectedIntensity === "medium" ? "#ffffff" : "#e9d5ff"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedIntensity = "medium"
                                    }
                                }

                                // Option 4: High Stakes
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedIntensity === "heavy" ? "#7f1d1d" : "#300808"
                                    border.color: root.selectedIntensity === "heavy" ? "#ef4444" : "#991b1b"
                                    border.width: root.selectedIntensity === "heavy" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🔥 High"
                                        font.bold: root.selectedIntensity === "heavy"
                                        font.pixelSize: 10
                                        color: root.selectedIntensity === "heavy" ? "#ffffff" : "#fca5a5"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedIntensity = "heavy"
                                    }
                                }
                            }
                        }

                        // Local LLM Endpoint Config
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "llama-server API Endpoint (Saved in config.json)"
                                    font.pixelSize: 12
                                    color: "#94a3b8"
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: "Default: :5001"
                                    font.pixelSize: 10
                                    color: "#a78bfa"
                                }
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 6

                                TextField {
                                    id: endpointField
                                    Layout.fillWidth: true
                                    text: (typeof backend !== "undefined" && backend && backend.endpointUrl) ? backend.endpointUrl : "http://localhost:5001/v1"
                                    placeholderText: "e.g. http://localhost:5001/v1 or :8080/v1"
                                    color: "#f8fafc"
                                    background: Rectangle {
                                        color: "#1e293b"
                                        radius: 6
                                        border.color: endpointField.activeFocus ? "#8b5cf6" : "#334155"
                                    }
                                    onEditingFinished: if (typeof backend !== "undefined" && backend) backend.updateEndpoint(text)
                                }

                                Button {
                                    id: saveEndpointBtn
                                    width: 60
                                    height: endpointField.height
                                    background: Rectangle {
                                        radius: 6
                                        color: saveEndpointBtn.hovered ? "#4f46e5" : "#4338ca"
                                    }
                                    contentItem: Text {
                                        anchors.centerIn: parent
                                        text: "Save"
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#ffffff"
                                    }
                                    onClicked: if (typeof backend !== "undefined" && backend) backend.updateEndpoint(endpointField.text)
                                }
                            }
                        }

                        // CharGenUI IPC Bridge Config
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "CharGenUI IPC Bridge (:3333)"
                                    font.pixelSize: 12
                                    color: "#94a3b8"
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: root.isCharGenOnline ? "Connected" : "Standby"
                                    font.pixelSize: 10
                                    color: root.isCharGenOnline ? "#10b981" : "#94a3b8"
                                }
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 6

                                TextField {
                                    id: chargenUrlField
                                    Layout.fillWidth: true
                                    text: (typeof backend !== "undefined" && backend && backend.charGenUrl) ? backend.charGenUrl : "http://localhost:3333"
                                    placeholderText: "http://localhost:3333"
                                    color: "#f8fafc"
                                    background: Rectangle {
                                        color: "#1e293b"
                                        radius: 6
                                        border.color: chargenUrlField.activeFocus ? "#10b981" : "#334155"
                                    }
                                    onEditingFinished: if (typeof backend !== "undefined" && backend) backend.updateCharGenUrl(text)
                                }

                                Button {
                                    id: saveChargenBtn
                                    width: 70
                                    height: chargenUrlField.height
                                    background: Rectangle {
                                        radius: 6
                                        color: saveChargenBtn.hovered ? "#059669" : "#047857"
                                    }
                                    contentItem: Text {
                                        anchors.centerIn: parent
                                        text: "Connect"
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#ffffff"
                                    }
                                    onClicked: if (typeof backend !== "undefined" && backend) backend.updateCharGenUrl(chargenUrlField.text)
                                }
                            }
                        }

                        // Genre Dropdown
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            Text {
                                text: "Genre / Setting"
                                font.pixelSize: 12
                                color: "#94a3b8"
                            }

                            ComboBox {
                                id: genreCombo
                                Layout.fillWidth: true
                                model: [
                                    "Modern Domestic / Slice of Life",
                                    "Victorian / Gothic Romance",
                                    "Dark Fantasy / Kingdom",
                                    "Frontier / Cabin Homesteader",
                                    "Sci-Fi / Space Opera",
                                    "Cyberpunk / Gritty Underworld"
                                ]
                                currentIndex: 0
                                background: Rectangle {
                                    color: "#1e293b"
                                    radius: 6
                                    border.color: "#334155"
                                }
                            }
                        }

                        // ==========================================
                        // FEATURE: HISTORIC TIME & FANTASY TIME SELECTOR
                        // ==========================================
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "⏳ ERA & HISTORICAL TIMELINE"
                                    font.bold: true
                                    font.pixelSize: 11
                                    color: root.eraColor(root.selectedEra)
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: root.eraBadgeLabel(root.selectedEra)
                                    font.pixelSize: 10
                                    font.bold: true
                                    color: root.eraColor(root.selectedEra)
                                }
                            }

                            // 4-Button Mode Selector: Off | Timeless Fantasy | Historic | User Eras
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                // 1. Off Button
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 28
                                    radius: 6
                                    color: root.selectedEra === "off" ? "#334155" : "#0f172a"
                                    border.color: root.selectedEra === "off" ? "#94a3b8" : "#1e293b"
                                    border.width: root.selectedEra === "off" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🚫 Off"
                                        font.bold: root.selectedEra === "off"
                                        font.pixelSize: 10
                                        color: root.selectedEra === "off" ? "#ffffff" : "#64748b"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedEra = "off"
                                    }
                                }

                                // 2. Fantasy Eras Button
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 28
                                    radius: 6
                                    color: root.isFantasyEra(root.selectedEra) ? "#581c87" : "#1e1b4b"
                                    border.color: root.isFantasyEra(root.selectedEra) ? "#c084fc" : "#4338ca"
                                    border.width: root.isFantasyEra(root.selectedEra) ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🌌 Fantasy"
                                        font.bold: root.isFantasyEra(root.selectedEra)
                                        font.pixelSize: 10
                                        color: root.isFantasyEra(root.selectedEra) ? "#ffffff" : "#c084fc"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            if (!root.isFantasyEra(root.selectedEra)) {
                                                root.selectedEra = "timeless_fantasy";
                                            }
                                            eraPickerModal.openModal("Fantasy", "");
                                        }
                                    }
                                }

                                // 3. Historic Eras Button
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 28
                                    radius: 6
                                    color: (root.selectedEra !== "off" && !root.isFantasyEra(root.selectedEra) && !root.isUserEra(root.selectedEra)) ? "#b45309" : "#451a03"
                                    border.color: (root.selectedEra !== "off" && !root.isFantasyEra(root.selectedEra) && !root.isUserEra(root.selectedEra)) ? "#f59e0b" : "#78350f"
                                    border.width: (root.selectedEra !== "off" && !root.isFantasyEra(root.selectedEra) && !root.isUserEra(root.selectedEra)) ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🏛️ Historic"
                                        font.bold: (root.selectedEra !== "off" && !root.isFantasyEra(root.selectedEra) && !root.isUserEra(root.selectedEra))
                                        font.pixelSize: 10
                                        color: (root.selectedEra !== "off" && !root.isFantasyEra(root.selectedEra) && !root.isUserEra(root.selectedEra)) ? "#ffffff" : "#fcd34d"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            if (root.selectedEra === "off" || root.isFantasyEra(root.selectedEra) || root.isUserEra(root.selectedEra)) {
                                                root.selectedEra = "medieval_high_plantagenet";
                                            }
                                            eraPickerModal.openModal("Medieval", "");
                                        }
                                    }
                                }

                                // 4. User Eras Button (4th Selector)
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 28
                                    radius: 6
                                    color: root.isUserEra(root.selectedEra) ? "#065f46" : "#064e3b"
                                    border.color: root.isUserEra(root.selectedEra) ? "#34d399" : "#047857"
                                    border.width: root.isUserEra(root.selectedEra) ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "✏️ User Eras"
                                        font.bold: root.isUserEra(root.selectedEra)
                                        font.pixelSize: 10
                                        color: root.isUserEra(root.selectedEra) ? "#ffffff" : "#a7f3d0"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            eraPickerModal.openModal("User Eras", "", true);
                                        }
                                    }
                                }
                            }

                            // Dedicated Era Search / Discovery Trigger Button
                            Rectangle {
                                Layout.fillWidth: true
                                height: 32
                                radius: 6
                                color: browseMouseForge.containsMouse ? "#1e293b" : "#090d16"
                                border.color: root.isUserEra(root.selectedEra) ? "#10b981" : (root.isFantasyEra(root.selectedEra) ? "#a855f7" : "#f59e0b")
                                border.width: 1

                                RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 6
                                    Text {
                                        text: "🔍"
                                        font.pixelSize: 11
                                    }
                                    Text {
                                        text: root.selectedEra === "off" ? "Browse & Search 90+ Eras (Historical & Fantasy)..." : ("Search / Change Era (" + (root.getEraData(root.selectedEra) ? root.getEraData(root.selectedEra).short_name : "Era") + ")")
                                        font.pixelSize: 11
                                        font.bold: true
                                        color: root.isUserEra(root.selectedEra) ? "#34d399" : (root.isFantasyEra(root.selectedEra) ? "#c084fc" : "#fcd34d")
                                        elide: Text.ElideRight
                                    }
                                }

                                MouseArea {
                                    id: browseMouseForge
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        if (root.isUserEra(root.selectedEra)) {
                                            eraPickerModal.openModal("User Eras", "", true);
                                        } else if (root.isFantasyEra(root.selectedEra)) {
                                            eraPickerModal.openModal("Fantasy", "");
                                        } else {
                                            eraPickerModal.openModal("All", "");
                                        }
                                    }
                                }
                            }

                            // Detailed Era Dossier Preview Card
                            Rectangle {
                                Layout.fillWidth: true
                                implicitHeight: eraDossierCol.implicitHeight + 16
                                radius: 8
                                visible: root.selectedEra !== "off"
                                color: root.isUserEra(root.selectedEra) ? "#022c22" : (root.isFantasyEra(root.selectedEra) ? "#240a34" : "#1c1408")
                                border.color: root.isUserEra(root.selectedEra) ? "#10b981" : (root.isFantasyEra(root.selectedEra) ? "#a855f7" : "#b45309")
                                border.width: 1

                                ColumnLayout {
                                    id: eraDossierCol
                                    anchors.fill: parent
                                    anchors.margins: 8
                                    spacing: 4

                                    RowLayout {
                                        Layout.fillWidth: true
                                        Text {
                                            Layout.fillWidth: true
                                            text: root.getEraData(root.selectedEra) ? root.getEraData(root.selectedEra).name : "HISTORIC ERA"
                                            font.bold: true
                                            font.pixelSize: 10
                                            color: root.isUserEra(root.selectedEra) ? "#34d399" : (root.isFantasyEra(root.selectedEra) ? "#c084fc" : "#fbbf24")
                                            elide: Text.ElideRight
                                        }
                                        Rectangle {
                                            height: 18
                                            width: spanDossierTxt.contentWidth + 8
                                            radius: 4
                                            color: "#0f172a"
                                            border.color: "#334155"
                                            Text {
                                                id: spanDossierTxt
                                                anchors.centerIn: parent
                                                text: root.getEraData(root.selectedEra) ? root.getEraData(root.selectedEra).span : ""
                                                font.pixelSize: 9
                                                color: "#cbd5e1"
                                            }
                                        }
                                    }

                                    Text {
                                        Layout.fillWidth: true
                                        text: root.getEraData(root.selectedEra) ? root.getEraData(root.selectedEra).aesthetic : ""
                                        font.pixelSize: 10
                                        color: "#cbd5e1"
                                        wrapMode: Text.WordWrap
                                        maximumLineCount: 3
                                        elide: Text.ElideRight
                                    }

                                    // Tech & Etiquette Highlights
                                    ColumnLayout {
                                        Layout.fillWidth: true
                                        spacing: 2
                                        visible: root.getEraData(root.selectedEra) !== null

                                        Text {
                                            Layout.fillWidth: true
                                            text: root.getEraData(root.selectedEra) ? ("⚙️ Tech/Magic: " + root.getEraData(root.selectedEra).tech) : ""
                                            font.pixelSize: 9
                                            color: "#94a3b8"
                                            wrapMode: Text.WordWrap
                                            maximumLineCount: 2
                                            elide: Text.ElideRight
                                        }

                                        Text {
                                            Layout.fillWidth: true
                                            text: root.getEraData(root.selectedEra) ? ("📜 Social & Hierarchy: " + root.getEraData(root.selectedEra).social_codes) : ""
                                            font.pixelSize: 9
                                            color: "#94a3b8"
                                            wrapMode: Text.WordWrap
                                            maximumLineCount: 2
                                            elide: Text.ElideRight
                                        }
                                    }
                                }
                            }
                        }

                        // Relationship Dynamic
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            Text {
                                text: "Relationship Dynamic"
                                font.pixelSize: 12
                                color: "#94a3b8"
                            }

                            TextField {
                                id: dynamicInput
                                Layout.fillWidth: true
                                text: "Domestic Discipline & Brat Taming"
                                placeholderText: "e.g. Brat Taming, Arranged Marriage, Overworked Surrender"
                                color: "#f8fafc"
                                background: Rectangle {
                                    color: "#1e293b"
                                    radius: 6
                                    border.color: dynamicInput.activeFocus ? "#8b5cf6" : "#334155"
                                }
                            }
                        }

                        // Kinks & Tropes
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            Text {
                                text: "Key Tropes / Kinks (Comma-separated)"
                                font.pixelSize: 12
                                color: "#94a3b8"
                            }

                            TextField {
                                id: tropesInput
                                Layout.fillWidth: true
                                text: "Brat / Brat Tamer, Domestic Discipline, Spanking, Married Couple, Loving & Possessive"
                                placeholderText: "e.g. Spanking, Rope Bondage, Blindfold, Aftercare"
                                color: "#f8fafc"
                                background: Rectangle {
                                    color: "#1e293b"
                                    radius: 6
                                    border.color: tropesInput.activeFocus ? "#8b5cf6" : "#334155"
                                }
                            }

                            // Quick Trope / Kink Add Pills
                            Flow {
                                Layout.fillWidth: true
                                spacing: 4
                                Repeater {
                                    model: [
                                        "+ Brat Taming",
                                        "+ Over-the-Knee",
                                        "+ Corner Time",
                                        "+ Shibari Restraint",
                                        "+ Praise Kink",
                                        "+ Forced Apology",
                                        "+ Hair-Stroking Aftercare",
                                        "+ Ice Queen / Defiant"
                                    ]
                                    Rectangle {
                                        height: 20
                                        radius: 10
                                        implicitWidth: quickTropeTxt.implicitWidth + 12
                                        color: quickTropeMa.containsMouse ? "#374151" : "#1e293b"
                                        border.color: quickTropeMa.containsMouse ? "#a855f7" : "#334155"
                                        border.width: 1
                                        Text {
                                            id: quickTropeTxt
                                            anchors.centerIn: parent
                                            text: modelData
                                            font.pixelSize: 10
                                            color: quickTropeMa.containsMouse ? "#f3e8ff" : "#94a3b8"
                                        }
                                        MouseArea {
                                            id: quickTropeMa
                                            anchors.fill: parent
                                            hoverEnabled: true
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: {
                                                var tag = modelData.replace("+ ", "").trim();
                                                var current = tropesInput.text.trim();
                                                if (!current) {
                                                    tropesInput.text = tag;
                                                } else if (current.indexOf(tag) === -1) {
                                                    tropesInput.text = current + ", " + tag;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Custom Inspiration
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            Text {
                                text: "Custom Idea Seed / Write-in Details (Optional)"
                                font.pixelSize: 12
                                color: "#94a3b8"
                            }

                            ScrollView {
                                id: seedAreaScroll
                                Layout.fillWidth: true
                                implicitHeight: 70
                                clip: true

                                background: Rectangle {
                                    color: "#1e293b"
                                    radius: 6
                                    border.color: seedArea.activeFocus ? "#8b5cf6" : "#334155"
                                }

                                ScrollBar.vertical: ScrollBar {
                                    policy: ScrollBar.AsNeeded
                                    contentItem: Rectangle {
                                        implicitWidth: 4
                                        radius: 2
                                        color: "#64748b"
                                    }
                                }

                                TextArea {
                                    id: seedArea
                                    width: seedAreaScroll.availableWidth
                                    wrapMode: TextArea.Wrap
                                    placeholderText: ""
                                    color: "#f8fafc"
                                    selectByMouse: true
                                    leftPadding: 8
                                    rightPadding: 8
                                    topPadding: 6
                                    bottomPadding: 6
                                    background: null
                                    // Custom placeholder: Basic style's built-in PlaceholderText causes a width binding loop inside ScrollView
                                    Text {
                                        x: parent.leftPadding
                                        y: parent.topPadding
                                        width: parent.width - parent.leftPadding - parent.rightPadding
                                        text: "e.g. Wife who gets bratty when cooking dinner, pregnant with second child..."
                                        color: "#64748b"
                                        font: parent.font
                                        wrapMode: Text.Wrap
                                        visible: !parent.length && !parent.preeditText
                                    }
                                }
                            }
                        }

                        // Creative Tone / Focus Mode
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "Creative Tone / Focus Mode"
                                    font.pixelSize: 12
                                    color: "#94a3b8"
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: root.selectedFocusMode.toUpperCase()
                                    font.bold: true
                                    font.pixelSize: 10
                                    color: "#c084fc"
                                }
                            }

                            Flow {
                                Layout.fillWidth: true
                                spacing: 5
                                Repeater {
                                    model: [
                                        { id: "psychometric", label: "🧠 Psychometric" },
                                        { id: "domestic", label: "🏡 Domestic" },
                                        { id: "reluctant", label: "⛓️ Reluctant" },
                                        { id: "slowburn", label: "🕯️ Slow-Burn" },
                                        { id: "scene_hook", label: "⚡ Scene Hook" }
                                    ]
                                    Rectangle {
                                        height: 24
                                        radius: 6
                                        implicitWidth: focusChipTxt.implicitWidth + 14
                                        color: root.selectedFocusMode === modelData.id ? "#581c87" : "#1e293b"
                                        border.color: root.selectedFocusMode === modelData.id ? "#c084fc" : "#334155"
                                        border.width: root.selectedFocusMode === modelData.id ? 2 : 1
                                        Text {
                                            id: focusChipTxt
                                            anchors.centerIn: parent
                                            text: modelData.label
                                            font.pixelSize: 10
                                            font.bold: root.selectedFocusMode === modelData.id
                                            color: root.selectedFocusMode === modelData.id ? "#f3e8ff" : "#94a3b8"
                                        }
                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: root.selectedFocusMode = modelData.id
                                        }
                                    }
                                }
                            }
                        }

                        // Temperature Slider
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 2

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "Creativity (Temperature)"
                                    font.pixelSize: 12
                                    color: "#94a3b8"
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: tempSlider.value.toFixed(2)
                                    font.bold: true
                                    font.pixelSize: 12
                                    color: "#a78bfa"
                                }
                            }

                            Slider {
                                id: tempSlider
                                Layout.fillWidth: true
                                from: 0.4
                                to: 1.2
                                value: 0.85
                                stepSize: 0.05
                            }
                        }

                        // ==========================================
                        // FEATURE 3: COMPONENT LOCKS CONTROL BOX
                        // ==========================================
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "🔒 COMPONENT LOCKS (KEEP & REROLL)"
                                    font.bold: true
                                    font.pixelSize: 11
                                    color: root.anyLockActive ? "#fbbf24" : "#94a3b8"
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: "Unlock All"
                                    font.pixelSize: 10
                                    color: "#f87171"
                                    visible: root.anyLockActive
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            root.lockName = false;
                                            root.lockArchetype = false;
                                            root.lockModality = false;
                                            root.lockVoice = false;
                                            if (typeof backend !== "undefined" && backend) backend.toast("🔓 All component locks cleared.");
                                        }
                                    }
                                }
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 5

                                // Lock Name Toggle
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.lockName ? "#78350f" : "#1e293b"
                                    border.color: root.lockName ? "#f59e0b" : "#334155"
                                    border.width: root.lockName ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: root.lockName ? "🔒 Name" : "🔓 Name"
                                        font.bold: root.lockName
                                        font.pixelSize: 11
                                        color: root.lockName ? "#fef3c7" : "#94a3b8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            root.lockName = !root.lockName;
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.toast(root.lockName ? "🔒 Locked Name: '" + (root.activeIdea.name || "") + "'" : "🔓 Unlocked Name");
                                            }
                                        }
                                    }
                                }

                                // Lock Archetype Toggle
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.lockArchetype ? "#78350f" : "#1e293b"
                                    border.color: root.lockArchetype ? "#f59e0b" : "#334155"
                                    border.width: root.lockArchetype ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: root.lockArchetype ? "🔒 Arch" : "🔓 Arch"
                                        font.bold: root.lockArchetype
                                        font.pixelSize: 11
                                        color: root.lockArchetype ? "#fef3c7" : "#94a3b8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            root.lockArchetype = !root.lockArchetype;
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.toast(root.lockArchetype ? "🔒 Locked Archetype & Title" : "🔓 Unlocked Archetype");
                                            }
                                        }
                                    }
                                }

                                // Lock Dynamic / Modality Toggle
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.lockModality ? "#78350f" : "#1e293b"
                                    border.color: root.lockModality ? "#f59e0b" : "#334155"
                                    border.width: root.lockModality ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: root.lockModality ? "🔒 Dynamic" : "🔓 Dynamic"
                                        font.bold: root.lockModality
                                        font.pixelSize: 11
                                        color: root.lockModality ? "#fef3c7" : "#94a3b8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            root.lockModality = !root.lockModality;
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.toast(root.lockModality ? "🔒 Locked Disciplinary Dynamic & Kinks" : "🔓 Unlocked Dynamic");
                                            }
                                        }
                                    }
                                }

                                // Lock Voice Toggle
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.lockVoice ? "#78350f" : "#1e293b"
                                    border.color: root.lockVoice ? "#f59e0b" : "#334155"
                                    border.width: root.lockVoice ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: root.lockVoice ? "🔒 Voice" : "🔓 Voice"
                                        font.bold: root.lockVoice
                                        font.pixelSize: 11
                                        color: root.lockVoice ? "#fef3c7" : "#94a3b8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            root.lockVoice = !root.lockVoice;
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.toast(root.lockVoice ? "🔒 Locked Vocal Style & Contradiction" : "🔓 Unlocked Voice");
                                            }
                                        }
                                    }
                                }
                            }

                            // Dedicated Reroll Unlocked Slots Button (appears prominently when any lock active)
                            Button {
                                id: rerollLockedBtn
                                Layout.fillWidth: true
                                height: 42
                                visible: root.anyLockActive
                                enabled: !root.isGenerating && !(typeof backend !== "undefined" && backend && backend.isGenerating)
                                background: Rectangle {
                                    radius: 8
                                    color: rerollLockedBtn.hovered ? "#92400e" : "#78350f"
                                    border.color: "#f59e0b"
                                    border.width: 2
                                }
                                contentItem: RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 8
                                    Text {
                                        text: "🎲"
                                        font.pixelSize: 14
                                    }
                                    Text {
                                        text: "Reroll Unlocked Slots (Keep Locked)"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#fef3c7"
                                    }
                                }
                                onClicked: {
                                    if (typeof backend !== "undefined" && backend) {
                                        backend.rerollIdea(
                                            JSON.stringify(root.activeIdea),
                                            JSON.stringify(root.getActiveLocks()),
                                            genreCombo.currentText,
                                            dynamicInput.text,
                                            seedArea.text,
                                            root.selectedIntensity,
                                            root.selectedCorrectionTier,
                                            root.selectedEra
                                        );
                                    }
                                }
                            }
                        }

                        Item { height: 4 }

                        // Generate Buttons
                        Button {
                            id: genBtn
                            Layout.fillWidth: true
                            height: 44
                            enabled: !root.isGenerating && !(typeof backend !== "undefined" && backend && backend.isGenerating)

                            background: Rectangle {
                                radius: 8
                                gradient: Gradient {
                                    GradientStop { position: 0.0; color: genBtn.hovered ? "#9333ea" : "#7c3aed" }
                                    GradientStop { position: 1.0; color: genBtn.hovered ? "#7e22ce" : "#6d28d9" }
                                }
                                border.color: "#c084fc"
                                border.width: 1
                            }

                            contentItem: RowLayout {
                                anchors.centerIn: parent
                                spacing: 8
                                Text {
                                    text: (root.isGenerating || (typeof backend !== "undefined" && backend && backend.isGenerating)) ? "⏳ Synthesizing Idea..." : "✨ Generate via llama-server (:5001)"
                                    font.bold: true
                                    font.pixelSize: 13
                                    color: "#ffffff"
                                }
                            }

                            onClicked: {
                                var tropesList = tropesInput.text.split(",").map(function(s){ return s.trim(); });
                                if (typeof backend !== "undefined" && backend) {
                                    backend.generateIdea(
                                        genreCombo.currentText,
                                        dynamicInput.text,
                                        JSON.stringify(tropesList),
                                        seedArea.text,
                                        tempSlider.value,
                                        root.selectedIntensity,
                                        JSON.stringify(root.getActiveLocks()),
                                        JSON.stringify(root.activeIdea),
                                        root.selectedFocusMode,
                                        root.selectedCorrectionTier,
                                        root.selectedEra
                                    );
                                }
                            }
                        }

                        // Batch Forge (x3 / x5) Buttons
                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 8

                            Button {
                                id: batch3Btn
                                Layout.fillWidth: true
                                height: 38
                                enabled: !root.isGenerating && !(typeof backend !== "undefined" && backend && backend.isGenerating)
                                background: Rectangle {
                                    radius: 8
                                    color: batch3Btn.hovered ? "#4338ca" : "#3730a3"
                                    border.color: "#818cf8"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 4
                                    Text { text: "🎲"; font.pixelSize: 12 }
                                    Text {
                                        text: "Batch Forge (x3)"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#e0e7ff"
                                    }
                                }
                                onClicked: {
                                    var tropesList = tropesInput.text.split(",").map(function(s){ return s.trim(); });
                                    if (typeof backend !== "undefined" && backend) {
                                        backend.generateBatch(
                                            3,
                                            genreCombo.currentText,
                                            dynamicInput.text,
                                            JSON.stringify(tropesList),
                                            seedArea.text,
                                            tempSlider.value,
                                            root.selectedIntensity,
                                            JSON.stringify(root.getActiveLocks()),
                                            JSON.stringify(root.activeIdea),
                                            root.selectedFocusMode,
                                            root.selectedCorrectionTier,
                                            root.selectedEra
                                        );
                                    }
                                }
                            }

                            Button {
                                id: batch5Btn
                                Layout.fillWidth: true
                                height: 38
                                enabled: !root.isGenerating && !(typeof backend !== "undefined" && backend && backend.isGenerating)
                                background: Rectangle {
                                    radius: 8
                                    color: batch5Btn.hovered ? "#5b21b6" : "#4c1d95"
                                    border.color: "#a78bfa"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 4
                                    Text { text: "🎲"; font.pixelSize: 12 }
                                    Text {
                                        text: "Batch Forge (x5)"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#ede9fe"
                                    }
                                }
                                onClicked: {
                                    var tropesList = tropesInput.text.split(",").map(function(s){ return s.trim(); });
                                    if (typeof backend !== "undefined" && backend) {
                                        backend.generateBatch(
                                            5,
                                            genreCombo.currentText,
                                            dynamicInput.text,
                                            JSON.stringify(tropesList),
                                            seedArea.text,
                                            tempSlider.value,
                                            root.selectedIntensity,
                                            JSON.stringify(root.getActiveLocks()),
                                            JSON.stringify(root.activeIdea),
                                            root.selectedFocusMode,
                                            root.selectedCorrectionTier,
                                            root.selectedEra
                                        );
                                    }
                                }
                            }
                        }

                        Button {
                            id: randomBtn
                            Layout.fillWidth: true
                            height: 38
                            enabled: !root.isGenerating && !(typeof backend !== "undefined" && backend && backend.isGenerating)

                            background: Rectangle {
                                radius: 8
                                color: randomBtn.hovered ? "#243247" : "#1e293b"
                                border.color: "#475569"
                                border.width: 1
                            }

                            contentItem: Text {
                                anchors.centerIn: parent
                                text: "🎲 Master Archetype Seed (Curated Handcrafted)"
                                font.pixelSize: 12
                                font.bold: true
                                color: "#cbd5e1"
                            }

                            onClicked: {
                                if (typeof backend !== "undefined" && backend) {
                                    backend.generateMasterSeed(
                                        genreCombo.currentText,
                                        dynamicInput.text,
                                        seedArea.text,
                                        root.selectedIntensity,
                                        JSON.stringify(root.getActiveLocks()),
                                        JSON.stringify(root.activeIdea),
                                        root.selectedCorrectionTier,
                                        root.selectedEra
                                    );
                                }
                            }
                        }

                        Button {
                            id: infiniteBtn
                            Layout.fillWidth: true
                            height: 38
                            enabled: !root.isGenerating && !(typeof backend !== "undefined" && backend && backend.isGenerating)

                            background: Rectangle {
                                radius: 8
                                color: infiniteBtn.hovered ? "#064e3b" : "#065f46"
                                border.color: "#10b981"
                                border.width: 1
                            }

                            contentItem: Text {
                                anchors.centerIn: parent
                                text: root.anyLockActive ? "✨ Synthesize with Locked Components" : "✨ Infinite Combinatorial Synthesizer"
                                font.pixelSize: 12
                                font.bold: true
                                color: "#ecfdf5"
                            }

                            onClicked: {
                                if (typeof backend !== "undefined" && backend) {
                                    backend.generateCombinatorial(
                                        genreCombo.currentText,
                                        dynamicInput.text,
                                        seedArea.text,
                                        root.selectedIntensity,
                                        JSON.stringify(root.getActiveLocks()),
                                        JSON.stringify(root.activeIdea),
                                        root.selectedCorrectionTier,
                                        root.selectedEra
                                    );
                                }
                            }
                        }

                        Item { height: 16 }
                    }
                }
            }

            // ------------------------------------------
            // RIGHT COLUMN: CHARACTER PITCH CARD DISPLAY
            // ------------------------------------------
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                color: "#0b0f19"

                ColumnLayout {
                    anchors.fill: parent
                    spacing: 0

                    // Top Action Bar
                    Rectangle {
                        Layout.fillWidth: true
                        height: 54
                        color: "#131b2e"
                        border.color: "#1e293b"
                        border.width: 1

                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: 20
                            anchors.rightMargin: 20
                            spacing: 10

                            Text {
                                text: "PITCH CARD PREVIEW"
                                font.bold: true
                                font.pixelSize: 12
                                color: "#64748b"
                            }

                            Item { Layout.fillWidth: true }

                            // Send to CharGenUI via Server-Side IPC Bridge
                            Button {
                                id: pushIpcBtn
                                height: 34
                                background: Rectangle {
                                    radius: 6
                                    gradient: Gradient {
                                        GradientStop { position: 0.0; color: pushIpcBtn.hovered ? "#4f46e5" : "#4338ca" }
                                        GradientStop { position: 1.0; color: pushIpcBtn.hovered ? "#059669" : "#047857" }
                                    }
                                    border.color: "#34d399"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 6
                                    Text {
                                        text: "🚀"
                                        font.pixelSize: 13
                                    }
                                    Text {
                                        text: "Send to CharGenUI (:3333)"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#ffffff"
                                    }
                                }
                                onClicked: {
                                    if (root.activeIdea && typeof backend !== "undefined" && backend) {
                                        var ideaCopy = Object.assign({}, root.activeIdea);
                                        if (!ideaCopy.era && root.selectedEra !== "off" && root.getEraData(root.selectedEra)) {
                                            ideaCopy.era = root.getEraData(root.selectedEra).name;
                                        }
                                        backend.pushToCharGenUI(
                                            JSON.stringify(ideaCopy),
                                            root.autoGenerateOnSend
                                        );
                                    }
                                }
                            }

                            // Enqueue for CharGenUI Button
                            Button {
                                id: enqueueStudioBtn
                                height: 34
                                background: Rectangle {
                                    radius: 6
                                    color: enqueueStudioBtn.hovered ? "#065f46" : "#064e3b"
                                    border.color: "#10b981"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 5
                                    Text { text: "📥"; font.pixelSize: 12 }
                                    Text {
                                        text: "Enqueue"
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#ecfdf5"
                                    }
                                }
                                onClicked: {
                                    if (root.activeIdea && typeof backend !== "undefined" && backend) {
                                        var raw = JSON.stringify(root.activeIdea);
                                        var id = backend.addToGrimoire(raw, "studio");
                                        if (id) backend.enqueueGrimoireItem(id);
                                    }
                                }
                            }

                            // Auto-Forge Toggle Pill
                            Rectangle {
                                height: 34
                                radius: 6
                                color: root.autoGenerateOnSend ? "#78350f" : "#1e293b"
                                border.color: root.autoGenerateOnSend ? "#f59e0b" : "#334155"
                                border.width: root.autoGenerateOnSend ? 2 : 1
                                implicitWidth: autoGenText.implicitWidth + 20

                                RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 6
                                    Text {
                                        text: root.autoGenerateOnSend ? "⚡" : "⚙️"
                                        font.pixelSize: 11
                                    }
                                    Text {
                                        id: autoGenText
                                        text: root.autoGenerateOnSend ? "Auto-Forge: ON" : "Auto-Forge: OFF"
                                        font.pixelSize: 11
                                        font.bold: root.autoGenerateOnSend
                                        color: root.autoGenerateOnSend ? "#fef3c7" : "#94a3b8"
                                    }
                                }

                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        root.autoGenerateOnSend = !root.autoGenerateOnSend;
                                        if (typeof backend !== "undefined" && backend) {
                                            backend.toast(root.autoGenerateOnSend ? "⚡ Auto-Forge ON: CharGenUI will generate card immediately!" : "⚙️ Auto-Forge OFF: CharGenUI will populate Spark generator.");
                                        }
                                    }
                                }
                            }

                            // Refine in Agent Mode Button
                            Button {
                                id: refineAgentBtn
                                height: 34
                                background: Rectangle {
                                    radius: 6
                                    color: refineAgentBtn.hovered ? "#6d28d9" : "#5b21b6"
                                    border.color: "#8b5cf6"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 6
                                    Text { text: "🤖"; font.pixelSize: 12 }
                                    Text {
                                        text: "Send to AI Agent"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#ffffff"
                                    }
                                }
                                onClicked: {
                                    if (root.activeIdea && typeof backend !== "undefined" && backend) {
                                        backend.primeAgentWithCharacter(JSON.stringify(root.activeIdea));
                                        root.currentTab = 2;
                                    }
                                }
                            }

                            Button {
                                id: copyPremiseBtn
                                height: 34
                                background: Rectangle {
                                    radius: 6
                                    color: copyPremiseBtn.hovered ? "#059669" : "#10b981"
                                }
                                contentItem: Text {
                                    anchors.centerIn: parent
                                    text: "📋 Copy Premise"
                                    font.bold: true
                                    font.pixelSize: 12
                                    color: "#ffffff"
                                }
                                onClicked: {
                                    if (root.activeIdea && root.activeIdea.premise) {
                                        backend.copyToClipboard(root.activeIdea.premise);
                                    }
                                }
                            }

                            // Save Button
                            Button {
                                id: saveBtn
                                height: 34
                                background: Rectangle {
                                    radius: 6
                                    color: saveBtn.hovered ? "#374151" : "#1f2937"
                                    border.color: "#4b5563"
                                    border.width: 1
                                }
                                contentItem: Text {
                                    anchors.centerIn: parent
                                    text: "⭐ Save Concept"
                                    font.pixelSize: 12
                                    color: "#f3f4f6"
                                }
                                onClicked: {
                                    backend.saveToHistory(JSON.stringify(root.activeIdea));
                                }
                            }
                        }
                    }

                    // Pitch Card Body
                    ScrollView {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        contentWidth: availableWidth
                        clip: true

                        ColumnLayout {
                            width: parent.width - 40
                            anchors.horizontalCenter: parent.horizontalCenter
                            spacing: 18
                            anchors.topMargin: 20
                            anchors.bottomMargin: 30

                            // Name & Archetype Banner
                            Rectangle {
                                Layout.fillWidth: true
                                radius: 12
                                color: "#161f36"
                                border.color: "#312e81"
                                border.width: 1
                                implicitHeight: bannerCol.implicitHeight + 36

                                ColumnLayout {
                                    id: bannerCol
                                    anchors.fill: parent
                                    anchors.margins: 18
                                    spacing: 8

                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 12

                                        Text {
                                            text: root.activeIdea.name || "Custom Character"
                                            font.bold: true
                                            font.pixelSize: 26
                                            color: "#f8fafc"
                                        }

                                        // Lock Name Badge Button
                                        Rectangle {
                                            radius: 12
                                            height: 24
                                            implicitWidth: lockNameLabel.implicitWidth + 14
                                            color: root.lockName ? "#78350f" : "#1e293b"
                                            border.color: root.lockName ? "#f59e0b" : "#475569"
                                            border.width: 1
                                            Text {
                                                id: lockNameLabel
                                                anchors.centerIn: parent
                                                text: root.lockName ? "🔒 Name Locked" : "🔓 Lock Name"
                                                font.pixelSize: 10
                                                font.bold: root.lockName
                                                color: root.lockName ? "#fef3c7" : "#94a3b8"
                                            }
                                            MouseArea {
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: root.lockName = !root.lockName
                                            }
                                        }

                                        // Source Label
                                        Rectangle {
                                            radius: 6
                                            height: 24
                                            implicitWidth: sourceLabel.implicitWidth + 14
                                            color: "#1e1b4b"
                                            border.color: "#6366f1"
                                            border.width: 1
                                            Text {
                                                id: sourceLabel
                                                anchors.centerIn: parent
                                                text: root.activeIdea.source || "Generated Concept"
                                                font.pixelSize: 10
                                                color: "#c7d2fe"
                                            }
                                        }

                                        // Intensity Tier Badge
                                        Rectangle {
                                            radius: 6
                                            height: 24
                                            implicitWidth: intensityBadgeLabel.implicitWidth + 14
                                            color: root.activeIdea.intensity === "mild" ? "#4c0519" :
                                                   root.activeIdea.intensity === "heavy" ? "#450a0a" : "#2e1065"
                                            border.color: root.activeIdea.intensity === "mild" ? "#f472b6" :
                                                          root.activeIdea.intensity === "heavy" ? "#ef4444" : "#c084fc"
                                            border.width: 1
                                            Text {
                                                id: intensityBadgeLabel
                                                anchors.centerIn: parent
                                                text: root.intensityTitle(root.activeIdea.intensity || root.selectedIntensity)
                                                font.pixelSize: 10
                                                font.bold: true
                                                color: root.intensityColor(root.activeIdea.intensity || root.selectedIntensity)
                                            }
                                        }

                                        Item { Layout.fillWidth: true }
                                    }

                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 8

                                        Text {
                                            text: root.activeIdea.title || "The Roleplay Concept"
                                            font.bold: true
                                            font.pixelSize: 15
                                            color: "#c084fc"
                                        }

                                        // Lock Archetype Badge Button
                                        Rectangle {
                                            radius: 10
                                            height: 20
                                            implicitWidth: lockArchLabel.implicitWidth + 12
                                            color: root.lockArchetype ? "#78350f" : "#1e293b"
                                            border.color: root.lockArchetype ? "#f59e0b" : "#475569"
                                            border.width: 1
                                            Text {
                                                id: lockArchLabel
                                                anchors.centerIn: parent
                                                text: root.lockArchetype ? "🔒 Arch Locked" : "🔓 Lock Archetype"
                                                font.pixelSize: 9
                                                font.bold: root.lockArchetype
                                                color: root.lockArchetype ? "#fef3c7" : "#94a3b8"
                                            }
                                            MouseArea {
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: root.lockArchetype = !root.lockArchetype
                                            }
                                        }
                                    }

                                    Text {
                                        text: "“" + (root.activeIdea.tagline || "") + "”"
                                        font.italic: true
                                        font.pixelSize: 13
                                        color: "#94a3b8"
                                        visible: Boolean(root.activeIdea.tagline)
                                    }

                                    // Tags Flow
                                    Flow {
                                        Layout.fillWidth: true
                                        spacing: 6
                                        Repeater {
                                            model: root.activeIdea.tags || []
                                            Rectangle {
                                                height: 22
                                                radius: 4
                                                color: "#1e293b"
                                                implicitWidth: tagText.implicitWidth + 12
                                                Text {
                                                    id: tagText
                                                    anchors.centerIn: parent
                                                    text: modelData
                                                    font.pixelSize: 10
                                                    color: "#38bdf8"
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // The Premise Box (Ready to copy / edit)
                            Rectangle {
                                Layout.fillWidth: true
                                radius: 10
                                color: "#111827"
                                border.color: root.isEditingPremise ? "#10b981" : "#059669"
                                border.width: root.isEditingPremise ? 2 : 1
                                implicitHeight: premiseCol.implicitHeight + 32

                                ColumnLayout {
                                    id: premiseCol
                                    anchors.fill: parent
                                    anchors.margins: 16
                                    spacing: 8

                                    RowLayout {
                                        Layout.fillWidth: true
                                        Text {
                                            text: root.isEditingPremise ? "✏️ EDITING PLAYABLE CONCEPT" : "💡 PLAYABLE CONCEPT (PASTE DIRECTLY INTO CHARGEN UI)"
                                            font.bold: true
                                            font.pixelSize: 11
                                            color: "#34d399"
                                        }
                                        Item { Layout.fillWidth: true }

                                        Rectangle {
                                            radius: 6
                                            height: 24
                                            implicitWidth: editPremiseBtnTxt.implicitWidth + 14
                                            color: root.isEditingPremise ? "#065f46" : "#1f2937"
                                            border.color: root.isEditingPremise ? "#10b981" : "#4b5563"
                                            border.width: 1

                                            Text {
                                                id: editPremiseBtnTxt
                                                anchors.centerIn: parent
                                                text: root.isEditingPremise ? "💾 Save Changes" : "✏️ Edit Premise"
                                                font.pixelSize: 10
                                                font.bold: true
                                                color: root.isEditingPremise ? "#ecfdf5" : "#cbd5e1"
                                            }

                                            MouseArea {
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: {
                                                    if (root.isEditingPremise) {
                                                        if (root.activeIdea) {
                                                            root.activeIdea.premise = premiseEditArea.text;
                                                        }
                                                        root.isEditingPremise = false;
                                                        if (typeof backend !== "undefined" && backend) {
                                                            backend.toast("💾 Saved premise edits to current concept!");
                                                        }
                                                    } else {
                                                        premiseEditArea.text = (root.activeIdea && root.activeIdea.premise) ? root.activeIdea.premise : "";
                                                        root.isEditingPremise = true;
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    // Static Display View
                                    Text {
                                        Layout.fillWidth: true
                                        wrapMode: Text.Wrap
                                        visible: !root.isEditingPremise
                                        text: root.activeIdea.premise || ""
                                        font.pixelSize: 13
                                        lineHeight: 1.4
                                        color: "#f3f4f6"
                                        font.family: "monospace"
                                    }

                                    // In-Place Editable View
                                    TextArea {
                                        id: premiseEditArea
                                        Layout.fillWidth: true
                                        implicitHeight: 180
                                        wrapMode: TextArea.Wrap
                                        visible: root.isEditingPremise
                                        text: root.activeIdea.premise || ""
                                        font.pixelSize: 13
                                        color: "#ffffff"
                                        font.family: "monospace"
                                        background: Rectangle {
                                            color: "#0f172a"
                                            radius: 6
                                            border.color: "#10b981"
                                            border.width: 1
                                        }
                                    }
                                }
                            }

                            // Central Contradiction Box
                            Rectangle {
                                Layout.fillWidth: true
                                radius: 10
                                color: "#111827"
                                border.color: "#8b5cf6"
                                border.width: 1
                                implicitHeight: contraCol.implicitHeight + 28

                                ColumnLayout {
                                    id: contraCol
                                    anchors.fill: parent
                                    anchors.margins: 14
                                    spacing: 6

                                    RowLayout {
                                        Layout.fillWidth: true
                                        Text {
                                            text: "⚡ CENTRAL CONTRADICTION (THE INTERNAL WAR)"
                                            font.bold: true
                                            font.pixelSize: 11
                                            color: "#c084fc"
                                        }
                                        Item { Layout.fillWidth: true }
                                    }

                                    Text {
                                        Layout.fillWidth: true
                                        wrapMode: Text.Wrap
                                        text: root.activeIdea.central_contradiction || "Unspecified"
                                        font.pixelSize: 13
                                        lineHeight: 1.35
                                        color: "#e2e8f0"
                                    }
                                }
                            }

                            // Reaction Gradient Preview
                            Rectangle {
                                Layout.fillWidth: true
                                radius: 10
                                color: "#111827"
                                border.color: root.lockModality ? "#f59e0b" : "#374151"
                                border.width: root.lockModality ? 2 : 1
                                implicitHeight: gradCol.implicitHeight + 28

                                ColumnLayout {
                                    id: gradCol
                                    anchors.fill: parent
                                    anchors.margins: 14
                                    spacing: 10

                                    RowLayout {
                                        Layout.fillWidth: true
                                        Text {
                                            text: "🎯 CALIBRATED REACTION GRADIENT & DISCIPLINARY CRAVING"
                                            font.bold: true
                                            font.pixelSize: 11
                                            color: "#38bdf8"
                                        }
                                        Item { Layout.fillWidth: true }

                                        // Lock Dynamic / Modality Button
                                        Rectangle {
                                            radius: 10
                                            height: 20
                                            implicitWidth: lockModalityLabel.implicitWidth + 12
                                            color: root.lockModality ? "#78350f" : "#1e293b"
                                            border.color: root.lockModality ? "#f59e0b" : "#475569"
                                            border.width: 1
                                            Text {
                                                id: lockModalityLabel
                                                anchors.centerIn: parent
                                                text: root.lockModality ? "🔒 Dynamic Locked" : "🔓 Lock Dynamic"
                                                font.pixelSize: 9
                                                font.bold: root.lockModality
                                                color: root.lockModality ? "#fef3c7" : "#94a3b8"
                                            }
                                            MouseArea {
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: root.lockModality = !root.lockModality
                                            }
                                        }
                                    }

                                    ColumnLayout {
                                        Layout.fillWidth: true
                                        spacing: 6

                                        RowLayout {
                                            spacing: 8
                                            Rectangle { width: 80; height: 22; radius: 4; color: "#7f1d1d"; Text { anchors.centerIn: parent; text: "WON'T"; font.bold: true; font.pixelSize: 10; color: "#fca5a5" } }
                                            Text { Layout.fillWidth: true; wrapMode: Text.Wrap; text: (root.activeIdea.reaction_gradient && root.activeIdea.reaction_gradient.wont) ? root.activeIdea.reaction_gradient.wont : "-"; font.pixelSize: 12; color: "#cbd5e1" }
                                        }

                                        RowLayout {
                                            spacing: 8
                                            Rectangle { width: 80; height: 22; radius: 4; color: "#831843"; Text { anchors.centerIn: parent; text: "CRAVES"; font.bold: true; font.pixelSize: 10; color: "#f9a8d4" } }
                                            Text { Layout.fillWidth: true; wrapMode: Text.Wrap; text: (root.activeIdea.reaction_gradient && root.activeIdea.reaction_gradient.craves) ? root.activeIdea.reaction_gradient.craves : "-"; font.pixelSize: 12; color: "#cbd5e1" }
                                        }

                                        RowLayout {
                                            spacing: 8
                                            Rectangle { width: 80; height: 22; radius: 4; color: "#1e293b"; Text { anchors.centerIn: parent; text: "NEUTRAL"; font.bold: true; font.pixelSize: 10; color: "#94a3b8" } }
                                            Text { Layout.fillWidth: true; wrapMode: Text.Wrap; text: (root.activeIdea.reaction_gradient && root.activeIdea.reaction_gradient.neutral) ? root.activeIdea.reaction_gradient.neutral : "-"; font.pixelSize: 12; color: "#94a3b8" }
                                        }

                                        RowLayout {
                                            spacing: 8
                                            Rectangle { width: 80; height: 22; radius: 4; color: "#064e3b"; Text { anchors.centerIn: parent; text: "WILL"; font.bold: true; font.pixelSize: 10; color: "#6ee7b7" } }
                                            Text { Layout.fillWidth: true; wrapMode: Text.Wrap; text: (root.activeIdea.reaction_gradient && root.activeIdea.reaction_gradient.will) ? root.activeIdea.reaction_gradient.will : "-"; font.pixelSize: 12; color: "#cbd5e1" }
                                        }

                                        RowLayout {
                                            spacing: 8
                                            Rectangle { width: 80; height: 22; radius: 4; color: "#312e81"; Text { anchors.centerIn: parent; text: "TRUST GATE"; font.bold: true; font.pixelSize: 10; color: "#a5b4fc" } }
                                            Text { Layout.fillWidth: true; wrapMode: Text.Wrap; text: (root.activeIdea.reaction_gradient && root.activeIdea.reaction_gradient.trust_gate) ? root.activeIdea.reaction_gradient.trust_gate : "-"; font.pixelSize: 12; color: "#cbd5e1" }
                                        }
                                    }
                                }
                            }

                            // Vocal Cadence Box
                            Rectangle {
                                Layout.fillWidth: true
                                radius: 10
                                color: "#111827"
                                border.color: root.lockVoice ? "#f59e0b" : "#374151"
                                border.width: root.lockVoice ? 2 : 1
                                implicitHeight: voiceCol.implicitHeight + 28

                                ColumnLayout {
                                    id: voiceCol
                                    anchors.fill: parent
                                    anchors.margins: 14
                                    spacing: 6

                                    RowLayout {
                                        Layout.fillWidth: true
                                        Text {
                                            text: "🗣️ VOCAL IDIOLECT & SPEECH CADENCE"
                                            font.bold: true
                                            font.pixelSize: 11
                                            color: "#fbbf24"
                                        }
                                        Item { Layout.fillWidth: true }

                                        // Lock Voice Button
                                        Rectangle {
                                            radius: 10
                                            height: 20
                                            implicitWidth: lockVoiceLabel.implicitWidth + 12
                                            color: root.lockVoice ? "#78350f" : "#1e293b"
                                            border.color: root.lockVoice ? "#f59e0b" : "#475569"
                                            border.width: 1
                                            Text {
                                                id: lockVoiceLabel
                                                anchors.centerIn: parent
                                                text: root.lockVoice ? "🔒 Voice Locked" : "🔓 Lock Voice"
                                                font.pixelSize: 9
                                                font.bold: root.lockVoice
                                                color: root.lockVoice ? "#fef3c7" : "#94a3b8"
                                            }
                                            MouseArea {
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: root.lockVoice = !root.lockVoice
                                            }
                                        }
                                    }

                                    Text {
                                        Layout.fillWidth: true
                                        wrapMode: Text.Wrap
                                        text: root.activeIdea.vocal_idiolect || "Standard natural speech."
                                        font.pixelSize: 12
                                        color: "#e2e8f0"
                                    }
                                }
                            }

                            // ==========================================
                            // SCENARIO STARTER HOOK (FIRST MESSAGE)
                            // ==========================================
                            Rectangle {
                                Layout.fillWidth: true
                                radius: 10
                                color: "#111827"
                                border.color: root.activeScenarioHook ? "#f59e0b" : "#374151"
                                border.width: 1
                                implicitHeight: scenarioCol.implicitHeight + 28

                                ColumnLayout {
                                    id: scenarioCol
                                    anchors.fill: parent
                                    anchors.margins: 14
                                    spacing: 8

                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 8
                                        Text {
                                            text: "⚡ OPENING SCENARIO STARTER (FIRST MESSAGE HOOK)"
                                            font.bold: true
                                            font.pixelSize: 11
                                            color: "#fbbf24"
                                        }
                                        Item { Layout.fillWidth: true }

                                        Button {
                                            height: 24
                                            implicitWidth: 150
                                            enabled: !root.isGenerating
                                            background: Rectangle {
                                                radius: 4
                                                color: parent.hovered ? "#92400e" : "#78350f"
                                                border.color: "#f59e0b"
                                            }
                                            contentItem: Text {
                                                anchors.centerIn: parent
                                                text: root.isGeneratingScenario ? "⏳ Drafting Scene..." : "⚡ Generate Hook"
                                                font.pixelSize: 10
                                                font.bold: true
                                                color: "#fef3c7"
                                            }
                                            onClicked: {
                                                if (root.activeIdea && typeof backend !== "undefined" && backend) {
                                                    root.isGeneratingScenario = true;
                                                    backend.generateScenarioHook(JSON.stringify(root.activeIdea));
                                                }
                                            }
                                        }

                                        Button {
                                            visible: Boolean(root.activeScenarioHook)
                                            height: 24
                                            implicitWidth: 90
                                            background: Rectangle {
                                                radius: 4
                                                color: parent.hovered ? "#374151" : "#1e293b"
                                                border.color: "#6b7280"
                                            }
                                            contentItem: Text {
                                                anchors.centerIn: parent
                                                text: "📋 Copy Hook"
                                                font.pixelSize: 10
                                                color: "#e2e8f0"
                                            }
                                            onClicked: {
                                                if (typeof backend !== "undefined" && backend) {
                                                    backend.copyToClipboard(root.activeScenarioHook);
                                                }
                                            }
                                        }
                                    }

                                    Text {
                                        Layout.fillWidth: true
                                        wrapMode: Text.Wrap
                                        visible: Boolean(root.activeScenarioHook)
                                        text: root.activeScenarioHook
                                        font.pixelSize: 12
                                        lineHeight: 1.4
                                        color: "#fed7aa"
                                    }

                                    Text {
                                        Layout.fillWidth: true
                                        visible: !root.activeScenarioHook
                                        text: "Generate an atmospheric opening roleplay starter with active domestic friction, tactile setting details, and direct dialogue."
                                        font.pixelSize: 11
                                        color: "#6b7280"
                                        font.italic: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // ==========================================
        // NATURAL LANGUAGE AI BRAINSTORMER VIEW (TAB 1)
