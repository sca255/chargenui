import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Item {
id: grimoireWorkspaceView
            visible: root.currentTab === 3
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.alignment: Qt.AlignTop
            Layout.minimumHeight: 0

            ScrollView {
                id: grimoireScrollView
                anchors.fill: parent
                anchors.leftMargin: 24
                anchors.rightMargin: 24
                anchors.topMargin: 16
                anchors.bottomMargin: 16
                contentWidth: availableWidth
                clip: true

                ColumnLayout {
                    width: grimoireScrollView.availableWidth
                    spacing: 16

                    Item { height: 4 }

                // ------------------------------------------
                // 1. BANNER & STATS
                // ------------------------------------------
                Rectangle {
                    Layout.fillWidth: true
                    height: 64
                    radius: 10
                    color: "#18181b"
                    border.color: "#3f3f46"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 14
                        spacing: 12

                        Text { text: "📖"; font.pixelSize: 26 }

                        ColumnLayout {
                            spacing: 2
                            Text {
                                text: "THE IDEA GRIMOIRE & SEQUENTIAL DISPATCH QUEUE"
                                font.bold: true
                                font.pixelSize: 14
                                color: "#f8fafc"
                            }
                            Text {
                                text: "Curate, grade, and annotate concepts, then sequentially dispatch them to CharGenUI (:3333)."
                                font.pixelSize: 11
                                color: "#94a3b8"
                            }
                        }

                        Item { Layout.fillWidth: true }

                        Rectangle {
                            height: 28
                            radius: 14
                            color: "#312e81"
                            border.color: "#6366f1"
                            border.width: 1
                            implicitWidth: grimCountLabel.implicitWidth + 20

                            Text {
                                id: grimCountLabel
                                anchors.centerIn: parent
                                text: root.grimoireList.length + " Concepts Staged"
                                font.pixelSize: 11
                                font.bold: true
                                color: "#c7d2fe"
                            }
                        }
                    }
                }

                // ------------------------------------------
                // 2. SEQUENTIAL DISPATCH QUEUE (CHARGENUI OUTBOX)
                // ------------------------------------------
                Rectangle {
                    Layout.fillWidth: true
                    radius: 12
                    color: "#0f172a"
                    border.color: (root.queueData && root.queueData.active_item) ? "#10b981" : "#3b82f6"
                    border.width: (root.queueData && root.queueData.active_item) ? 2 : 1
                    implicitHeight: queueContentCol.implicitHeight + 28

                    ColumnLayout {
                        id: queueContentCol
                        anchors.fill: parent
                        anchors.margins: 14
                        spacing: 12

                        // Header Row
                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 8

                            Text { text: "🚀"; font.pixelSize: 15 }
                            Text {
                                text: "CHARGENUI SEQUENTIAL DISPATCH QUEUE"
                                font.bold: true
                                font.pixelSize: 12
                                color: "#f8fafc"
                            }

                            Rectangle {
                                height: 20
                                radius: 10
                                color: (root.queueData && root.queueData.queue && root.queueData.queue.length > 0) ? "#065f46" : "#334155"
                                implicitWidth: queueCountTxt.implicitWidth + 12
                                Text {
                                    id: queueCountTxt
                                    anchors.centerIn: parent
                                    text: (root.queueData && root.queueData.queue ? root.queueData.queue.length : 0) + " in Queue"
                                    font.pixelSize: 10
                                    font.bold: true
                                    color: (root.queueData && root.queueData.queue && root.queueData.queue.length > 0) ? "#6ee7b7" : "#94a3b8"
                                }
                            }

                            Item { Layout.fillWidth: true }

                            Rectangle {
                                height: 24
                                radius: 12
                                color: root.isCharGenOnline ? "#064e3b" : "#450a0a"
                                border.color: root.isCharGenOnline ? "#10b981" : "#ef4444"
                                border.width: 1
                                implicitWidth: queueIpcStatusTxt.implicitWidth + 16

                                Text {
                                    id: queueIpcStatusTxt
                                    anchors.centerIn: parent
                                    text: root.isCharGenOnline ? "● CharGenUI :3333 Connected" : "○ CharGenUI Offline"
                                    font.pixelSize: 10
                                    font.bold: true
                                    color: root.isCharGenOnline ? "#6ee7b7" : "#fca5a5"
                                }
                            }

                            Button {
                                height: 24
                                visible: root.queueData && root.queueData.queue && root.queueData.queue.length > 0
                                background: Rectangle {
                                    radius: 4
                                    color: parent.hovered ? "#450a0a" : "#1e293b"
                                    border.color: "#ef4444"
                                    border.width: 1
                                }
                                contentItem: Text {
                                    anchors.centerIn: parent
                                    text: "Clear Queue"
                                    font.pixelSize: 10
                                    color: "#fca5a5"
                                }
                                onClicked: if (typeof backend !== "undefined" && backend) backend.clearQueue()
                            }
                        }

                        // Active Card / Queue Stage Banner
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 8
                            color: (root.queueData && root.queueData.active_item) ? "#064e3b" : "#1e293b"
                            border.color: (root.queueData && root.queueData.active_item) ? "#10b981" : "#475569"
                            border.width: 1
                            implicitHeight: activeCardContentCol.implicitHeight + 20

                            ColumnLayout {
                                id: activeCardContentCol
                                anchors.fill: parent
                                anchors.margins: 12
                                spacing: 8

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 8

                                    Rectangle {
                                        height: 22
                                        radius: 4
                                        color: (root.queueData && root.queueData.active_item) ? "#10b981" : "#64748b"
                                        implicitWidth: activeCardBadgeTxt.implicitWidth + 12
                                        Text {
                                            id: activeCardBadgeTxt
                                            anchors.centerIn: parent
                                            text: (root.queueData && root.queueData.active_item) ? "● CURRENTLY IN CHARGENUI" : "READY TO SEND"
                                            font.pixelSize: 9
                                            font.bold: true
                                            color: "#ffffff"
                                        }
                                    }

                                    Text {
                                        Layout.fillWidth: true
                                        text: (root.queueData && root.queueData.active_item)
                                            ? ((root.queueData.active_item.character.name || "Character") + " — " + (root.queueData.active_item.character.title || ""))
                                            : ((root.queueData && root.queueData.queue && root.queueData.queue.length > 0)
                                                ? ("Up Next: " + (root.queueData.queue[0].character.name || "Character") + " (" + (root.queueData.queue[0].character.title || "") + ")")
                                                : "Queue is empty. Select ideas from the Grimoire below and click '[ ➕ Add to Queue ]'.")
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#f8fafc"
                                        elide: Text.ElideRight
                                    }

                                    Rectangle {
                                        height: 20
                                        radius: 4
                                        color: "#451a03"
                                        border.color: "#f59e0b"
                                        border.width: 1
                                        visible: root.queueData && Boolean(root.queueData.active_item && root.queueData.active_item.character && root.queueData.active_item.character.era)
                                        implicitWidth: queueEraBadgeTxt.implicitWidth + 10
                                        Text {
                                            id: queueEraBadgeTxt
                                            anchors.centerIn: parent
                                            text: (root.queueData && root.queueData.active_item && root.queueData.active_item.character && root.queueData.active_item.character.era) ? root.queueData.active_item.character.era : ""
                                            font.pixelSize: 9
                                            font.bold: true
                                            color: "#fbbf24"
                                            elide: Text.ElideRight
                                            maximumLineCount: 1
                                        }
                                    }

                                    // Action buttons for active card
                                    Button {
                                        id: doneAdvanceBtn
                                        height: 30
                                        visible: root.queueData && Boolean(root.queueData.active_item)
                                        background: Rectangle {
                                            radius: 6
                                            color: doneAdvanceBtn.hovered ? "#059669" : "#10b981"
                                        }
                                        contentItem: RowLayout {
                                            anchors.centerIn: parent
                                            spacing: 4
                                            Text { text: "✅"; font.pixelSize: 11 }
                                            Text { text: "Finished in CharGenUI & Send Next"; font.bold: true; font.pixelSize: 11; color: "#ffffff" }
                                        }
                                        onClicked: {
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.completeActiveAndAdvance(true, root.autoGenerateOnSend);
                                            }
                                        }
                                    }

                                    Button {
                                        id: sendNextBtn
                                        height: 30
                                        visible: (!root.queueData || !root.queueData.active_item) && (root.queueData && root.queueData.queue && root.queueData.queue.length > 0)
                                        background: Rectangle {
                                            radius: 6
                                            color: sendNextBtn.hovered ? "#4f46e5" : "#6366f1"
                                        }
                                        contentItem: RowLayout {
                                            anchors.centerIn: parent
                                            spacing: 4
                                            Text { text: "🚀"; font.pixelSize: 11 }
                                            Text { text: "Dispatch Next to CharGenUI"; font.bold: true; font.pixelSize: 11; color: "#ffffff" }
                                        }
                                        onClicked: {
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.sendActiveQueueItem(root.autoGenerateOnSend);
                                            }
                                        }
                                    }

                                    Button {
                                        id: resendBtn
                                        height: 30
                                        visible: root.queueData && Boolean(root.queueData.active_item)
                                        background: Rectangle {
                                            radius: 6
                                            color: resendBtn.hovered ? "#334155" : "#1e293b"
                                            border.color: "#64748b"
                                            border.width: 1
                                        }
                                        contentItem: Text {
                                            anchors.centerIn: parent
                                            text: "🔁 Resend"
                                            font.pixelSize: 10
                                            color: "#cbd5e1"
                                        }
                                        onClicked: {
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.sendActiveQueueItem(root.autoGenerateOnSend);
                                            }
                                        }
                                    }
                                }

                                Text {
                                    Layout.fillWidth: true
                                    visible: root.queueData && Boolean(root.queueData.active_item)
                                    text: (root.queueData && root.queueData.active_item) ? (root.queueData.active_item.character.tagline || root.queueData.active_item.character.premise || "") : ""
                                    font.pixelSize: 11
                                    color: "#a7f3d0"
                                    wrapMode: Text.WordWrap
                                    maximumLineCount: 2
                                    elide: Text.ElideRight
                                }
                            }
                        }

                        // Up Next Horizontal Chips
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6
                            visible: root.queueData && root.queueData.queue && root.queueData.queue.length > 1

                            Text {
                                text: "UP NEXT IN QUEUE:"
                                font.bold: true
                                font.pixelSize: 10
                                color: "#94a3b8"
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                Repeater {
                                    model: (root.queueData && root.queueData.queue) ? root.queueData.queue.slice(1, 6) : []
                                    delegate: Rectangle {
                                        height: 32
                                        radius: 6
                                        color: "#1e293b"
                                        border.color: "#334155"
                                        border.width: 1
                                        implicitWidth: qChipRow.implicitWidth + 14

                                        RowLayout {
                                            id: qChipRow
                                            anchors.centerIn: parent
                                            spacing: 6

                                            Text {
                                                text: "#" + (index + 2)
                                                font.bold: true
                                                font.pixelSize: 10
                                                color: "#818cf8"
                                            }
                                            Text {
                                                text: modelData.character.name || "Concept"
                                                font.pixelSize: 11
                                                font.bold: true
                                                color: "#f8fafc"
                                            }
                                            Text {
                                                text: "✕"
                                                font.pixelSize: 10
                                                color: "#94a3b8"
                                                MouseArea {
                                                    anchors.fill: parent
                                                    cursorShape: Qt.PointingHandCursor
                                                    onClicked: {
                                                        if (typeof backend !== "undefined" && backend) {
                                                            backend.dequeueGrimoireItem(modelData.id);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // ------------------------------------------
                // 3. SEARCH & FILTER CONTROLS
                // ------------------------------------------
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 10

                        TextField {
                            id: grimSearchField
                            Layout.fillWidth: true
                            height: 38
                            placeholderText: "🔍 Filter Grimoire by character name, archetype, dynamic, or tags..."
                            color: "#f8fafc"
                            text: root.grimoireSearch
                            onTextChanged: root.grimoireSearch = text
                            background: Rectangle {
                                color: "#1e293b"
                                radius: 6
                                border.color: grimSearchField.activeFocus ? "#8b5cf6" : "#334155"
                                border.width: 1
                            }
                        }

                        Button {
                            height: 38
                            background: Rectangle {
                                radius: 6
                                color: parent.hovered ? "#450a0a" : "#1e293b"
                                border.color: "#ef4444"
                                border.width: 1
                            }
                            contentItem: Text {
                                anchors.centerIn: parent
                                text: "🧹 Purge Discards"
                                font.pixelSize: 11
                                color: "#fca5a5"
                            }
                            onClicked: {
                                if (typeof backend !== "undefined" && backend) {
                                    backend.clearGrimoire("discard");
                                }
                            }
                        }

                        // Clear Entire Grimoire Button (with safety confirmation)
                        Button {
                            id: clearGrimoireBtn
                            property bool confirming: false
                            height: 38
                            background: Rectangle {
                                radius: 6
                                color: clearGrimoireBtn.confirming ? "#7f1d1d" : (clearGrimoireBtn.hovered ? "#3b0764" : "#1e293b")
                                border.color: clearGrimoireBtn.confirming ? "#f87171" : "#a855f7"
                                border.width: 1
                            }
                            contentItem: RowLayout {
                                anchors.centerIn: parent
                                spacing: 4
                                Text { text: clearGrimoireBtn.confirming ? "⚠️" : "🗑️"; font.pixelSize: 11 }
                                Text {
                                    text: clearGrimoireBtn.confirming ? "Confirm Clear All?" : "Clear Grimoire"
                                    font.bold: clearGrimoireBtn.confirming
                                    font.pixelSize: 11
                                    color: clearGrimoireBtn.confirming ? "#ffffff" : "#d8b4fe"
                                }
                            }
                            Timer {
                                id: resetClearConfirmTimer
                                interval: 3500
                                repeat: false
                                onTriggered: clearGrimoireBtn.confirming = false
                            }
                            onClicked: {
                                if (!confirming) {
                                    confirming = true;
                                    resetClearConfirmTimer.restart();
                                } else {
                                    confirming = false;
                                    resetClearConfirmTimer.stop();
                                    if (typeof backend !== "undefined" && backend) {
                                        backend.clearGrimoire("all");
                                    }
                                }
                            }
                        }
                    }

                    // Filter Chips Row
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 6

                        Repeater {
                            model: [
                                { "id": "all", "label": "All (" + root.grimoireList.length + ")", "icon": "📚" },
                                { "id": "keeper", "label": "Keepers", "icon": "💎" },
                                { "id": "4star", "label": "Top Rated", "icon": "⭐" },
                                { "id": "refine", "label": "Refine", "icon": "✏️" },
                                { "id": "discard", "label": "Discarded", "icon": "🗑️" }
                            ]
                            delegate: Rectangle {
                                height: 32
                                radius: 6
                                color: root.grimoireFilter === modelData.id ? "#7c3aed" : (fChipMa.containsMouse ? "#334155" : "#1e293b")
                                border.color: root.grimoireFilter === modelData.id ? "#c084fc" : "#475569"
                                border.width: 1
                                implicitWidth: fChipRow.implicitWidth + 16

                                RowLayout {
                                    id: fChipRow
                                    anchors.centerIn: parent
                                    spacing: 4
                                    Text { text: modelData.icon; font.pixelSize: 11 }
                                    Text {
                                        text: modelData.label
                                        font.pixelSize: 11
                                        font.bold: root.grimoireFilter === modelData.id
                                        color: root.grimoireFilter === modelData.id ? "#ffffff" : "#cbd5e1"
                                    }
                                }

                                MouseArea {
                                    id: fChipMa
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: root.grimoireFilter = modelData.id
                                }
                            }
                        }
                        Item { Layout.fillWidth: true }
                    }
                }

                // Empty State Display
                Rectangle {
                    Layout.fillWidth: true
                    height: 140
                    radius: 12
                    color: "#18181b"
                    border.color: "#27272a"
                    visible: root.getFilteredGrimoire().length === 0

                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 8
                        Text { Layout.alignment: Qt.AlignHCenter; text: "📖"; font.pixelSize: 28 }
                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: root.grimoireList.length === 0 ? "Your Grimoire is currently empty." : "No concepts match your filter criteria."
                            font.bold: true
                            font.pixelSize: 13
                            color: "#94a3b8"
                        }
                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: "Generate concepts in Studio Forge, Natural Language, Agent Mode, or Batch Forge to automatically stage them here!"
                            font.pixelSize: 11
                            color: "#64748b"
                        }
                    }
                }

                // ------------------------------------------
                // 4. GRIMOIRE CARDS REPEATER
                // ------------------------------------------
                Repeater {
                    model: root.getFilteredGrimoire()
                    delegate: Rectangle {
                        id: cardRoot
                        Layout.fillWidth: true
                        radius: 12
                        color: "#111827"
                        border.color: (modelData.queue_status === "active") ? "#10b981" : (modelData.triage === "keeper" ? "#059669" : (modelData.triage === "discard" ? "#7f1d1d" : "#1f2937"))
                        border.width: (modelData.queue_status === "active" || modelData.triage === "keeper") ? 2 : 1
                        implicitHeight: cardCol.implicitHeight + 24

                        property bool isExpanded: false

                        ColumnLayout {
                            id: cardCol
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 12

                            // Top Header Row
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                // Source Badge
                                Rectangle {
                                    height: 22
                                    radius: 4
                                    color: "#1e293b"
                                    border.color: "#334155"
                                    border.width: 1
                                    implicitWidth: srcBadgeLabel.implicitWidth + 12
                                    Text {
                                        id: srcBadgeLabel
                                        anchors.centerIn: parent
                                        text: (modelData.source === "batch_forge" ? "🎲 Batch" : (modelData.source === "natural_language" ? "💡 NL AI" : (modelData.source === "agent" ? "🤖 Agent" : "⚙️ Studio")))
                                        font.pixelSize: 9
                                        font.bold: true
                                        color: "#a5b4fc"
                                    }
                                }

                                // Era Badge
                                Rectangle {
                                    height: 22
                                    radius: 4
                                    color: "#451a03"
                                    border.color: "#f59e0b"
                                    border.width: 1
                                    visible: Boolean(modelData.character && modelData.character.era)
                                    implicitWidth: eraBadgeLabel.implicitWidth + 12
                                    Text {
                                        id: eraBadgeLabel
                                        anchors.centerIn: parent
                                        text: (modelData.character && modelData.character.era) ? modelData.character.era : ""
                                        font.pixelSize: 9
                                        font.bold: true
                                        color: "#fbbf24"
                                        elide: Text.ElideRight
                                        maximumLineCount: 1
                                    }
                                }

                                Text {
                                    text: modelData.timestamp || ""
                                    font.pixelSize: 10
                                    color: "#64748b"
                                }

                                Text {
                                    text: modelData.character.name || "Character"
                                    font.bold: true
                                    font.pixelSize: 15
                                    color: "#f8fafc"
                                }

                                Text {
                                    text: modelData.character.title ? ("— " + modelData.character.title) : ""
                                    font.pixelSize: 12
                                    font.italic: true
                                    color: "#c084fc"
                                    elide: Text.ElideRight
                                    Layout.fillWidth: true
                                }

                                // Interactive Star Rating Widget (1 to 5)
                                RowLayout {
                                    spacing: 2
                                    Repeater {
                                        model: 5
                                        delegate: Text {
                                            text: (index < (modelData.rating || 0)) ? "★" : "☆"
                                            font.pixelSize: 16
                                            color: (index < (modelData.rating || 0)) ? "#fbbf24" : "#475569"
                                            MouseArea {
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: {
                                                    var newRating = (modelData.rating === (index + 1)) ? 0 : (index + 1);
                                                    if (typeof backend !== "undefined" && backend) {
                                                        backend.updateGrimoireItem(modelData.id, newRating, modelData.triage || "inbox", modelData.notes || "");
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                Item { width: 4 }

                                // Triage Selector Chips
                                RowLayout {
                                    spacing: 4

                                    // Keeper
                                    Rectangle {
                                        height: 24
                                        radius: 4
                                        color: modelData.triage === "keeper" ? "#065f46" : "#1e293b"
                                        border.color: modelData.triage === "keeper" ? "#10b981" : "#334155"
                                        border.width: 1
                                        implicitWidth: keeperTxt.implicitWidth + 10
                                        Text {
                                            id: keeperTxt
                                            anchors.centerIn: parent
                                            text: "💎 Keeper"
                                            font.pixelSize: 10
                                            font.bold: modelData.triage === "keeper"
                                            color: modelData.triage === "keeper" ? "#6ee7b7" : "#94a3b8"
                                        }
                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: {
                                                var nextTriage = modelData.triage === "keeper" ? "inbox" : "keeper";
                                                if (typeof backend !== "undefined" && backend) {
                                                    backend.updateGrimoireItem(modelData.id, modelData.rating || 0, nextTriage, modelData.notes || "");
                                                }
                                            }
                                        }
                                    }

                                    // Refine
                                    Rectangle {
                                        height: 24
                                        radius: 4
                                        color: modelData.triage === "refine" ? "#78350f" : "#1e293b"
                                        border.color: modelData.triage === "refine" ? "#f59e0b" : "#334155"
                                        border.width: 1
                                        implicitWidth: refineTxt.implicitWidth + 10
                                        Text {
                                            id: refineTxt
                                            anchors.centerIn: parent
                                            text: "✏️ Refine"
                                            font.pixelSize: 10
                                            font.bold: modelData.triage === "refine"
                                            color: modelData.triage === "refine" ? "#fde68a" : "#94a3b8"
                                        }
                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: {
                                                var nextTriage = modelData.triage === "refine" ? "inbox" : "refine";
                                                if (typeof backend !== "undefined" && backend) {
                                                    backend.updateGrimoireItem(modelData.id, modelData.rating || 0, nextTriage, modelData.notes || "");
                                                }
                                            }
                                        }
                                    }

                                    // Discard
                                    Rectangle {
                                        height: 24
                                        radius: 4
                                        color: modelData.triage === "discard" ? "#450a0a" : "#1e293b"
                                        border.color: modelData.triage === "discard" ? "#ef4444" : "#334155"
                                        border.width: 1
                                        implicitWidth: discardTxt.implicitWidth + 10
                                        Text {
                                            id: discardTxt
                                            anchors.centerIn: parent
                                            text: "🗑️ Pass"
                                            font.pixelSize: 10
                                            font.bold: modelData.triage === "discard"
                                            color: modelData.triage === "discard" ? "#fca5a5" : "#94a3b8"
                                        }
                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: {
                                                var nextTriage = modelData.triage === "discard" ? "inbox" : "discard";
                                                if (typeof backend !== "undefined" && backend) {
                                                    backend.updateGrimoireItem(modelData.id, modelData.rating || 0, nextTriage, modelData.notes || "");
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // Tagline & Paradox
                            Text {
                                Layout.fillWidth: true
                                text: modelData.character.tagline ? ("\"" + modelData.character.tagline + "\"") : ""
                                font.pixelSize: 12
                                font.italic: true
                                color: "#cbd5e1"
                                wrapMode: Text.WordWrap
                                visible: Boolean(modelData.character.tagline)
                            }

                            // Central Contradiction Pill
                            Rectangle {
                                Layout.fillWidth: true
                                height: 26
                                radius: 4
                                color: "#18181b"
                                border.color: "#3f3f46"
                                border.width: 1
                                visible: Boolean(modelData.character.central_contradiction)

                                RowLayout {
                                    anchors.fill: parent
                                    anchors.leftMargin: 8
                                    anchors.rightMargin: 8
                                    spacing: 6
                                    Text { text: "⚡ Paradox:"; font.bold: true; font.pixelSize: 10; color: "#eab308" }
                                    Text {
                                        Layout.fillWidth: true
                                        text: modelData.character.central_contradiction || ""
                                        font.pixelSize: 11
                                        color: "#fef08a"
                                        elide: Text.ElideRight
                                    }
                                }
                            }

                            // Premise Excerpt
                            Text {
                                Layout.fillWidth: true
                                text: modelData.character.premise || ""
                                font.pixelSize: 12
                                color: "#94a3b8"
                                wrapMode: Text.WordWrap
                                maximumLineCount: cardRoot.isExpanded ? 100 : 3
                                elide: Text.ElideRight
                            }

                            // Expand / Collapse Premise Link
                            Text {
                                text: cardRoot.isExpanded ? "▲ Collapse full dossier" : "▼ Read full character premise..."
                                font.pixelSize: 11
                                font.bold: true
                                color: "#818cf8"
                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: cardRoot.isExpanded = !cardRoot.isExpanded
                                }
                            }

                            // Scratchpad Notes Box
                            Rectangle {
                                Layout.fillWidth: true
                                height: 32
                                radius: 6
                                color: "#18181b"
                                border.color: "#27272a"
                                border.width: 1

                                RowLayout {
                                    anchors.fill: parent
                                    anchors.leftMargin: 8
                                    anchors.rightMargin: 8
                                    spacing: 6

                                    Text { text: "📝"; font.pixelSize: 11 }
                                    TextField {
                                        id: noteField
                                        Layout.fillWidth: true
                                        placeholderText: "Add scratchpad notes (e.g. tweak job, increase tension)..."
                                        text: modelData.notes || ""
                                        font.pixelSize: 11
                                        color: "#e2e8f0"
                                        background: Item {}
                                        onEditingFinished: {
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.updateGrimoireItem(modelData.id, modelData.rating || 0, modelData.triage || "inbox", noteField.text);
                                            }
                                        }
                                    }
                                    Text {
                                        text: "Save"
                                        font.pixelSize: 10
                                        font.bold: true
                                        color: "#818cf8"
                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: {
                                                if (typeof backend !== "undefined" && backend) {
                                                    backend.updateGrimoireItem(modelData.id, modelData.rating || 0, modelData.triage || "inbox", noteField.text);
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // Action Buttons Row
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                // Load into Studio
                                Button {
                                    height: 32
                                    background: Rectangle {
                                        radius: 6
                                        color: parent.hovered ? "#4338ca" : "#3730a3"
                                        border.color: "#818cf8"
                                        border.width: 1
                                    }
                                    contentItem: RowLayout {
                                        anchors.centerIn: parent
                                        spacing: 4
                                        Text { text: "👁️"; font.pixelSize: 11 }
                                        Text { text: "Load into Studio"; font.bold: true; font.pixelSize: 11; color: "#ffffff" }
                                    }
                                    onClicked: {
                                        if (typeof backend !== "undefined" && backend) {
                                            backend.loadGrimoireItemIntoStudio(modelData.id);
                                            root.currentTab = 0;
                                        }
                                    }
                                }

                                // Enqueue for CharGenUI
                                Button {
                                    height: 32
                                    background: Rectangle {
                                        radius: 6
                                        color: parent.hovered ? "#065f46" : "#064e3b"
                                        border.color: "#10b981"
                                        border.width: 1
                                    }
                                    contentItem: RowLayout {
                                        anchors.centerIn: parent
                                        spacing: 4
                                        Text { text: (modelData.queue_status === "queued" || modelData.queue_status === "active") ? "✓" : "➕"; font.pixelSize: 11; color: "#ffffff" }
                                        Text {
                                            text: (modelData.queue_status === "active" ? "In CharGenUI" : ((modelData.queue_status === "queued") ? "Queued (#)" : "Add to Dispatch Queue"))
                                            font.bold: true
                                            font.pixelSize: 11
                                            color: "#ecfdf5"
                                        }
                                    }
                                    onClicked: {
                                        if (typeof backend !== "undefined" && backend) {
                                            if (modelData.queue_status === "queued") {
                                                backend.dequeueGrimoireItem(modelData.id);
                                            } else {
                                                backend.enqueueGrimoireItem(modelData.id);
                                            }
                                        }
                                    }
                                }

                                // Direct Push to CharGenUI
                                Button {
                                    height: 32
                                    background: Rectangle {
                                        radius: 6
                                        color: parent.hovered ? "#7c3aed" : "#6d28d9"
                                    }
                                    contentItem: RowLayout {
                                        anchors.centerIn: parent
                                        spacing: 4
                                        Text { text: "🚀"; font.pixelSize: 11 }
                                        Text { text: "Send Direct"; font.bold: true; font.pixelSize: 11; color: "#ffffff" }
                                    }
                                    onClicked: {
                                        if (typeof backend !== "undefined" && backend) {
                                            backend.pushToCharGenUI(
                                                JSON.stringify(modelData.character),
                                                root.autoGenerateOnSend
                                            );
                                        }
                                    }
                                }

                                Item { Layout.fillWidth: true }

                                // Delete Button
                                Button {
                                    height: 32
                                    background: Rectangle {
                                        radius: 6
                                        color: parent.hovered ? "#450a0a" : "#1e293b"
                                        border.color: "#ef4444"
                                        border.width: 1
                                    }
                                    contentItem: RowLayout {
                                        anchors.centerIn: parent
                                        spacing: 4
                                        Text { text: "🗑️"; font.pixelSize: 10 }
                                        Text { text: "Delete"; font.pixelSize: 11; color: "#fca5a5" }
                                    }
                                    onClicked: {
                                        if (typeof backend !== "undefined" && backend) {
                                            backend.deleteGrimoireItem(modelData.id);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                Item { height: 20 }
            }
        }
    }
