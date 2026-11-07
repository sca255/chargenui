import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Rectangle {
    id: root
    visible: false
    color: Qt.rgba(0, 0, 0, 0.75)

    signal closed()
    signal forgeRequested(var answers, bool includeLorebook)
    signal requestReroll(int index, string qid, string category, string question, var currentOptions)
    signal requestRerollAll()
    signal requestAskMore()

    Theme { id: theme }

    property string preliminaryVision: ""
    property var questionsData: []
    property var answersMap: ({})
    property int rerollingIndex: -1
    property bool isAskingMore: false

    Connections {
        target: bridge
        function onWeaverQuestionsReady(data) {
            root.isAskingMore = false
        }
        function onWeaverQuestionRerolled(qIndex, newOptions, recIndex) {
            root.rerollingIndex = -1
            if (qIndex >= 0 && qIndex < root.questionsData.length) {
                var copy = []
                for (var i = 0; i < root.questionsData.length; i++) {
                    var item = root.questionsData[i]
                    if (i === qIndex) {
                        item.options = newOptions
                        item.recommendedOptionIndex = recIndex
                        var bestOpt = newOptions[recIndex] || newOptions[0] || ""
                        root.answersMap[item.id] = bestOpt
                    }
                    copy.push(item)
                }
                root.questionsData = copy
                console.log("[WeaverModal] Updated Q" + (qIndex + 1) + " with " + newOptions.length + " fresh options (recommended: #" + recIndex + ")")
            }
        }
        function onErrorOccurred(msg) {
            root.rerollingIndex = -1
            root.isAskingMore = false
        }
    }

    function rerollQuestion(idx) {
        if (rerollingIndex >= 0) return
        var q = questionsData[idx]
        if (!q) return
        rerollingIndex = idx
        console.log("[WeaverModal] Requesting fresh choices for Q" + (idx + 1) + " [" + q.category + "]...")
        requestReroll(idx, q.id, q.category, q.question, q.options || [])
    }

    function loadInterview(data) {
        preliminaryVision = data.preliminaryVision || ""
        var incoming = data.questions || []
        questionsData = incoming
        var initial = {}
        for (var i = 0; i < incoming.length; i++) {
            var q = incoming[i]
            // Keep existing answer if present, else use recommended
            if (answersMap && answersMap[q.id] !== undefined) {
                initial[q.id] = answersMap[q.id]
            } else {
                var recIdx = (typeof q.recommendedOptionIndex === "number") ? q.recommendedOptionIndex : 0
                var opt = (q.options && q.options[recIdx]) || (q.options && q.options[0]) || ""
                initial[q.id] = opt
            }
        }
        answersMap = initial
        visible = true
        console.log("[WeaverModal] Loaded interview with " + incoming.length + " questions (pre-selected defaults active)")
    }

    function removeQuestion(idx) {
        if (idx < 0 || idx >= questionsData.length) return
        var q = questionsData[idx]
        var copy = []
        for (var i = 0; i < questionsData.length; i++) {
            if (i !== idx) {
                copy.push(questionsData[i])
            }
        }
        if (q && q.id && answersMap) {
            delete answersMap[q.id]
        }
        questionsData = copy
        console.log("[WeaverModal] Removed question #" + (idx + 1) + "; remaining questions: " + copy.length)
    }

    function askMoreQuestions() {
        if (isAskingMore) return
        isAskingMore = true
        requestAskMore()
    }

    function autoFill() {
        for (var i = 0; i < questionsData.length; i++) {
            var q = questionsData[i]
            var recIdx = (typeof q.recommendedOptionIndex === "number") ? q.recommendedOptionIndex : 0
            var opt = (q.options && q.options[recIdx]) || (q.options && q.options[0]) || ""
            answersMap[q.id] = opt
        }
        // Force refresh repeater UI
        var temp = questionsData
        questionsData = []
        questionsData = temp
        console.log("[WeaverModal] Auto-filled all " + questionsData.length + " questions with Weaver recommendations")
    }

    function selectOption(qid, optText) {
        answersMap[qid] = optText
        var temp = questionsData
        questionsData = []
        questionsData = temp
        console.log("[WeaverModal] Selected answer for [" + qid + "]: \"" + optText + "\"")
    }

    function submitForge() {
        var answersList = []
        for (var i = 0; i < questionsData.length; i++) {
            var q = questionsData[i]
            var val = answersMap[q.id] || ""
            if (!val.trim()) {
                var recIdx = (typeof q.recommendedOptionIndex === "number") ? q.recommendedOptionIndex : 0
                val = (q.options && q.options[recIdx]) || (q.options && q.options[0]) || ""
            }
            if (val.trim()) {
                answersList.push({
                    "questionId": q.id,
                    "category": q.category,
                    "question": q.question,
                    "selectedAnswer": val.trim()
                })
            }
        }
        console.log("[WeaverModal] Submitting " + answersList.length + " interview answers to forge card (lorebook=" + chkLorebook.checked + ")...")
        root.visible = false
        forgeRequested(answersList, chkLorebook.checked)
    }

    // Modal Card Window
    Rectangle {
        id: modalBox
        width: Math.min(840, parent.width - 40)
        height: Math.min(720, parent.height - 40)
        anchors.centerIn: parent
        color: theme.bgSecondary
        radius: theme.radiusMd
        border.color: theme.accentPurple
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 18
            spacing: 12

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Text { text: "🧠"; font.pixelSize: 22 }

                ColumnLayout {
                    spacing: 2
                    Text {
                        text: "Weaver Character Workshop: Interactive Interview"
                        color: "#c084fc"
                        font.pixelSize: 15
                        font.bold: true
                    }
                    Text {
                        text: "Answer Weaver's strategic questions or click options to sculpt the Character Bible before forging."
                        color: theme.textMuted
                        font.pixelSize: 11
                    }
                }

                Item { Layout.fillWidth: true }

                Button {
                    text: "✕"
                    onClicked: { root.visible = false; root.closed() }
                    background: Rectangle { color: "transparent" }
                    contentItem: Text {
                        text: parent.text
                        color: theme.textMuted
                        font.pixelSize: 14
                        font.bold: true
                    }
                }
            }

            // Preliminary Vision Box
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: visionText.implicitHeight + 16
                radius: theme.radiusSm
                color: theme.withAlpha(theme.accentPurple, 0.1)
                border.color: theme.withAlpha(theme.accentPurple, 0.3)

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 8
                    spacing: 8
                    Text {
                        text: "✨"
                        font.pixelSize: 14
                    }
                    Text {
                        id: visionText
                        Layout.fillWidth: true
                        text: root.preliminaryVision
                        color: "#e9d5ff"
                        font.pixelSize: 11
                        wrapMode: Text.Wrap
                    }
                }
            }

            // Scrollable Questions List
            ScrollView {
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true

                ColumnLayout {
                    width: modalBox.width - 40
                    spacing: 12

                    Repeater {
                        model: root.questionsData
                        delegate: Rectangle {
                            id: qCard
                            required property var modelData
                            required property int index

                            Layout.fillWidth: true
                            implicitHeight: qLayout.implicitHeight + 16
                            color: theme.bgCard
                            radius: theme.radiusSm
                            border.color: theme.borderMain

                            ColumnLayout {
                                id: qLayout
                                anchors.fill: parent
                                anchors.margins: 10
                                spacing: 8

                                RowLayout {
                                    Layout.fillWidth: true
                                    Text {
                                        text: "[" + (qCard.index + 1) + "/" + root.questionsData.length + "] " + qCard.modelData.category
                                        color: "#c084fc"
                                        font.pixelSize: 10
                                        font.bold: true
                                        font.letterSpacing: 0.5
                                    }
                                    Item { Layout.fillWidth: true }
                                    Button {
                                        id: btnRerollQ
                                        implicitHeight: 24
                                        enabled: root.rerollingIndex === -1
                                        onClicked: root.rerollQuestion(qCard.index)
                                        background: Rectangle {
                                            radius: theme.radiusSm
                                            color: btnRerollQ.hovered ? theme.withAlpha(theme.accentPurple, 0.3) : theme.withAlpha(theme.accentPurple, 0.15)
                                            border.color: theme.accentPurple
                                        }
                                        contentItem: RowLayout {
                                            spacing: 4
                                            Text {
                                                text: (root.rerollingIndex === qCard.index) ? "⏳" : "🎲"
                                                font.pixelSize: 10
                                            }
                                            Text {
                                                text: (root.rerollingIndex === qCard.index) ? "Rerolling..." : "Reroll Choices"
                                                color: "#e9d5ff"
                                                font.pixelSize: 10
                                                font.bold: true
                                            }
                                        }
                                    }
                                    Button {
                                        id: btnRemoveQ
                                        implicitHeight: 24
                                        implicitWidth: 26
                                        onClicked: root.removeQuestion(qCard.index)
                                        background: Rectangle {
                                            radius: theme.radiusSm
                                            color: btnRemoveQ.hovered ? theme.withAlpha(theme.accentRed, 0.25) : theme.withAlpha(theme.bgTertiary, 0.6)
                                            border.color: btnRemoveQ.hovered ? theme.accentRed : theme.borderMain
                                        }
                                        contentItem: Text {
                                            text: "✕"
                                            color: btnRemoveQ.hovered ? "#f87171" : theme.textMuted
                                            font.pixelSize: 11
                                            font.bold: true
                                            horizontalAlignment: Text.AlignHCenter
                                            verticalAlignment: Text.AlignVCenter
                                        }
                                        ToolTip.visible: btnRemoveQ.hovered
                                        ToolTip.text: "Remove / skip this question"
                                        ToolTip.delay: 400
                                    }
                                }

                                Text {
                                    Layout.fillWidth: true
                                    text: qCard.modelData.question
                                    color: theme.textMain
                                    font.pixelSize: 12
                                    font.bold: true
                                    wrapMode: Text.Wrap
                                }

                                // 3 Options
                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 4

                                    Repeater {
                                        model: qCard.modelData.options
                                        delegate: Button {
                                            id: optBtn
                                            required property string modelData
                                            required property int index

                                            property bool isSelected: root.answersMap[qCard.modelData.id] === modelData
                                            property bool isRec: index === qCard.modelData.recommendedOptionIndex

                                            Layout.fillWidth: true
                                            implicitHeight: Math.max(30, optText.implicitHeight + 12)
                                            onClicked: root.selectOption(qCard.modelData.id, optBtn.modelData)

                                            background: Rectangle {
                                                radius: theme.radiusSm
                                                color: optBtn.isSelected ? theme.withAlpha(theme.accentPurple, 0.25) : (optBtn.hovered ? theme.withAlpha(theme.accentPurple, 0.12) : theme.bgTertiary)
                                                border.color: optBtn.isSelected ? "#c084fc" : theme.borderMain
                                                border.width: optBtn.isSelected ? 1.5 : 1
                                            }

                                            contentItem: Text {
                                                id: optText
                                                text: (optBtn.isRec ? "⭐ " : "") + optBtn.modelData
                                                color: optBtn.isSelected ? "#ffffff" : theme.textMuted
                                                font.pixelSize: 11
                                                font.bold: optBtn.isSelected
                                                wrapMode: Text.Wrap
                                                lineHeight: 1.25
                                                verticalAlignment: Text.AlignVCenter
                                                leftPadding: 8
                                                rightPadding: 8
                                                topPadding: 6
                                                bottomPadding: 6
                                            }
                                        }
                                    }
                                }

                                // Custom write-in field (multi-line to display full answer)
                                TextArea {
                                    id: customAnswerInput
                                    Layout.fillWidth: true
                                    wrapMode: TextEdit.Wrap
                                    placeholderText: "Selected option or custom write-in..."
                                    text: root.answersMap[qCard.modelData.id] || ""
                                    font.pixelSize: 11
                                    color: theme.textMain
                                    placeholderTextColor: theme.textDim
                                    leftPadding: 8
                                    rightPadding: 8
                                    topPadding: 6
                                    bottomPadding: 6
                                    background: Rectangle {
                                        color: theme.bgInput
                                        border.color: customAnswerInput.activeFocus ? theme.accentPurple : theme.borderMain
                                        radius: theme.radiusSm
                                    }
                                    onTextEdited: {
                                        root.answersMap[qCard.modelData.id] = text
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Footer
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Button {
                    text: "✨ Auto-Fill Weaver's Intuition"
                    onClicked: root.autoFill()
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: parent.hovered ? theme.withAlpha(theme.accentPurple, 0.2) : theme.bgTertiary
                        border.color: theme.borderMain
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "#c084fc"
                        font.pixelSize: 11
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }

                Button {
                    text: root.isAskingMore ? "⏳ Asking Weaver..." : "➕ Ask More Questions"
                    enabled: !root.isAskingMore && root.rerollingIndex === -1
                    onClicked: root.askMoreQuestions()
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: parent.hovered ? theme.withAlpha(theme.accentGreen, 0.25) : theme.bgTertiary
                        border.color: theme.borderMain
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "#34d399"
                        font.pixelSize: 11
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }

                Button {
                    text: "🎲 Reroll All Questions"
                    enabled: !root.isAskingMore && root.rerollingIndex === -1
                    onClicked: root.requestRerollAll()
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: parent.hovered ? theme.withAlpha(theme.accentIndigo, 0.25) : theme.bgTertiary
                        border.color: theme.borderMain
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "#a5b4fc"
                        font.pixelSize: 11
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }

                Button {
                    text: "Cancel"
                    onClicked: { root.visible = false; root.closed() }
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: parent.hovered ? theme.bgHover : theme.bgTertiary
                        border.color: theme.borderMain
                    }
                    contentItem: Text {
                        text: parent.text
                        color: theme.textMuted
                        font.pixelSize: 11
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }

                Item { Layout.fillWidth: true }

                CheckBox {
                    id: chkLorebook
                    text: "Embedded Lorebook (Optional)"
                    checked: false
                    contentItem: Text {
                        text: chkLorebook.text
                        font.pixelSize: 11
                        color: theme.textMuted
                        verticalAlignment: Text.AlignVCenter
                        leftPadding: chkLorebook.indicator.width + 6
                    }
                }

                Button {
                    id: btnSubmitForge
                    Layout.preferredWidth: 260
                    implicitHeight: 36
                    onClicked: root.submitForge()

                    background: Rectangle {
                        radius: theme.radiusSm
                        gradient: Gradient {
                            orientation: Gradient.Horizontal
                            GradientStop { position: 0.0; color: btnSubmitForge.hovered ? "#4f46e5" : "#4338ca" }
                            GradientStop { position: 1.0; color: btnSubmitForge.hovered ? "#9333ea" : "#7e22ce" }
                        }
                    }

                    contentItem: Text {
                        text: "⚡ Synthesize Bible & Forge Card"
                        color: "#ffffff"
                        font.pixelSize: 12
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }
        }
    }
}
