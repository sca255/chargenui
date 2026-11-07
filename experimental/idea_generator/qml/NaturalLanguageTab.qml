import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

RowLayout {
id: naturalLanguageWorkspaceView
            visible: root.currentTab === 1
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.alignment: Qt.AlignTop
            Layout.minimumHeight: 0
            spacing: 0

            // ------------------------------------------
            // LEFT COLUMN: NATURAL LANGUAGE PROMPT INPUT & CONTROLS
            // ------------------------------------------
            Rectangle {
                Layout.preferredWidth: 460
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

                        // Section Banner
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            RowLayout {
                                spacing: 8
                                Rectangle {
                                    width: 28
                                    height: 28
                                    radius: 6
                                    color: "#7c3aed"
                                    Text { anchors.centerIn: parent; text: "💬"; font.pixelSize: 14 }
                                }
                                Text {
                                    text: "Freeform AI Prompt Studio"
                                    font.bold: true
                                    font.pixelSize: 15
                                    color: "#f8fafc"
                                }
                            }
                            Text {
                                text: "Type any messy idea, character quote, trope, or dynamic in plain English. The AI will forge it into a full psychometric dossier."
                                font.pixelSize: 11
                                color: "#94a3b8"
                                wrapMode: Text.Wrap
                                Layout.fillWidth: true
                            }
                        }

                        // Main Natural Language Input Area
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "DESCRIBE YOUR CHARACTER IN NATURAL LANGUAGE"
                                    font.bold: true
                                    font.pixelSize: 11
                                    color: "#c084fc"
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: "Clear"
                                    font.pixelSize: 10
                                    color: "#f87171"
                                    visible: nlPromptArea.text.length > 0
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: nlPromptArea.text = ""
                                    }
                                }
                            }

                            ScrollView {
                                id: nlPromptScroll
                                Layout.fillWidth: true
                                implicitHeight: 130
                                clip: true

                                background: Rectangle {
                                    color: "#1e293b"
                                    radius: 8
                                    border.color: nlPromptArea.activeFocus ? "#a855f7" : "#334155"
                                    border.width: 1
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
                                    id: nlPromptArea
                                    width: nlPromptScroll.availableWidth
                                    wrapMode: TextArea.Wrap
                                    placeholderText: ""
                                    font.pixelSize: 12
                                    color: "#f8fafc"
                                    selectByMouse: true
                                    leftPadding: 10
                                    rightPadding: 10
                                    topPadding: 8
                                    bottomPadding: 8
                                    background: null
                                    // Custom placeholder: Basic style's built-in PlaceholderText causes a width binding loop inside ScrollView
                                    Text {
                                        x: parent.leftPadding
                                        y: parent.topPadding
                                        width: parent.width - parent.leftPadding - parent.rightPadding
                                        text: "Tell the AI anything... e.g.:\n- A tired elven knight who acts strict on patrol but secretly leaves sweets on my pillow and gets flustered when teased.\n- An overworked surgeon wife who refuses to rest until her husband physically drags her to bed and gives her strict orders."
                                        color: "#64748b"
                                        font: parent.font
                                        wrapMode: Text.Wrap
                                        visible: !parent.length && !parent.preeditText
                                    }
                                }
                            }
                        }

                        // Quick Inspiration Starters
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            Text {
                                text: "✨ INSPIRATION SEEDS (CLICK TO AUTO-FILL)"
                                font.bold: true
                                font.pixelSize: 10
                                color: "#94a3b8"
                            }

                            Flow {
                                Layout.fillWidth: true
                                spacing: 5

                                Repeater {
                                    model: [
                                        { label: "🌸 Flustered Knight", text: "A proud, serious knight lady who acts rigid on duty, but secretly has a massive sweet tooth, leaves honey cakes on my desk, and stammers when I praise her." },
                                        { label: "📚 Grumpy Scholar", text: "A haughty, sleep-deprived academy researcher wife who buries herself in archives, but gets clingy and defenseless whenever thunder storms roll in." },
                                        { label: "🏡 Workaholic Doctor", text: "An overworked surgeon wife of four years who refuses to take a day off until her husband physically drags her to bed and gives her strict resting orders." },
                                        { label: "🚀 Cynical Smuggler", text: "A sharp-tongued space smuggler who claims our marriage is just a tax evasion contract, but bought an absurdly expensive hyperdrive part for my ship." },
                                        { label: "👑 Disgraced Noble", text: "An aristocratic daughter of a fallen rival house married to me in an arranged truce; acts icy and haughty to disguise that she's touch-starved." },
                                        { label: "🍫 Pastry Chef Brat", text: "Perfectionist patisserie owner who manages her kitchen like an army general, but intentionally burns toast at home so her husband will put her over his knee." }
                                    ]

                                    Rectangle {
                                        height: 24
                                        radius: 12
                                        implicitWidth: chipLabel.implicitWidth + 14
                                        color: chipMa.containsMouse ? "#374151" : "#1e293b"
                                        border.color: chipMa.containsMouse ? "#c084fc" : "#334155"
                                        border.width: 1

                                        Text {
                                            id: chipLabel
                                            anchors.centerIn: parent
                                            text: modelData.label
                                            font.pixelSize: 10
                                            font.bold: true
                                            color: chipMa.containsMouse ? "#f3e8ff" : "#cbd5e1"
                                        }

                                        MouseArea {
                                            id: chipMa
                                            anchors.fill: parent
                                            hoverEnabled: true
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: nlPromptArea.text = modelData.text
                                        }
                                    }
                                }
                            }
                        }

                        // Creative Focus Mode
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
                                        implicitWidth: focusChipTxt2.implicitWidth + 14
                                        color: root.selectedFocusMode === modelData.id ? "#581c87" : "#1e293b"
                                        border.color: root.selectedFocusMode === modelData.id ? "#c084fc" : "#334155"
                                        border.width: root.selectedFocusMode === modelData.id ? 2 : 1
                                        Text {
                                            id: focusChipTxt2
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

                        // Power Dynamic & Correction Dial (With Off switch)
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "⚡ Dynamic & Correction Dial"
                                    font.pixelSize: 11
                                    font.bold: true
                                    color: root.correctionColor(root.selectedCorrectionTier)
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: root.correctionTitle(root.selectedCorrectionTier)
                                    font.bold: true
                                    font.pixelSize: 10
                                    color: root.correctionColor(root.selectedCorrectionTier)
                                }
                            }

                            // Row 1: Mode & Any Selectors
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                Repeater {
                                    model: [
                                        { id: "off", label: "🚫 Off" },
                                        { id: "any:r", label: "🎲 Any:R" },
                                        { id: "any:ai", label: "✨ Any:AI" }
                                    ]

                                    Rectangle {
                                        Layout.fillWidth: true
                                        height: 28
                                        radius: 6
                                        color: {
                                            var active = (root.selectedCorrectionTier === modelData.id);
                                            if (active) {
                                                if (modelData.id === "off") return "#334155";
                                                if (modelData.id === "any:r") return "#0369a1";
                                                if (modelData.id === "any:ai") return "#4c1d95";
                                            }
                                            if (modelData.id === "off") return "#0f172a";
                                            if (modelData.id === "any:r") return "#082f49";
                                            if (modelData.id === "any:ai") return "#2e1065";
                                            return "#1e293b";
                                        }
                                        border.color: {
                                            var active = (root.selectedCorrectionTier === modelData.id);
                                            if (active) {
                                                if (modelData.id === "off") return "#94a3b8";
                                                if (modelData.id === "any:r") return "#38bdf8";
                                                if (modelData.id === "any:ai") return "#a78bfa";
                                            }
                                            if (modelData.id === "off") return "#1e293b";
                                            if (modelData.id === "any:r") return "#0c4a6e";
                                            if (modelData.id === "any:ai") return "#3b0764";
                                            return "#334155";
                                        }
                                        border.width: (root.selectedCorrectionTier === modelData.id) ? 2 : 1

                                        Text {
                                            anchors.centerIn: parent
                                            text: modelData.label
                                            font.pixelSize: 10
                                            font.bold: root.selectedCorrectionTier === modelData.id
                                            color: {
                                                if (root.selectedCorrectionTier === modelData.id) return "#ffffff";
                                                if (modelData.id === "off") return "#64748b";
                                                if (modelData.id === "any:r") return "#7dd3fc";
                                                if (modelData.id === "any:ai") return "#d8b4fe";
                                                return "#94a3b8";
                                            }
                                        }

                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: root.selectedCorrectionTier = modelData.id
                                        }
                                    }
                                }
                            }

                            // Row 2: Specific Tiers
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                Repeater {
                                    model: [
                                        { id: "mild", label: "🌸 Mild" },
                                        { id: "correction", label: "⚖️ Correction" },
                                        { id: "heavy", label: "🔥 Heavy" }
                                    ]

                                    Rectangle {
                                        Layout.fillWidth: true
                                        height: 28
                                        radius: 6
                                        color: {
                                            var active = (root.selectedCorrectionTier === modelData.id) || (modelData.id === "correction" && root.selectedCorrectionTier === "medium");
                                            if (active) {
                                                if (modelData.id === "mild") return "#831843";
                                                if (modelData.id === "correction") return "#581c87";
                                                if (modelData.id === "heavy") return "#7f1d1d";
                                            }
                                            return "#1e293b";
                                        }
                                        border.color: {
                                            var active = (root.selectedCorrectionTier === modelData.id) || (modelData.id === "correction" && root.selectedCorrectionTier === "medium");
                                            if (active) {
                                                if (modelData.id === "mild") return "#f472b6";
                                                if (modelData.id === "correction") return "#c084fc";
                                                if (modelData.id === "heavy") return "#ef4444";
                                            }
                                            return "#334155";
                                        }
                                        border.width: ((root.selectedCorrectionTier === modelData.id) || (modelData.id === "correction" && root.selectedCorrectionTier === "medium")) ? 2 : 1

                                        Text {
                                            anchors.centerIn: parent
                                            text: modelData.label
                                            font.pixelSize: 10
                                            font.bold: (root.selectedCorrectionTier === modelData.id) || (modelData.id === "correction" && root.selectedCorrectionTier === "medium")
                                            color: ((root.selectedCorrectionTier === modelData.id) || (modelData.id === "correction" && root.selectedCorrectionTier === "medium")) ? "#ffffff" : "#94a3b8"
                                        }

                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: root.selectedCorrectionTier = modelData.id
                                        }
                                    }
                                }
                            }
                        }

                        // Dramatic & Emotional Stakes Dial
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "🎭 Dramatic Stakes Dial"
                                    font.pixelSize: 11
                                    font.bold: true
                                    color: root.intensityColor(root.selectedIntensity)
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: root.intensityTitle(root.selectedIntensity)
                                    font.bold: true
                                    font.pixelSize: 10
                                    color: root.intensityColor(root.selectedIntensity)
                                }
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                Repeater {
                                    model: [
                                        { id: "any", label: "✨ Any" },
                                        { id: "mild", label: "🌸 Mild" },
                                        { id: "medium", label: "⚖️ Med" },
                                        { id: "heavy", label: "🔥 High" }
                                    ]

                                    Rectangle {
                                        Layout.fillWidth: true
                                        height: 28
                                        radius: 6
                                        color: root.selectedIntensity === modelData.id ? "#4c1d95" : "#1e293b"
                                        border.color: root.selectedIntensity === modelData.id ? "#a78bfa" : "#334155"
                                        border.width: root.selectedIntensity === modelData.id ? 2 : 1

                                        Text {
                                            anchors.centerIn: parent
                                            text: modelData.label
                                            font.pixelSize: 10
                                            font.bold: root.selectedIntensity === modelData.id
                                            color: root.selectedIntensity === modelData.id ? "#ffffff" : "#94a3b8"
                                        }

                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: root.selectedIntensity = modelData.id
                                        }
                                    }
                                }
                            }
                        }

                        // ==========================================
                        // FEATURE: HISTORIC TIME & FANTASY TIME SELECTOR (NATURAL LANGUAGE)
                        // ==========================================
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "⏳ Era & Historical Timeline"
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
                                color: browseMouseNl.containsMouse ? "#1e293b" : "#090d16"
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
                                    id: browseMouseNl
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
                                implicitHeight: nlEraDossierCol.implicitHeight + 16
                                radius: 8
                                visible: root.selectedEra !== "off"
                                color: root.isUserEra(root.selectedEra) ? "#022c22" : (root.isFantasyEra(root.selectedEra) ? "#240a34" : "#1c1408")
                                border.color: root.isUserEra(root.selectedEra) ? "#10b981" : (root.isFantasyEra(root.selectedEra) ? "#a855f7" : "#b45309")
                                border.width: 1

                                ColumnLayout {
                                    id: nlEraDossierCol
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
                                            width: nlSpanDossierTxt.contentWidth + 8
                                            radius: 4
                                            color: "#0f172a"
                                            border.color: "#334155"
                                            Text {
                                                id: nlSpanDossierTxt
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

                        // Creativity (Temperature) Slider
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
                                    text: nlTempSlider.value.toFixed(2)
                                    font.bold: true
                                    font.pixelSize: 12
                                    color: "#a78bfa"
                                }
                            }

                            Slider {
                                id: nlTempSlider
                                Layout.fillWidth: true
                                from: 0.4
                                to: 1.2
                                value: 0.85
                                stepSize: 0.05
                            }
                        }

                        Item { height: 4 }

                        // Forge Button
                        Button {
                            id: nlForgeBtn
                            Layout.fillWidth: true
                            height: 48
                            enabled: !root.isGenerating && nlPromptArea.text.trim().length > 0

                            background: Rectangle {
                                radius: 8
                                gradient: Gradient {
                                    GradientStop { position: 0.0; color: nlForgeBtn.hovered ? "#9333ea" : "#7c3aed" }
                                    GradientStop { position: 1.0; color: nlForgeBtn.hovered ? "#7e22ce" : "#6d28d9" }
                                }
                                border.color: "#c084fc"
                                border.width: 1
                            }

                            contentItem: RowLayout {
                                anchors.centerIn: parent
                                spacing: 8
                                Text {
                                    text: root.isGenerating ? "⏳ Forging Concept from Prompt..." : "🧠 Forge Concept with AI (:5001)"
                                    font.bold: true
                                    font.pixelSize: 13
                                    color: "#ffffff"
                                }
                            }

                            onClicked: {
                                if (typeof backend !== "undefined" && backend) {
                                    backend.brainstormNaturalLanguage(
                                        nlPromptArea.text.trim(),
                                        root.selectedFocusMode,
                                        root.selectedIntensity,
                                        nlTempSlider.value,
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
            // RIGHT COLUMN: LIVE CONCEPT DOSSIER
            // ------------------------------------------
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                color: "#0b0f19"

                // Empty State
                Rectangle {
                    anchors.centerIn: parent
                    width: 480
                    implicitHeight: emptyCol.implicitHeight + 40
                    radius: 12
                    color: "#111827"
                    border.color: "#1f2937"
                    border.width: 1
                    visible: root.naturalIdea === null

                    ColumnLayout {
                        id: emptyCol
                        anchors.centerIn: parent
                        spacing: 12
                        width: parent.width - 40

                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: "💡"
                            font.pixelSize: 42
                        }
                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: "No Concept Forged Yet"
                            font.bold: true
                            font.pixelSize: 18
                            color: "#f8fafc"
                        }
                        Text {
                            Layout.fillWidth: true
                            horizontalAlignment: Text.AlignHCenter
                            wrapMode: Text.Wrap
                            text: "Type any freeform character thought, trope, or relationship dynamic in the box on the left (or click an inspiration seed) and hit 'Forge Concept with AI' to see a full psychological dossier generated here!"
                            font.pixelSize: 12
                            color: "#94a3b8"
                            lineHeight: 1.4
                        }
                    }
                }

                // Populated Concept Dossier
                ScrollView {
                    anchors.fill: parent
                    contentWidth: availableWidth
                    clip: true
                    visible: root.naturalIdea !== null

                    ColumnLayout {
                        width: parent.width
                        spacing: 16
                        anchors.margins: 24

                        // Top Action Bar
                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 10

                            // Send to CharGenUI Button
                            Button {
                                height: 38
                                implicitWidth: pushBtnContent2.implicitWidth + 24
                                background: Rectangle {
                                    radius: 8
                                    color: parent.hovered ? "#059669" : "#047857"
                                    border.color: "#10b981"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    id: pushBtnContent2
                                    anchors.centerIn: parent
                                    spacing: 8
                                    Text { text: "🚀"; font.pixelSize: 14 }
                                    Text {
                                        text: "Send to CharGenUI (:3333)"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#ffffff"
                                    }
                                }
                                onClicked: {
                                    if (root.naturalIdea && typeof backend !== "undefined" && backend) {
                                        var ideaCopy = Object.assign({}, root.naturalIdea);
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
                                id: enqueueNlBtn
                                height: 38
                                background: Rectangle {
                                    radius: 8
                                    color: enqueueNlBtn.hovered ? "#065f46" : "#064e3b"
                                    border.color: "#10b981"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 5
                                    Text { text: "📥"; font.pixelSize: 12 }
                                    Text { text: "Enqueue"; font.bold: true; font.pixelSize: 11; color: "#ecfdf5" }
                                }
                                onClicked: {
                                    if (root.naturalIdea && typeof backend !== "undefined" && backend) {
                                        var raw = JSON.stringify(root.naturalIdea);
                                        var id = backend.addToGrimoire(raw, "natural_language");
                                        if (id) backend.enqueueGrimoireItem(id);
                                    }
                                }
                            }

                            // Send to Studio Forge Button
                            Button {
                                height: 38
                                implicitWidth: studioLoadContent.implicitWidth + 20
                                background: Rectangle {
                                    radius: 8
                                    color: parent.hovered ? "#4338ca" : "#3730a3"
                                    border.color: "#818cf8"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    id: studioLoadContent
                                    anchors.centerIn: parent
                                    spacing: 8
                                    Text { text: "📥"; font.pixelSize: 14 }
                                    Text {
                                        text: "Load into Studio (Lock & Reroll)"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#ffffff"
                                    }
                                }
                                onClicked: {
                                    if (root.naturalIdea && typeof backend !== "undefined" && backend) {
                                        root.activeIdea = root.naturalIdea;
                                        root.currentTab = 0;
                                        backend.toast("📥 Concept loaded into Studio Forge! Locks and slot-reroll active.");
                                    }
                                }
                            }

                            // Copy Concept Button
                            Button {
                                height: 38
                                implicitWidth: copyBtnContent2.implicitWidth + 20
                                background: Rectangle {
                                    radius: 8
                                    color: parent.hovered ? "#334155" : "#1e293b"
                                    border.color: "#475569"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    id: copyBtnContent2
                                    anchors.centerIn: parent
                                    spacing: 8
                                    Text { text: "📋"; font.pixelSize: 14 }
                                    Text {
                                        text: "Copy Concept (Sauce)"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#cbd5e1"
                                    }
                                }
                                onClicked: {
                                    if (root.naturalIdea && typeof backend !== "undefined" && backend) {
                                        var sauce = backend.formatConceptSauce(JSON.stringify(root.naturalIdea));
                                        backend.copyToClipboard(sauce || root.naturalIdea.premise || "");
                                    }
                                }
                            }

                            Item { Layout.fillWidth: true }
                        }

                        // Character Identity Card
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 12
                            color: "#111827"
                            border.color: "#1f2937"
                            border.width: 1
                            implicitHeight: charHeaderCol2.implicitHeight + 36

                            ColumnLayout {
                                id: charHeaderCol2
                                anchors.fill: parent
                                anchors.margins: 18
                                spacing: 8

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 12

                                    Text {
                                        text: (root.naturalIdea && root.naturalIdea.name) ? root.naturalIdea.name : "Custom Character"
                                        font.bold: true
                                        font.pixelSize: 26
                                        color: "#f8fafc"
                                    }

                                    // Source Label
                                    Rectangle {
                                        radius: 6
                                        height: 24
                                        implicitWidth: sourceLabel2.implicitWidth + 14
                                        color: "#1e1b4b"
                                        border.color: "#6366f1"
                                        border.width: 1
                                        Text {
                                            id: sourceLabel2
                                            anchors.centerIn: parent
                                            text: (root.naturalIdea && root.naturalIdea.source) ? root.naturalIdea.source : "Natural Language Forge"
                                            font.pixelSize: 10
                                            color: "#c7d2fe"
                                        }
                                    }

                                    // Intensity Badge
                                    Rectangle {
                                        radius: 6
                                        height: 24
                                        implicitWidth: intensityBadgeLabel2.implicitWidth + 14
                                        color: root.naturalIdea && root.naturalIdea.intensity === "mild" ? "#4c0519" :
                                               root.naturalIdea && root.naturalIdea.intensity === "heavy" ? "#450a0a" : "#2e1065"
                                        border.color: root.naturalIdea && root.naturalIdea.intensity === "mild" ? "#f472b6" :
                                                      root.naturalIdea && root.naturalIdea.intensity === "heavy" ? "#ef4444" : "#c084fc"
                                        border.width: 1
                                        Text {
                                            id: intensityBadgeLabel2
                                            anchors.centerIn: parent
                                            text: root.naturalIdea ? root.intensityTitle(root.naturalIdea.intensity || root.selectedIntensity) : ""
                                            font.pixelSize: 10
                                            font.bold: true
                                            color: root.naturalIdea ? root.intensityColor(root.naturalIdea.intensity || root.selectedIntensity) : "#c084fc"
                                        }
                                    }

                                    Item { Layout.fillWidth: true }
                                }

                                Text {
                                    text: (root.naturalIdea && root.naturalIdea.title) ? root.naturalIdea.title : "The Roleplay Concept"
                                    font.bold: true
                                    font.pixelSize: 15
                                    color: "#c084fc"
                                }

                                Text {
                                    text: "“" + (root.naturalIdea && root.naturalIdea.tagline ? root.naturalIdea.tagline : "") + "”"
                                    font.italic: true
                                    font.pixelSize: 13
                                    color: "#94a3b8"
                                    visible: Boolean(root.naturalIdea && root.naturalIdea.tagline)
                                }

                                // Tags Flow
                                Flow {
                                    Layout.fillWidth: true
                                    spacing: 6
                                    Repeater {
                                        model: (root.naturalIdea && root.naturalIdea.tags) ? root.naturalIdea.tags : []
                                        Rectangle {
                                            height: 22
                                            radius: 4
                                            color: "#1e293b"
                                            implicitWidth: tagText2.implicitWidth + 12
                                            Text {
                                                id: tagText2
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

                        // AI Brainstorm Notes Box
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 10
                            color: "#111827"
                            border.color: "#f59e0b"
                            border.width: 1
                            visible: Boolean(root.naturalIdea && root.naturalIdea.brainstorm_notes)
                            implicitHeight: notesCol.implicitHeight + 28

                            ColumnLayout {
                                id: notesCol
                                anchors.fill: parent
                                anchors.margins: 14
                                spacing: 6

                                RowLayout {
                                    Layout.fillWidth: true
                                    Text {
                                        text: "💡 AI DESIGNER COMMENTARY & ROLEPLAY GUIDE"
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#fbbf24"
                                    }
                                }

                                Text {
                                    Layout.fillWidth: true
                                    wrapMode: Text.Wrap
                                    text: (root.naturalIdea && root.naturalIdea.brainstorm_notes) ? root.naturalIdea.brainstorm_notes : ""
                                    font.pixelSize: 12
                                    lineHeight: 1.35
                                    color: "#fef3c7"
                                }
                            }
                        }

                        // The Premise Box (Playable Concept)
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 10
                            color: "#111827"
                            border.color: "#10b981"
                            border.width: 1
                            implicitHeight: premiseCol2.implicitHeight + 32

                            ColumnLayout {
                                id: premiseCol2
                                anchors.fill: parent
                                anchors.margins: 16
                                spacing: 8

                                RowLayout {
                                    Layout.fillWidth: true
                                    Text {
                                        text: "💡 PLAYABLE CONCEPT (PASTE DIRECTLY INTO CHARGEN UI)"
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#34d399"
                                    }
                                    Item { Layout.fillWidth: true }
                                }

                                Text {
                                    Layout.fillWidth: true
                                    wrapMode: Text.Wrap
                                    text: (root.naturalIdea && root.naturalIdea.premise) ? root.naturalIdea.premise : ""
                                    font.pixelSize: 13
                                    lineHeight: 1.4
                                    color: "#f3f4f6"
                                    font.family: "monospace"
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
                            implicitHeight: contraCol2.implicitHeight + 28

                            ColumnLayout {
                                id: contraCol2
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
                                }

                                Text {
                                    Layout.fillWidth: true
                                    wrapMode: Text.Wrap
                                    text: (root.naturalIdea && root.naturalIdea.central_contradiction) ? root.naturalIdea.central_contradiction : "Unspecified"
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
                            border.color: "#38bdf8"
                            border.width: 1
                            implicitHeight: gradCol2.implicitHeight + 28

                            ColumnLayout {
                                id: gradCol2
                                anchors.fill: parent
                                anchors.margins: 14
                                spacing: 10

                                RowLayout {
                                    Layout.fillWidth: true
                                    Text {
                                        text: "🎯 CALIBRATED REACTION GRADIENT"
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#38bdf8"
                                    }
                                }

                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 6

                                    RowLayout {
                                        spacing: 8
                                        Rectangle { width: 80; height: 22; radius: 4; color: "#7f1d1d"; Text { anchors.centerIn: parent; text: "WON'T"; font.bold: true; font.pixelSize: 10; color: "#fca5a5" } }
                                        Text { Layout.fillWidth: true; wrapMode: Text.Wrap; text: (root.naturalIdea && root.naturalIdea.reaction_gradient && root.naturalIdea.reaction_gradient.wont) ? root.naturalIdea.reaction_gradient.wont : "-"; font.pixelSize: 12; color: "#cbd5e1" }
                                    }

                                    RowLayout {
                                        spacing: 8
                                        Rectangle { width: 80; height: 22; radius: 4; color: "#831843"; Text { anchors.centerIn: parent; text: "CRAVES"; font.bold: true; font.pixelSize: 10; color: "#f9a8d4" } }
                                        Text { Layout.fillWidth: true; wrapMode: Text.Wrap; text: (root.naturalIdea && root.naturalIdea.reaction_gradient && root.naturalIdea.reaction_gradient.craves) ? root.naturalIdea.reaction_gradient.craves : "-"; font.pixelSize: 12; color: "#cbd5e1" }
                                    }

                                    RowLayout {
                                        spacing: 8
                                        Rectangle { width: 80; height: 22; radius: 4; color: "#1e293b"; Text { anchors.centerIn: parent; text: "NEUTRAL"; font.bold: true; font.pixelSize: 10; color: "#94a3b8" } }
                                        Text { Layout.fillWidth: true; wrapMode: Text.Wrap; text: (root.naturalIdea && root.naturalIdea.reaction_gradient && root.naturalIdea.reaction_gradient.neutral) ? root.naturalIdea.reaction_gradient.neutral : "-"; font.pixelSize: 12; color: "#94a3b8" }
                                    }

                                    RowLayout {
                                        spacing: 8
                                        Rectangle { width: 80; height: 22; radius: 4; color: "#064e3b"; Text { anchors.centerIn: parent; text: "WILL"; font.bold: true; font.pixelSize: 10; color: "#6ee7b7" } }
                                        Text { Layout.fillWidth: true; wrapMode: Text.Wrap; text: (root.naturalIdea && root.naturalIdea.reaction_gradient && root.naturalIdea.reaction_gradient.will) ? root.naturalIdea.reaction_gradient.will : "-"; font.pixelSize: 12; color: "#cbd5e1" }
                                    }

                                    RowLayout {
                                        spacing: 8
                                        Rectangle { width: 80; height: 22; radius: 4; color: "#312e81"; Text { anchors.centerIn: parent; text: "TRUST GATE"; font.bold: true; font.pixelSize: 10; color: "#a5b4fc" } }
                                        Text { Layout.fillWidth: true; wrapMode: Text.Wrap; text: (root.naturalIdea && root.naturalIdea.reaction_gradient && root.naturalIdea.reaction_gradient.trust_gate) ? root.naturalIdea.reaction_gradient.trust_gate : "-"; font.pixelSize: 12; color: "#cbd5e1" }
                                    }
                                }
                            }
                        }

                        // Vocal Cadence Box
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 10
                            color: "#111827"
                            border.color: "#fbbf24"
                            border.width: 1
                            implicitHeight: voiceCol2.implicitHeight + 28

                            ColumnLayout {
                                id: voiceCol2
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
                                }

                                Text {
                                    Layout.fillWidth: true
                                    wrapMode: Text.Wrap
                                    text: (root.naturalIdea && root.naturalIdea.vocal_idiolect) ? root.naturalIdea.vocal_idiolect : "Standard natural speech."
                                    font.pixelSize: 12
                                    color: "#e2e8f0"
                                }
                            }
                        }

                        // Scenario Starter Hook Card
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 10
                            color: "#111827"
                            border.color: root.activeScenarioHook ? "#f59e0b" : "#374151"
                            border.width: 1
                            implicitHeight: scenarioCol2.implicitHeight + 28

                            ColumnLayout {
                                id: scenarioCol2
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
                                            if (root.naturalIdea && typeof backend !== "undefined" && backend) {
                                                root.isGeneratingScenario = true;
                                                backend.generateScenarioHook(JSON.stringify(root.naturalIdea));
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
                                    text: "Click 'Generate Hook' to draft an atmospheric opening scene starter from this concept."
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


        // ==========================================
        // DEDICATED AI AGENT WORKSPACE VIEW (TAB 2)
