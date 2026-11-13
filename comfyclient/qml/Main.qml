import QtQuick
import QtQuick.Controls
import QtQuick.Controls.Material
import QtQuick.Layouts

ApplicationWindow {
    id: root
    visible: true
    width: 1200
    height: 800
    minimumWidth: 900
    minimumHeight: 600
    title: "ComfyClient — Queue & Workflow Editor"

    Material.theme: Material.Dark
    Material.accent: "#7c9cff"
    Material.background: "#14161a"

    readonly property color bg: "#14161a"
    readonly property color card: "#1e222b"
    readonly property color panel: "#1b1e24"
    readonly property color panelAlt: "#22262e"
    readonly property color line: "#2c313b"
    readonly property color muted: "#8b93a1"

    function statusColor(s) {
        if (s === "running") return "#7c9cff"
        if (s === "pending") return "#e0b44c"
        if (s === "done") return "#5ad18f"
        if (s === "failed") return "#ff7a7a"
        if (s === "cancelled") return "#a0a5b1"
        return "#8b93a1"
    }

    // ── state ───────────────────────────────────────────────────────────
    property string selectedId: ""
    property string selectedName: ""
    property var allItems: []
    property var batchSelectedIds: ({})
    property int batchSelectedCount: 0
    property bool batchModeActive: false
    property bool jsonValid: true
    property string statusText: "Ready"
    property bool statusError: false

    property string comfyUrl: "http://127.0.0.1:8188"
    property string engineMode: "comfy" // "comfy" or "sdcpp" (lite mode)
    property string sdcppUrl: "http://127.0.0.1:1234"
    property string outputFormat: "png"
    property var defaultWorkflow: ({})
    property string defaultCheckpoint: ""
    property int defaultWidth: 832
    property int defaultHeight: 1216
    property string defaultAspectRatio: "2:3"
    property var defaultsByPurpose: ({})
    property var checkpoints: []
    property var loras: []
    property var samplers: []
    property var schedulers: []

    property int pendingCount: 0
    property int runningCount: 0

    // Run info for selected prompt
    property string runStatus: ""
    property string runError: ""
    property var runOutputs: []
    property var runGallery: []
    property int repeatCount: 0
    property int repeatTotal: 0
    property var runSeed: null
    property var selectedGalleryItem: null
    property string trackedStatus: ""
    property int trackedOutputs: 0

    Component.onCompleted: {
        rpc("get_settings", {}, function(s) {
            s = s || {}
            root.comfyUrl = s.comfyUrl || "http://127.0.0.1:8188"
            root.engineMode = s.engine_mode || "comfy"
            root.sdcppUrl = s.sdcppUrl || "http://127.0.0.1:1234"
            root.outputFormat = s.output_format || "png"
            root.defaultWorkflow = s.default_workflow || {}
            root.defaultCheckpoint = s.default_checkpoint || ""
            root.defaultWidth = (s.default_width > 0) ? s.default_width : 832
            root.defaultHeight = (s.default_height > 0) ? s.default_height : 1216
            root.defaultAspectRatio = s.default_aspect_ratio || "2:3"
            root.defaultsByPurpose = s.defaults_by_purpose || {}
            loadModels()
        })
        refresh()
        pollTimer.start()
    }

    Timer {
        id: pollTimer
        interval: 1500
        repeat: true
        onTriggered: root.pollList()
    }

    Connections {
        target: backend
        function onQueueChanged() {
            root.pollList()
        }
    }

    // ── RPC helper ──────────────────────────────────────────────────────
    function rpc(method, params, cb) {
        var r
        try {
            r = JSON.parse(backend.call(method, JSON.stringify(params || {})))
        } catch (e) {
            setStatus("Backend call error: " + e.message, true)
            return
        }
        if (r.error) {
            setStatus(r.error.message || "RPC error", true)
            return
        }
        if (cb) cb(r.result)
    }

    function setStatus(text, isError) {
        statusText = text
        statusError = !!isError
    }

    // ── List & Queue management ─────────────────────────────────────────
    function applyItems(items) {
        allItems = items || []
        var p = 0, r = 0
        for (var i = 0; i < allItems.length; i++) {
            if (allItems[i].status === "pending") p++
            if (allItems[i].status === "running") r++
        }
        pendingCount = p
        runningCount = r
        rebuildList()
    }

    function rebuildList() {
        var q = searchField.text.trim().toLowerCase()
        var filtered = []
        for (var i = 0; i < allItems.length; i++) {
            var item = allItems[i]
            var n = (item.name || "").toLowerCase()
            var p = (item.imagePurpose || "").toLowerCase()
            var c = (item.characterName || "").toLowerCase()
            if (!q || n.indexOf(q) >= 0 || p.indexOf(q) >= 0 || c.indexOf(q) >= 0) {
                filtered.push(item)
            }
        }

        // Check if list model really changed to avoid redraw flicker
        var isIdentical = listModel.count === filtered.length
        if (isIdentical) {
            for (var j = 0; j < filtered.length; j++) {
                var cur = listModel.get(j)
                var tgt = filtered[j]
                if (cur.pId !== (tgt.id || tgt.name) ||
                    cur.pName !== tgt.name ||
                    cur.pStatus !== tgt.status ||
                    cur.pOutputs !== (tgt.outputs || 0) ||
                    cur.pDone !== !!tgt.completed) {
                    isIdentical = false
                    break
                }
            }
        }

        if (!isIdentical) {
            listModel.clear()
            for (var k = 0; k < filtered.length; k++) {
                var it = filtered[k]
                listModel.append({
                    pId: it.id || it.name || "",
                    pName: it.name || "Untitled Prompt",
                    pPurpose: it.imagePurpose || "avatar",
                    pStatus: it.status || "",
                    pOutputs: it.outputs || 0,
                    pDone: !!it.completed
                })
            }
        }
    }

    function refresh(thenSelectId) {
        rpc("list_prompts", {}, function(res) {
            applyItems(res.items)
            if (thenSelectId !== undefined && thenSelectId !== "") {
                selectPrompt(thenSelectId)
            } else if (res.items && res.items.length > 0) {
                var exists = false
                if (root.selectedId) {
                    for (var i = 0; i < res.items.length; i++) {
                        if (res.items[i].id === root.selectedId || res.items[i].name === root.selectedId) {
                            exists = true; break
                        }
                    }
                }
                if (!exists) {
                    selectPrompt(res.items[0].id || res.items[0].name)
                }
            } else {
                newPrompt()
                setStatus("Queue is empty", false)
            }
        })
    }

    function pollList() {
        rpc("list_prompts", {}, function(res) {
            applyItems(res.items)
            var currentId = root.selectedId
            if (!currentId) {
                if (res.items && res.items.length > 0) {
                    selectPrompt(res.items[0].id || res.items[0].name)
                }
                return
            }
            for (var i = 0; i < allItems.length; i++) {
                var it = allItems[i]
                if (it.id === currentId || it.name === currentId) {
                    if (it.status !== trackedStatus || it.outputs !== trackedOutputs) {
                        reloadRunInfo()
                    }
                    return
                }
            }
            // If currentId is no longer found in queue, select first available
            if (res.items && res.items.length > 0) {
                selectPrompt(res.items[0].id || res.items[0].name)
            } else {
                newPrompt()
            }
        })
    }

    function loadModels() {
        rpc("list_models", {}, function(res) {
            res = res || {}
            var prevModel = modelBox.editText
            root.checkpoints = res.checkpoints || []
            if (res.loras && res.loras.length) root.loras = res.loras
            if (res.samplers && res.samplers.length) root.samplers = res.samplers
            if (res.schedulers && res.schedulers.length) root.schedulers = res.schedulers
            modelBox.editText = prevModel
            if (res.error) setStatus("ComfyUI models: " + res.error, true)
            else setStatus((root.checkpoints ? root.checkpoints.length : 0) + " model(s), " + (root.loras ? root.loras.length : 0) + " LoRA(s) loaded", false)
        })
    }

    // ── Editor Actions ──────────────────────────────────────────────────
    function applyPurposeDefaults(purpose) {
        var defs = root.defaultsByPurpose || {}
        var pDef = defs[purpose] || defs["default"] || {}
        if (pDef.width && pDef.height) {
            widthBox.value = pDef.width
            heightBox.value = pDef.height
        }
        if (pDef.checkpoint) {
            modelBox.editText = pDef.checkpoint
        }
    }

    function fillParams(p, purpose) {
        p = p || {}
        purpose = purpose || (purposeBox.editText ? purposeBox.editText.trim() : "avatar")
        var defs = root.defaultsByPurpose || {}
        var pDef = defs[purpose] || defs["default"] || {}

        var defModel = pDef.checkpoint || root.defaultCheckpoint || ""
        var defW = (pDef.width > 0) ? pDef.width : (root.defaultWidth || 832)
        var defH = (pDef.height > 0) ? pDef.height : (root.defaultHeight || 1216)

        modelBox.editText = p.checkpoint || defModel
        positiveText.text = p.positive || ""
        negativeText.text = p.negative || ""
        samplerBox.editText = p.sampler || "euler"
        schedBox.editText = p.scheduler || "normal"
        stepsBox.value = (p.steps !== undefined && p.steps > 0) ? p.steps : 20
        cfgField.text = String(p.cfg !== undefined ? p.cfg : 7.0)
        widthBox.value = (p.width !== undefined && p.width > 0) ? p.width : defW
        heightBox.value = (p.height !== undefined && p.height > 0) ? p.height : defH
        seedField.text = String(p.seed !== undefined ? p.seed : -1)
        zodaToggle.checked = (p.zoda_plus !== undefined) ? !!p.zoda_plus : true
    }

    function collectParams() {
        var seed = parseInt(seedField.text)
        var cfg = parseFloat(cfgField.text)
        var loras = loraField.text.split(",").map(function(s) { return s.trim() })
                                   .filter(function(s) { return s.length > 0 })
        return {
            checkpoint: modelBox.editText.trim(),
            positive: positiveText.text,
            negative: negativeText.text,
            sampler: samplerBox.editText.trim() || "euler",
            scheduler: schedBox.editText.trim() || "normal",
            steps: stepsBox.value,
            cfg: isNaN(cfg) ? 7.0 : cfg,
            width: widthBox.value,
            height: heightBox.value,
            seed: isNaN(seed) ? -1 : seed,
            zoda_plus: zodaToggle.checked,
            lora: loras
        }
    }

    function newPrompt() {
        root.selectedId = ""
        root.selectedName = ""
        nameField.text = ""
        purposeBox.editText = "avatar"
        loraField.text = ""
        var defaultWf = (root.defaultWorkflow && Object.keys(root.defaultWorkflow).length)
                        ? root.defaultWorkflow : {}
        workflowText.text = Object.keys(defaultWf).length ? JSON.stringify(defaultWf, null, 2) : "{}"
        fillParams({}, "avatar")
        runStatus = ""; runError = ""; runOutputs = []; runGallery = []; runSeed = null
        repeatCount = 0; repeatTotal = 0
        trackedStatus = ""; trackedOutputs = 0
        tabs.currentIndex = 0
        nameField.forceActiveFocus()
        setStatus("Creating new prompt", false)
    }

    function applyRunInfo(res) {
        runStatus = res.status || ""
        runError = res.error || ""
        runOutputs = res.outputs || []
        runGallery = (res.gallery && res.gallery.length) ? res.gallery : runOutputs
        runSeed = (res.seed !== undefined) ? res.seed : null
        repeatCount = res.repeatCount || 0
        repeatTotal = res.repeatTotal || 0
        trackedStatus = runStatus
        trackedOutputs = (runGallery ? runGallery.length : 0)
    }

    function reloadRunInfo() {
        var currentId = root.selectedId
        if (!currentId) return
        rpc("load_prompt", { id: currentId }, applyRunInfo)
    }

    function selectPrompt(ident) {
        if (!ident) return
        rpc("load_prompt", { id: ident, name: ident }, function(res) {
            root.selectedId = res.id || res.name || ""
            root.selectedName = res.name || ""
            nameField.text = res.name || ""
            purposeBox.editText = res.imagePurpose || "avatar"
            loraField.text = (res.lora || []).join(", ")

            var wf = res.workflow
            if (typeof wf === "string") {
                try { wf = JSON.parse(wf) } catch (e) { wf = {} }
            }
            if ((!wf || !Object.keys(wf).length) && root.defaultWorkflow && Object.keys(root.defaultWorkflow).length) {
                wf = root.defaultWorkflow
            }
            workflowText.text = (wf && typeof wf === "object" && Object.keys(wf).length)
                                ? JSON.stringify(wf, null, 2) : "{}"

            fillParams(res.params, res.imagePurpose || "avatar")
            applyRunInfo(res)
            setStatus("Loaded “" + root.selectedName + "”", false)
        })
    }

    function savePrompt(then) {
        var name = nameField.text.trim()
        if (!name) {
            setStatus("Give the prompt a name first", true)
            tabs.currentIndex = 0
            nameField.forceActiveFocus()
            return
        }
        var wf
        try {
            wf = JSON.parse(workflowText.text || "{}")
        } catch (e) {
            setStatus("Workflow JSON is invalid: " + e.message, true)
            tabs.currentIndex = 1
            return
        }
        var loras = loraField.text.split(",").map(function(s) { return s.trim() })
                                   .filter(function(s) { return s.length > 0 })

        var payload = {
            id: root.selectedId || undefined,
            name: name,
            imagePurpose: purposeBox.editText.trim() || "avatar",
            workflow: wf,
            lora: loras,
            params: collectParams()
        }

        rpc("save_prompt", payload, function(saved) {
            if ((!root.defaultWorkflow || !Object.keys(root.defaultWorkflow).length) && wf && Object.keys(wf).length > 0) {
                rpc("set_settings", { default_workflow: wf }, function(s) {
                    root.defaultWorkflow = s.default_workflow || wf
                })
            }
            rpc("list_prompts", {}, function(res) {
                applyItems(res.items)
                root.selectedId = saved.id || root.selectedId
                root.selectedName = saved.name || name
                setStatus("Saved “" + root.selectedName + "”", false)
                if (then) then(root.selectedId)
            })
        })
    }

    function runNow(key, count) {
        count = count || 1
        rpc("run_prompt", { id: key, name: key, count: count }, function(res) {
            var msg = count > 1
                ? (res.queued ? "Queued batch of " + count + " runs for “" + res.name + "”" : "“" + res.name + "” is already running")
                : (res.queued ? "Queued “" + res.name + "”" : "“" + res.name + "” is already queued")
            setStatus(msg, false)
            pollList()
        })
    }

    function runSelected() {
        savePrompt(function(id) {
            runNow(id, 1)
            tabs.currentIndex = 3
        })
    }

    function runMultiSelected(count) {
        var n = count || (multiRunCountBox ? multiRunCountBox.value : 4) || 4
        savePrompt(function(id) {
            runNow(id, n)
            tabs.currentIndex = 3
        })
    }

    function deleteGalleryImage(filename) {
        if (!root.selectedId || !filename) return
        rpc("delete_gallery_image", { id: root.selectedId, filename: filename }, function() {
            reloadRunInfo()
            setStatus("Removed image from gallery", false)
        })
    }

    function clearGallery() {
        if (!root.selectedId) return
        rpc("clear_gallery", { id: root.selectedId }, function() {
            reloadRunInfo()
            setStatus("Gallery cleared", false)
        })
    }

    function openDryRun() {
        tabs.currentIndex = 2
        refreshDryRun()
    }

    function refreshDryRun() {
        var rawWf = null
        try {
            var t = workflowText.text.trim()
            if (t && t !== "{}" && t !== "") {
                rawWf = JSON.parse(t)
            }
        } catch (_) {}

        var payload = {
            id: root.selectedId,
            name: root.selectedName,
            imagePurpose: purposeBox.editText ? purposeBox.editText.trim() : "avatar",
            params: collectParams(),
            workflow: rawWf
        }

        rpc("dry_run_prompt", payload, function(res) {
            if (!res) return
            dryRunArea.text = res.json_str || JSON.stringify(res.payload || {}, null, 2)
            if (dryRunSeedLabel) dryRunSeedLabel.text = "Seed: " + res.seed
            if (dryRunNodeCountLabel) dryRunNodeCountLabel.text = "Nodes: " + res.node_count
            root.setStatus("Dry run JSON generated (" + res.node_count + " nodes, seed " + res.seed + ")", false)
        })
    }

    function runAll() {
        rpc("run_all", {}, function(res) {
            setStatus(res.queued.length + " prompt(s) queued for generation", false)
            pollList()
        })
    }

    function stopAll() {
        rpc("cancel_all", {}, function(res) {
            setStatus("Stopped " + res.cancelled + " job(s)", false)
            pollList()
        })
    }

    function toggleRun(key, status) {
        if (status === "pending" || status === "running") {
            rpc("cancel_prompt", { id: key, name: key }, function() {
                setStatus("Stopped prompt run", false)
                pollList()
            })
        } else {
            runNow(key)
        }
    }

    function deleteSelected() {
        var targetId = root.selectedId
        var targetName = root.selectedName
        if (!targetId && !targetName) return

        rpc("delete_prompt", { id: targetId, name: targetName }, function() {
            setStatus("Deleted “" + (targetName || targetId) + "”", false)
            root.selectedId = ""
            root.selectedName = ""
            refresh()
        })
    }

    function formatJson() {
        try {
            workflowText.text = JSON.stringify(JSON.parse(workflowText.text || "{}"), null, 2)
            setStatus("JSON formatted cleanly", false)
        } catch (e) {
            setStatus("Cannot format: invalid JSON syntax", true)
        }
    }

    function saveAsDefaultWorkflow() {
        var wf
        try {
            wf = JSON.parse(workflowText.text || "{}")
        } catch (e) {
            setStatus("Invalid JSON: " + e.message, true)
            return
        }
        if (!wf || Object.keys(wf).length === 0) {
            setStatus("Workflow JSON is empty", true)
            return
        }
        rpc("set_settings", { default_workflow: wf }, function(s) {
            root.defaultWorkflow = s.default_workflow || wf
            if (root.selectedId && nameField.text.trim()) {
                savePrompt(function() {
                    setStatus("Saved as default workflow (data/settings.json) & updated current prompt! ★", false)
                })
            } else {
                setStatus("Saved as default workflow template! ★ (stored in data/settings.json)", false)
            }
        })
    }

    function loadDefaultWorkflow() {
        if (!root.defaultWorkflow || Object.keys(root.defaultWorkflow).length === 0) {
            setStatus("No default template saved yet", true)
            return
        }
        workflowText.text = JSON.stringify(root.defaultWorkflow, null, 2)
        setStatus("Loaded default workflow template", false)
    }

    function imageUrl(o) {
        if (!o) return ""
        if (typeof o === "object" && o.filepath) {
            return "file://" + o.filepath
        }
        var fn = (typeof o === "string") ? o : (o.filename || "")
        if (fn.startsWith("sdcpp_")) {
            return "image://localfile/" + encodeURIComponent(fn)
        }
        var sub = (typeof o === "object" && o.subfolder) ? o.subfolder : ""
        var t = (typeof o === "object" && o.type) ? o.type : "output"
        return root.comfyUrl.replace(/\/+$/, "") + "/view?filename=" + encodeURIComponent(fn)
               + "&subfolder=" + encodeURIComponent(sub) + "&type=" + encodeURIComponent(t)
    }

    function toggleBatchSelection(pId) {
        var current = Object.assign({}, root.batchSelectedIds)
        if (current[pId]) {
            delete current[pId]
        } else {
            current[pId] = true
        }
        root.batchSelectedIds = current
        var count = 0
        for (var k in current) {
            if (current[k]) count++
        }
        root.batchSelectedCount = count
    }

    function selectAllBatch(val) {
        var map = {}
        var count = 0
        if (val) {
            for (var i = 0; i < root.allItems.length; i++) {
                var it = root.allItems[i]
                var id = it.id || it.name
                if (id) {
                    map[id] = true
                    count++
                }
            }
        }
        root.batchSelectedIds = map
        root.batchSelectedCount = count
    }

    function getSelectedBatchIds() {
        var res = []
        for (var k in root.batchSelectedIds) {
            if (root.batchSelectedIds[k]) res.push(k)
        }
        return res
    }

    // ── Dialogs ─────────────────────────────────────────────────────────
    Dialog {
        id: batchEditDialog
        title: "Batch Edit Prompts"
        modal: true
        anchors.centerIn: Overlay.overlay
        width: 600
        standardButtons: Dialog.Apply | Dialog.Cancel

        property string batchLoraAction: "append"

        function performBatchEdit() {
            var targetIds = root.getSelectedBatchIds()
            if (targetIds.length === 0) {
                // If none explicitly ticked, default to all prompts in queue
                for (var i = 0; i < root.allItems.length; i++) {
                    var it = root.allItems[i]
                    var tid = it.id || it.name
                    if (tid) targetIds.push(tid)
                }
            }

            if (targetIds.length === 0) {
                root.setStatus("No prompts in queue to batch edit", true)
                return
            }

            var updates = {}

            // LoRA
            var loraVal = batchLoraInput.text.trim()
            if (loraVal.length > 0) {
                updates["lora"] = loraVal
            }

            // Checkpoint
            if (batchCheckpointBox.currentIndex > 0) {
                updates["checkpoint"] = batchCheckpointBox.currentText
            }

            // Sampler & Scheduler
            if (batchSamplerBox.currentIndex > 0) {
                updates["sampler"] = batchSamplerBox.currentText
            }
            if (batchSchedBox.currentIndex > 0) {
                updates["scheduler"] = batchSchedBox.currentText
            }

            // Steps & CFG
            if (batchStepsInput.text.trim().length > 0) {
                var s = parseInt(batchStepsInput.text.trim(), 10)
                if (!isNaN(s) && s > 0) updates["steps"] = s
            }
            if (batchCfgInput.text.trim().length > 0) {
                var c = parseFloat(batchCfgInput.text.trim())
                if (!isNaN(c) && c > 0) updates["cfg"] = c
            }

            // Aspect ratio & resolution
            if (batchAspectBox.currentIndex === 1) { // 2:3 Card Portrait
                updates["width"] = 832; updates["height"] = 1216; updates["aspect_ratio"] = "2:3"
            } else if (batchAspectBox.currentIndex === 2) { // 1:1 Square
                updates["width"] = 1024; updates["height"] = 1024; updates["aspect_ratio"] = "1:1"
            } else if (batchAspectBox.currentIndex === 3) { // 16:9 Landscape
                updates["width"] = 1216; updates["height"] = 832; updates["aspect_ratio"] = "16:9"
            } else if (batchAspectBox.currentIndex === 4) { // 9:16 Full Height
                updates["width"] = 768; updates["height"] = 1344; updates["aspect_ratio"] = "9:16"
            }

            // Prompt tags
            if (batchPosPrefixInput.text.trim().length > 0) {
                updates["positive_prefix"] = batchPosPrefixInput.text.trim()
            }
            if (batchPosSuffixInput.text.trim().length > 0) {
                updates["positive_suffix"] = batchPosSuffixInput.text.trim()
            }
            if (batchNegPrefixInput.text.trim().length > 0) {
                updates["negative_prefix"] = batchNegPrefixInput.text.trim()
            }
            if (batchNegSuffixInput.text.trim().length > 0) {
                updates["negative_suffix"] = batchNegSuffixInput.text.trim()
            }

            // Reset status
            if (batchResetStatusCheck.checked) {
                updates["status"] = "pending"
            }

            if (Object.keys(updates).length === 0) {
                root.setStatus("No changes specified in batch edit", false)
                batchEditDialog.close()
                return
            }

            var action = "append"
            if (batchLoraActionBox.currentIndex === 1) action = "replace"
            else if (batchLoraActionBox.currentIndex === 2) action = "remove"

            root.rpc("batch_edit", {
                ids: targetIds,
                updates: updates,
                lora_action: action
            }, function(res) {
                if (res && res.success) {
                    root.setStatus("✓ Batch updated " + res.updated_count + " prompts!", false)
                    root.refresh(root.selectedId)
                    batchEditDialog.close()
                } else {
                    root.setStatus("Batch update failed: " + (res ? res.error : "Unknown error"), true)
                }
            })
        }

        onApplied: performBatchEdit()
        onAccepted: performBatchEdit()

        onOpened: {
            batchLoraInput.text = ""
            batchLoraActionBox.currentIndex = 0
            batchCheckpointBox.currentIndex = 0
            batchSamplerBox.currentIndex = 0
            batchSchedBox.currentIndex = 0
            batchStepsInput.text = ""
            batchCfgInput.text = ""
            batchAspectBox.currentIndex = 0
            batchPosPrefixInput.text = ""
            batchPosSuffixInput.text = ""
            batchNegPrefixInput.text = ""
            batchNegSuffixInput.text = ""
            batchResetStatusCheck.checked = false
        }

        contentItem: ScrollView {
            clip: true
            contentWidth: -1
            implicitHeight: 460

            ColumnLayout {
                width: parent.width
                spacing: 12

                // Scope banner
                Rectangle {
                    Layout.fillWidth: true
                    height: 38
                    radius: 4
                    color: root.panelAlt
                    border.color: root.line
                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 8
                        Label {
                            text: root.batchSelectedCount > 0
                                  ? ("🎯 Targeting " + root.batchSelectedCount + " checked prompt" + (root.batchSelectedCount === 1 ? "" : "s"))
                                  : ("🎯 Targeting ALL (" + root.allItems.length + ") prompts in queue")
                            font.bold: true
                            color: root.accent || "#7c9cff"
                        }
                        Item { Layout.fillWidth: true }
                        Label {
                            text: "(Empty fields below will NOT be touched)"
                            font.pixelSize: 11
                            color: root.muted
                        }
                    }
                }

                // Section 1: LoRA Batch Operations
                GroupBox {
                    title: "✦ LoRA Modification"
                    Layout.fillWidth: true
                    ColumnLayout {
                        anchors.fill: parent
                        spacing: 8

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 8
                            Label { text: "Action:"; color: root.muted; font.bold: true }
                            ComboBox {
                                id: batchLoraActionBox
                                Layout.preferredWidth: 200
                                model: ["Append / Update weights", "Replace entire LoRA list", "Remove matching LoRA(s)"]
                            }
                            Item { Layout.fillWidth: true }
                            ToolButton {
                                text: "+ Pick LoRA"
                                font.bold: true
                                visible: root.loras && root.loras.length > 0
                                onClicked: batchLoraPickerPopup.open()
                            }
                        }

                        TextField {
                            id: batchLoraInput
                            Layout.fillWidth: true
                            placeholderText: "e.g. MatureFemaleSliderAnima:1.2, detailed_eyes:0.8"
                            color: "#ffffff"
                            selectByMouse: true
                        }

                        Popup {
                            id: batchLoraPickerPopup
                            y: batchLoraInput.y + batchLoraInput.height + 2
                            width: Math.max(batchLoraInput.width, 340)
                            height: 240
                            padding: 8
                            closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
                            background: Rectangle {
                                color: root.panel
                                border.color: root.line
                                radius: 6
                            }
                            contentItem: ColumnLayout {
                                spacing: 6
                                TextField {
                                    id: batchLoraSearchField
                                    Layout.fillWidth: true
                                    placeholderText: "Search installed LoRAs..."
                                    color: "#ffffff"
                                }
                                ListView {
                                    Layout.fillWidth: true
                                    Layout.fillHeight: true
                                    clip: true
                                    model: {
                                        var list = root.loras || []
                                        var q = batchLoraSearchField.text.trim().toLowerCase()
                                        if (!q) return list
                                        return list.filter(function(m) { return m.toLowerCase().indexOf(q) !== -1 })
                                    }
                                    delegate: ItemDelegate {
                                        width: ListView.view ? ListView.view.width : 200
                                        height: 32
                                        contentItem: Text {
                                            text: modelData
                                            color: "#ffffff"
                                            font.pixelSize: 12
                                            elide: Text.ElideMiddle
                                            verticalAlignment: Text.AlignVCenter
                                        }
                                        onClicked: {
                                            var cur = batchLoraInput.text.trim()
                                            if (cur) batchLoraInput.text = cur + ", " + modelData + ":1.0"
                                            else batchLoraInput.text = modelData + ":1.0"
                                            batchLoraPickerPopup.close()
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Section 2: Model & Sampling Parameters
                GroupBox {
                    title: "⚙ Checkpoint & Sampling"
                    Layout.fillWidth: true
                    GridLayout {
                        columns: 4
                        columnSpacing: 10
                        rowSpacing: 8
                        Layout.fillWidth: parent.width

                        Label { text: "Checkpoint:"; color: root.muted }
                        ComboBox {
                            id: batchCheckpointBox
                            Layout.fillWidth: true
                            model: ["(Leave unchanged)"].concat(root.checkpoints || [])
                        }

                        Label { text: "Aspect Ratio:"; color: root.muted }
                        ComboBox {
                            id: batchAspectBox
                            Layout.fillWidth: true
                            model: [
                                "(Leave unchanged)",
                                "2:3 (832 × 1216)",
                                "1:1 (1024 × 1024)",
                                "16:9 (1216 × 832)",
                                "9:16 (768 × 1344)"
                            ]
                        }

                        Label { text: "Sampler:"; color: root.muted }
                        ComboBox {
                            id: batchSamplerBox
                            Layout.fillWidth: true
                            model: ["(Leave unchanged)"].concat(root.samplers || [])
                        }

                        Label { text: "Scheduler:"; color: root.muted }
                        ComboBox {
                            id: batchSchedBox
                            Layout.fillWidth: true
                            model: ["(Leave unchanged)"].concat(root.schedulers || [])
                        }

                        Label { text: "Steps:"; color: root.muted }
                        TextField {
                            id: batchStepsInput
                            Layout.fillWidth: true
                            placeholderText: "e.g. 28"
                            validator: IntValidator { bottom: 1; top: 150 }
                            color: "#ffffff"
                        }

                        Label { text: "CFG Scale:"; color: root.muted }
                        TextField {
                            id: batchCfgInput
                            Layout.fillWidth: true
                            placeholderText: "e.g. 7.0"
                            validator: DoubleValidator { bottom: 1.0; top: 30.0 }
                            color: "#ffffff"
                        }
                    }
                }

                // Section 3: Prompt Text Appending / Prepends
                GroupBox {
                    title: "✍ Positive & Negative Prompt Modifiers"
                    Layout.fillWidth: true
                    ColumnLayout {
                        anchors.fill: parent
                        spacing: 8

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 8
                            Label { text: "+ Prepend Positive:"; color: root.muted; Layout.preferredWidth: 130 }
                            TextField {
                                id: batchPosPrefixInput
                                Layout.fillWidth: true
                                placeholderText: "Tags added to the beginning of positive prompt (e.g. masterpiece, highly detailed)"
                                color: "#ffffff"
                            }
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 8
                            Label { text: "+ Append Positive:"; color: root.muted; Layout.preferredWidth: 130 }
                            TextField {
                                id: batchPosSuffixInput
                                Layout.fillWidth: true
                                placeholderText: "Tags added to the end of positive prompt (e.g. moody volumetric lighting)"
                                color: "#ffffff"
                            }
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 8
                            Label { text: "+ Prepend Negative:"; color: root.muted; Layout.preferredWidth: 130 }
                            TextField {
                                id: batchNegPrefixInput
                                Layout.fillWidth: true
                                placeholderText: "Tags added to the beginning of negative prompt"
                                color: "#ffffff"
                            }
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 8
                            Label { text: "+ Append Negative:"; color: root.muted; Layout.preferredWidth: 130 }
                            TextField {
                                id: batchNegSuffixInput
                                Layout.fillWidth: true
                                placeholderText: "Tags added to negative prompt (e.g. worst quality, blurry, text, watermark)"
                                color: "#ffffff"
                            }
                        }
                    }
                }

                // Section 4: Re-run status
                CheckBox {
                    id: batchResetStatusCheck
                    text: "Reset status to 'pending' (allows completed prompts to run again with 'Run all')"
                    checked: false
                }
            }
        }
    }
    Dialog {
        id: confirmDelete
        title: "Delete prompt?"
        modal: true
        anchors.centerIn: Overlay.overlay
        width: 400
        standardButtons: Dialog.Yes | Dialog.No

        Label {
            width: parent.width
            wrapMode: Text.Wrap
            text: "Are you sure you want to remove “" + (root.selectedName || "this prompt") + "” from the queue?\n(Only this single item will be deleted)."
        }
        onAccepted: root.deleteSelected()
    }

    Dialog {
        id: confirmClearGallery
        title: "Clear Gallery?"
        modal: true
        anchors.centerIn: Overlay.overlay
        width: 400
        standardButtons: Dialog.Yes | Dialog.No

        Label {
            width: parent.width
            wrapMode: Text.Wrap
            text: "Are you sure you want to clear all " + (root.runGallery ? root.runGallery.length : 0) + " historical images from this prompt's gallery?"
        }
        onAccepted: root.clearGallery()
    }

    Dialog {
        id: galleryLightbox
        title: "Gallery Preview"
        modal: true
        anchors.centerIn: Overlay.overlay
        width: Math.min(root.width - 40, 850)
        height: Math.min(root.height - 40, 750)
        standardButtons: Dialog.Close

        ColumnLayout {
            anchors.fill: parent
            spacing: 8

            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                color: root.panelAlt
                radius: 6
                clip: true

                Image {
                    id: lightboxImage
                    anchors.fill: parent
                    anchors.margins: 6
                    fillMode: Image.PreserveAspectFit
                    source: root.selectedGalleryItem ? root.imageUrl(root.selectedGalleryItem) : ""
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Label {
                    text: root.selectedGalleryItem ? ("File: " + (root.selectedGalleryItem.filename || "")) : ""
                    color: root.muted
                    font.pixelSize: 11
                    Layout.fillWidth: true
                    elide: Text.ElideMiddle
                }

                Label {
                    text: (root.selectedGalleryItem && root.selectedGalleryItem.seed !== undefined) ? ("Seed: " + root.selectedGalleryItem.seed) : ""
                    color: "#6ee7b7"
                    font.bold: true
                    font.pixelSize: 11
                }

                Button {
                    text: "🗑 Delete Image"
                    flat: true
                    font.pixelSize: 11
                    Material.foreground: "#ff7a7a"
                    onClicked: {
                        if (root.selectedGalleryItem && root.selectedGalleryItem.filename) {
                            root.deleteGalleryImage(root.selectedGalleryItem.filename)
                            galleryLightbox.close()
                        }
                    }
                }
            }
        }
    }

    Dialog {
        id: settingsDialog
        title: "ComfyClient & Generation Settings"
        modal: true
        anchors.centerIn: Overlay.overlay
        width: Math.min(parent.width - 40, 680)
        standardButtons: Dialog.Save | Dialog.Cancel

        property var settingPurposes: ["avatar", "greeting", "greeting_bg", "default"]
        property var settingPurposeLabels: ["Avatar (Portrait)", "Greeting Scene", "Chat Background", "Default / Other"]
        property int activePurposeIdx: 0
        property var dialogDefaults: ({})

        function matchPresetIndex(w, h) {
            if (w === 832 && h === 1216) return 0
            if (w === 1024 && h === 1024) return 1
            if (w === 1216 && h === 832) return 2
            if (w === 768 && h === 1344) return 3
            if (w === 896 && h === 1152) return 4
            if (w === 1920 && h === 1080) return 5
            if (w === 512 && h === 512) return 6
            return 7 // Custom
        }

        function syncToForm(pKey) {
            var cur = (dialogDefaults && dialogDefaults[pKey]) ? dialogDefaults[pKey] : {}
            var m = cur.checkpoint || ""
            var w = (cur.width > 0) ? cur.width : 832
            var h = (cur.height > 0) ? cur.height : 1216

            settingModelBox.editText = m
            settingWidthBox.value = w
            settingHeightBox.value = h
            settingPresetBox.currentIndex = matchPresetIndex(w, h)
        }

        function syncFromForm(pKey) {
            if (!dialogDefaults) dialogDefaults = {}
            if (!dialogDefaults[pKey]) dialogDefaults[pKey] = {}
            dialogDefaults[pKey].checkpoint = settingModelBox.editText.trim()
            dialogDefaults[pKey].width = settingWidthBox.value
            dialogDefaults[pKey].height = settingHeightBox.value
            dialogDefaults[pKey].aspect_ratio = settingPresetBox.currentText
        }

        onAboutToShow: {
            urlField.text = root.comfyUrl
            sdcppUrlField.text = root.sdcppUrl
            engineBox.currentIndex = (root.engineMode === "sdcpp") ? 1 : 0
            root.loadModels()
            rpc("get_settings", {}, function(s) {
                engineBox.currentIndex = (s.engine_mode === "sdcpp") ? 1 : 0
                sdcppUrlField.text = s.sdcppUrl || "http://127.0.0.1:1234"
                urlField.text = s.comfyUrl || "http://127.0.0.1:8188"
                timeoutField.text = String(s.timeout || 0)
                formatBox.currentIndex = (s.output_format === "webp") ? 1 : 0
                dialogDefaults = JSON.parse(JSON.stringify(s.defaults_by_purpose || {}))
                var loraCfg = s.lora_config || {}
                settingLoraNodeField.text = (loraCfg.node_id !== undefined && loraCfg.node_id !== null) ? String(loraCfg.node_id) : "45"
                settingLoraSampleField.text = loraCfg.sample_json || "{\n  \"lora_1\": {\n    \"on\": true,\n    \"lora\": \"{{lora}}\",\n    \"strength\": 1.0\n  }\n}"
                // Ensure all keys exist with sensible defaults
                for (var i = 0; i < settingPurposes.length; i++) {
                    var k = settingPurposes[i]
                    if (!dialogDefaults[k]) {
                        var isLandscape = (k === "greeting" || k === "greeting_bg")
                        dialogDefaults[k] = {
                            checkpoint: s.default_checkpoint || "",
                            width: isLandscape ? 1216 : (s.default_width || 832),
                            height: isLandscape ? 832 : (s.default_height || 1216),
                            aspect_ratio: isLandscape ? "16:9" : "2:3"
                        }
                    }
                }
                activePurposeIdx = 0
                purposeTabBar.currentIndex = 0
                syncToForm(settingPurposes[0])
            })
        }

        onAccepted: {
            syncFromForm(settingPurposes[activePurposeIdx])
            var t = parseInt(timeoutField.text)
            var av = dialogDefaults["avatar"] || dialogDefaults["default"] || {}
            var payload = {
                engine_mode: (engineBox.currentIndex === 1) ? "sdcpp" : "comfy",
                comfyUrl: urlField.text.trim(),
                sdcppUrl: sdcppUrlField.text.trim(),
                timeout: isNaN(t) ? 0 : t,
                output_format: (formatBox.currentIndex === 1) ? "webp" : "png",
                defaults_by_purpose: dialogDefaults,
                default_checkpoint: av.checkpoint || "",
                default_width: av.width || 832,
                default_height: av.height || 1216,
                default_aspect_ratio: av.aspect_ratio || "2:3",
                lora_config: {
                    node_id: settingLoraNodeField.text.trim(),
                    sample_json: settingLoraSampleField.text.trim()
                }
            }
            rpc("set_settings", payload, function(s) {
                root.engineMode = s.engine_mode || ((engineBox.currentIndex === 1) ? "sdcpp" : "comfy")
                root.sdcppUrl = s.sdcppUrl || sdcppUrlField.text.trim()
                root.comfyUrl = s.comfyUrl || urlField.text.trim()
                root.outputFormat = s.output_format || "png"
                root.defaultsByPurpose = s.defaults_by_purpose || dialogDefaults
                root.defaultCheckpoint = s.default_checkpoint || av.checkpoint || ""
                root.defaultWidth = s.default_width || av.width || 832
                root.defaultHeight = s.default_height || av.height || 1216
                root.defaultAspectRatio = s.default_aspect_ratio || "2:3"
                root.loadModels()
                setStatus("Defaults & engine mode (" + root.engineMode + ") saved", false)
            })
        }

        ColumnLayout {
            width: parent.width
            spacing: 10

            // Server connection
            Label { text: "Backend Engine & Server Connection"; color: root.muted; font.bold: true }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8
                Label { text: "Engine Mode:"; color: root.muted }
                ComboBox {
                    id: engineBox
                    Layout.fillWidth: true
                    model: ["ComfyUI (Standard Graph Workflow)", "sd.cpp / Lite Server (Fast GGUF / sd-server)"]
                    onCurrentIndexChanged: {
                        if (currentIndex === 1) {
                            comfyUrlRow.visible = false
                            sdcppUrlRow.visible = true
                        } else {
                            comfyUrlRow.visible = true
                            sdcppUrlRow.visible = false
                        }
                    }
                }
            }

            RowLayout {
                id: comfyUrlRow
                Layout.fillWidth: true
                spacing: 8
                visible: engineBox.currentIndex === 0
                Label { text: "ComfyUI URL:"; color: root.muted }
                TextField { id: urlField; Layout.fillWidth: true; placeholderText: "http://127.0.0.1:8188" }
            }

            RowLayout {
                id: sdcppUrlRow
                Layout.fillWidth: true
                spacing: 8
                visible: engineBox.currentIndex === 1
                Label { text: "sd.cpp Server URL:"; color: root.muted }
                TextField { id: sdcppUrlField; Layout.fillWidth: true; placeholderText: "http://127.0.0.1:1234" }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8
                Label { text: "Timeout (s, 0=none):"; color: root.muted }
                TextField { id: timeoutField; Layout.preferredWidth: 80; validator: IntValidator { bottom: 0 } }
                Item { Layout.fillWidth: true }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8
                Label { text: "Output Format (Greetings / BG):"; color: root.muted }
                ComboBox {
                    id: formatBox
                    Layout.fillWidth: true
                    model: ["PNG (Lossless standard)", "WebP (High quality, ~90% smaller files)"]
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: root.line }

            // Per-purpose defaults
            Label { text: "Configure Defaults by Image Purpose:"; color: root.muted; font.bold: true }

            TabBar {
                id: purposeTabBar
                Layout.fillWidth: true
                currentIndex: settingsDialog.activePurposeIdx
                onCurrentIndexChanged: {
                    if (currentIndex === settingsDialog.activePurposeIdx) return
                    settingsDialog.syncFromForm(settingsDialog.settingPurposes[settingsDialog.activePurposeIdx])
                    settingsDialog.activePurposeIdx = currentIndex
                    settingsDialog.syncToForm(settingsDialog.settingPurposes[currentIndex])
                }

                Repeater {
                    model: settingsDialog.settingPurposeLabels
                    TabButton {
                        text: modelData
                        font.pixelSize: 11
                        implicitWidth: Math.floor(settingsDialog.width / 4.2)
                    }
                }
            }

            Label { text: "Model (UNET / Checkpoint) for this Type:"; color: root.muted; font.bold: true }
            RowLayout {
                Layout.fillWidth: true
                spacing: 6

                ComboBox {
                    id: settingModelBox
                    Layout.fillWidth: true
                    editable: true
                    selectTextByMouse: true
                    model: root.checkpoints

                    popup: Popup {
                        id: settingModelPopup
                        y: settingModelBox.height + 2
                        width: Math.max(settingModelBox.width, 360)
                        height: 280
                        padding: 8
                        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
                        background: Rectangle {
                            color: root.panel
                            border.color: root.line
                            border.width: 1
                            radius: 6
                        }
                        contentItem: ColumnLayout {
                            spacing: 6
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4
                                TextField {
                                    id: settingModelFilter
                                    Layout.fillWidth: true
                                    placeholderText: "Filter models..."
                                    color: "#ffffff"
                                    placeholderTextColor: root.muted
                                    selectByMouse: true
                                    background: Rectangle {
                                        color: root.panelAlt
                                        border.color: root.line
                                        radius: 4
                                    }
                                }
                                ToolButton {
                                    text: "✕"
                                    visible: settingModelFilter.text.length > 0
                                    onClicked: settingModelFilter.text = ""
                                }
                            }
                            ListView {
                                id: settingModelList
                                Layout.fillWidth: true
                                Layout.fillHeight: true
                                clip: true
                                model: {
                                    var list = root.checkpoints || []
                                    var q = settingModelFilter.text.trim().toLowerCase()
                                    if (!q) return list
                                    return list.filter(function(m) { return m.toLowerCase().indexOf(q) !== -1 })
                                }
                                delegate: ItemDelegate {
                                    id: settingItemDel
                                    width: ListView.view ? ListView.view.width : 200
                                    height: 36
                                    highlighted: settingModelBox.editText === modelData
                                    hoverEnabled: true
                                    contentItem: Text {
                                        text: modelData
                                        color: "#ffffff"
                                        font.pixelSize: 12
                                        elide: Text.ElideMiddle
                                        verticalAlignment: Text.AlignVCenter
                                        leftPadding: 6
                                    }
                                    background: Rectangle {
                                        color: settingItemDel.highlighted ? "#3d4655" : (settingItemDel.hovered ? root.panelAlt : "transparent")
                                        radius: 4
                                    }
                                    onClicked: {
                                        settingModelBox.editText = modelData
                                        settingModelFilter.text = ""
                                        settingModelPopup.close()
                                    }
                                }
                                ScrollIndicator.vertical: ScrollIndicator { }
                            }
                            Label {
                                Layout.fillWidth: true
                                Layout.margins: 12
                                visible: settingModelList.count === 0
                                text: (!root.checkpoints || root.checkpoints.length === 0)
                                      ? "No models loaded from ComfyUI.\n(Make sure ComfyUI is running and click ↻)"
                                      : "No matching models found"
                                color: root.muted
                                font.pixelSize: 12
                                horizontalAlignment: Text.AlignHCenter
                                wrapMode: Text.Wrap
                            }
                        }
                        onOpened: {
                            settingModelFilter.forceActiveFocus()
                        }
                        onClosed: {
                            settingModelFilter.text = ""
                        }
                    }
                }

                ToolButton {
                    text: "↻"
                    font.pixelSize: 16
                    ToolTip.visible: hovered
                    ToolTip.text: "Reload models from ComfyUI"
                    onClicked: root.loadModels()
                }
            }

            Label { text: "Resolution & Aspect Ratio:"; color: root.muted; font.bold: true }
            ComboBox {
                id: settingPresetBox
                Layout.fillWidth: true
                model: [
                    "2:3 (832 × 1216 – Card Portrait)",
                    "1:1 (1024 × 1024 – Square)",
                    "16:9 (1216 × 832 – Landscape)",
                    "9:16 (768 × 1344 – Full Height)",
                    "4:5 (896 × 1152 – Portrait)",
                    "16:9 (1920 × 1080 – Full HD Landscape)",
                    "1:1 (512 × 512 – Classic SD)",
                    "Custom"
                ]
                onActivated: function(index) {
                    if (index === 0) { settingWidthBox.value = 832; settingHeightBox.value = 1216; }
                    else if (index === 1) { settingWidthBox.value = 1024; settingHeightBox.value = 1024; }
                    else if (index === 2) { settingWidthBox.value = 1216; settingHeightBox.value = 832; }
                    else if (index === 3) { settingWidthBox.value = 768; settingHeightBox.value = 1344; }
                    else if (index === 4) { settingWidthBox.value = 896; settingHeightBox.value = 1152; }
                    else if (index === 5) { settingWidthBox.value = 1920; settingHeightBox.value = 1080; }
                    else if (index === 6) { settingWidthBox.value = 512; settingHeightBox.value = 512; }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Label { text: "Width:"; color: root.muted }
                SpinBox {
                    id: settingWidthBox
                    from: 64
                    to: 4096
                    stepSize: 64
                    editable: true
                    Layout.fillWidth: true
                }

                Label { text: "Height:"; color: root.muted }
                SpinBox {
                    id: settingHeightBox
                    from: 64
                    to: 4096
                    stepSize: 64
                    editable: true
                    Layout.fillWidth: true
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: root.line }

            // LoRA Loader system configuration
            Label { text: "LoRA Loader System (Custom Node ID & Sample JSON):"; color: root.muted; font.bold: true }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8
                Label { text: "Node ID:"; color: root.muted }
                TextField {
                    id: settingLoraNodeField
                    Layout.preferredWidth: 80
                    placeholderText: "e.g. 45"
                    text: "45"
                    selectByMouse: true
                }
                Label { text: "Presets:"; color: root.muted }
                Button {
                    text: "Power Lora (rgthree)"
                    flat: true
                    font.pixelSize: 11
                    onClicked: {
                        settingLoraNodeField.text = "45"
                        settingLoraSampleField.text = "{\n  \"lora_1\": {\n    \"on\": true,\n    \"lora\": \"{{lora}}\",\n    \"strength\": 1.0\n  }\n}"
                    }
                }
                Button {
                    text: "Standard LoraLoader"
                    flat: true
                    font.pixelSize: 11
                    onClicked: {
                        settingLoraSampleField.text = "{\n  \"lora_name\": \"{{lora}}\",\n  \"strength_model\": 1.0,\n  \"strength_clip\": 1.0\n}"
                    }
                }
                Button {
                    text: "LoRA Stack"
                    flat: true
                    font.pixelSize: 11
                    onClicked: {
                        settingLoraSampleField.text = "{\n  \"lora_name_1\": \"{{lora}}\",\n  \"lora_wt_1\": 1.0\n}"
                    }
                }
            }

            Label { text: "Sample LoRA JSON Template (Enumerated dynamically as lora_1, lora_2...):"; color: root.muted; font.pixelSize: 11 }
            ScrollView {
                Layout.fillWidth: true
                Layout.preferredHeight: 110
                clip: true
                TextArea {
                    id: settingLoraSampleField
                    font.family: "monospace"
                    font.pixelSize: 11
                    wrapMode: TextEdit.NoWrap
                    text: "{\n  \"lora_1\": {\n    \"on\": true,\n    \"lora\": \"{{lora}}\",\n    \"strength\": 1.0\n  }\n}"
                }
            }
        }
    }

    // ── Layout ──────────────────────────────────────────────────────────
    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 0

            // ── Left Sidebar (Prompt Queue) ─────────────────────────────────
            Rectangle {
                Layout.preferredWidth: 320
                Layout.fillHeight: true
                color: root.panel

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 14
                    spacing: 10

                    RowLayout {
                        Layout.fillWidth: true
                        ColumnLayout {
                            spacing: 0
                            RowLayout {
                                spacing: 6
                                Label { text: "Prompt Queue"; font.pixelSize: 18; font.weight: Font.DemiBold }
                                Rectangle {
                                    visible: root.engineMode === "sdcpp"
                                    width: liteLabel.implicitWidth + 8
                                    height: 18
                                    radius: 4
                                    color: "#22c55e"
                                    Label {
                                        id: liteLabel
                                        anchors.centerIn: parent
                                        text: "LITE (sd.cpp)"
                                        color: "#000000"
                                        font.pixelSize: 9
                                        font.bold: true
                                    }
                                }
                            }
                            Label {
                                text: root.runningCount + " running · " + root.pendingCount + " pending"
                                color: root.muted
                                font.pixelSize: 11
                            }
                        }
                        Item { Layout.fillWidth: true }
                        ToolButton {
                            text: "⚙ Settings"
                            font.pixelSize: 12
                            font.bold: true
                            onClicked: settingsDialog.open()
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8
                        Button {
                            text: "▶  Run all"
                            Layout.fillWidth: true
                            highlighted: true
                            enabled: listModel.count > 0
                            onClicked: root.runAll()
                        }
                        Button {
                            text: "■  Stop"
                            Layout.fillWidth: true
                            enabled: root.pendingCount + root.runningCount > 0
                            onClicked: root.stopAll()
                        }
                    }

                    // Batch Edit Controls Bar
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 6

                        Button {
                            text: "✦ Batch Edit…"
                            Layout.fillWidth: true
                            highlighted: root.batchSelectedCount > 0
                            Material.accent: "#9333ea"
                            font.pixelSize: 12
                            font.bold: true
                            ToolTip.visible: hovered
                            ToolTip.text: root.batchSelectedCount > 0
                                ? "Batch edit the " + root.batchSelectedCount + " checked prompt" + (root.batchSelectedCount === 1 ? "" : "s") + " (add LoRAs, change models, tweak steps, tags)"
                                : "Batch edit prompts in the queue (or tick checkboxes to select specific ones)"
                            onClicked: batchEditDialog.open()
                        }

                        ToolButton {
                            text: root.batchModeActive ? "☑" : "☐"
                            font.pixelSize: 13
                            ToolTip.visible: hovered
                            ToolTip.text: root.batchModeActive ? "Hide item checkboxes" : "Show multi-selection checkboxes"
                            onClicked: {
                                root.batchModeActive = !root.batchModeActive
                            }
                        }
                    }

                    // Checkbox actions row (visible when batch mode active)
                    RowLayout {
                        Layout.fillWidth: true
                        visible: root.batchModeActive
                        spacing: 6

                        ToolButton {
                            text: "Select All"
                            font.pixelSize: 11
                            onClicked: root.selectAllBatch(true)
                        }
                        ToolButton {
                            text: "Deselect"
                            font.pixelSize: 11
                            onClicked: root.selectAllBatch(false)
                        }
                        Item { Layout.fillWidth: true }
                        Label {
                            text: root.batchSelectedCount + " checked"
                            color: root.accent || "#7c9cff"
                            font.pixelSize: 11
                            font.bold: true
                        }
                    }

                    TextField {
                        id: searchField
                        Layout.fillWidth: true
                        placeholderText: "Search queue…"
                        onTextChanged: root.rebuildList()
                    }

                    ListView {
                        id: queueList
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        clip: true
                        spacing: 4
                        model: ListModel { id: listModel }
                        ScrollBar.vertical: ScrollBar {}

                        delegate: ItemDelegate {
                            width: ListView.view.width
                            height: 60
                            highlighted: root.selectedId === pId

                            onClicked: {
                                root.selectPrompt(pId)
                            }

                            contentItem: RowLayout {
                                spacing: 6

                                CheckBox {
                                    id: itemBatchCheck
                                    visible: root.batchModeActive
                                    checked: !!root.batchSelectedIds[pId]
                                    Layout.preferredWidth: 28
                                    onClicked: {
                                        root.toggleBatchSelection(pId)
                                    }
                                }

                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 2
                                    Label {
                                        text: pName
                                        elide: Text.ElideRight
                                        Layout.fillWidth: true
                                        font.pixelSize: 13
                                        font.weight: root.selectedId === pId ? Font.Bold : Font.Normal
                                    }
                                    RowLayout {
                                        spacing: 6
                                        Label {
                                            text: pPurpose
                                            color: root.muted
                                            font.pixelSize: 11
                                        }
                                        Label {
                                            visible: pStatus !== ""
                                            text: pStatus
                                            color: root.statusColor(pStatus)
                                            font.pixelSize: 11
                                            font.weight: Font.DemiBold
                                        }
                                        Label {
                                            visible: pDone
                                            text: "✓ sent"
                                            color: "#5ad18f"
                                            font.pixelSize: 11
                                        }
                                    }
                                }
                                BusyIndicator {
                                    visible: pStatus === "running"
                                    running: visible
                                    implicitWidth: 20
                                    implicitHeight: 20
                                }
                                ToolButton {
                                    text: (pStatus === "pending" || pStatus === "running") ? "■" : "▶"
                                    onClicked: root.toggleRun(pId, pStatus)
                                }
                            }
                        }

                        Label {
                            anchors.centerIn: parent
                            visible: listModel.count === 0
                            color: root.muted
                            text: "No prompts in queue"
                        }
                    }

                    Button {
                        Layout.fillWidth: true
                        text: "+  New prompt"
                        onClicked: root.newPrompt()
                    }
                }
            }

            Rectangle { Layout.preferredWidth: 1; Layout.fillHeight: true; color: root.line }

            // ── Main Editor Area ────────────────────────────────────────────
            ColumnLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                Layout.margins: 20
                spacing: 8

                // Header Bar
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8
                    Label {
                        text: root.selectedName === "" ? "New prompt" : root.selectedName
                        font.pixelSize: 18
                        font.weight: Font.DemiBold
                        elide: Text.ElideRight
                        Layout.fillWidth: true
                    }
                    Button {
                        text: "Delete"
                        flat: true
                        Material.foreground: "#ff7a7a"
                        enabled: root.selectedId !== ""
                        onClicked: confirmDelete.open()
                    }
                    Button {
                        text: "Save"
                        onClicked: root.savePrompt()
                    }
                    Button {
                        text: "🔍 Dry run JSON"
                        flat: true
                        ToolTip.visible: hovered
                        ToolTip.text: "Preview the exact ComfyUI /prompt API JSON payload with all parameters & template variables injected"
                        onClicked: root.openDryRun()
                    }
                    Button {
                        text: "▶  Save & run"
                        highlighted: true
                        onClicked: root.runSelected()
                    }
                    RowLayout {
                        spacing: 2
                        Button {
                            text: "▶▶ Multi-run (" + multiRunCountBox.value + "x)"
                            highlighted: true
                            Material.accent: "#9333ea"
                            ToolTip.visible: hovered
                            ToolTip.text: "Batch run " + multiRunCountBox.value + " times with distinct randomized seeds and add all results to Gallery"
                            onClicked: root.runMultiSelected()
                        }
                        SpinBox {
                            id: multiRunCountBox
                            from: 2
                            to: 20
                            value: 4
                            Layout.preferredWidth: 65
                            ToolTip.visible: hovered
                            ToolTip.text: "Number of batch iterations"
                        }
                    }
                }

                TabBar {
                    id: tabs
                    Layout.fillWidth: true
                    background: Rectangle { color: "transparent" }
                    TabButton { text: "Settings" }
                    TabButton { text: "Workflow JSON" }
                    TabButton { text: "Dry Run JSON" }
                    TabButton { text: "🖼 Gallery (" + (root.runGallery ? root.runGallery.length : 0) + ")" }
                    onCurrentIndexChanged: {
                        if (currentIndex === 2) {
                            root.refreshDryRun()
                        }
                    }
                }

                StackLayout {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    currentIndex: tabs.currentIndex

                    // ── TAB 1: Settings ─────────────────────────────────────
                    ScrollView {
                        id: settingsScroll
                        clip: true
                        contentWidth: availableWidth

                        ColumnLayout {
                            width: settingsScroll.availableWidth
                            spacing: 12

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 12
                                TextField {
                                    id: nameField
                                    Layout.fillWidth: true
                                    Layout.preferredWidth: 3
                                    placeholderText: "Prompt title"
                                }
                                ComboBox {
                                    id: purposeBox
                                    Layout.fillWidth: true
                                    Layout.preferredWidth: 1
                                    editable: true
                                    model: ["avatar", "greeting", "greeting_bg", "scenario_avatar", "scene", "background"]
                                    onActivated: function(index) {
                                        root.applyPurposeDefaults(currentText.trim())
                                    }
                                }
                            }

                            // Model Dropdown with Substring Filter
                            Label { text: "Checkpoint / UNET Model:"; color: root.muted; font.bold: true }
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 6

                                ComboBox {
                                    id: modelBox
                                    Layout.fillWidth: true
                                    editable: true
                                    selectTextByMouse: true
                                    model: root.checkpoints

                                    popup: Popup {
                                        id: modelPopup
                                        y: modelBox.height + 2
                                        width: Math.max(modelBox.width, 360)
                                        height: 280
                                        padding: 8
                                        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
                                        background: Rectangle {
                                            color: root.panel
                                            border.color: root.line
                                            border.width: 1
                                            radius: 6
                                        }
                                        contentItem: ColumnLayout {
                                            spacing: 6
                                            RowLayout {
                                                Layout.fillWidth: true
                                                spacing: 4
                                                TextField {
                                                    id: modelFilter
                                                    Layout.fillWidth: true
                                                    placeholderText: "Search / filter models..."
                                                    color: "#ffffff"
                                                    placeholderTextColor: root.muted
                                                    selectByMouse: true
                                                    background: Rectangle {
                                                        color: root.panelAlt
                                                        border.color: root.line
                                                        radius: 4
                                                    }
                                                }
                                                ToolButton {
                                                    text: "✕"
                                                    visible: modelFilter.text.length > 0
                                                    onClicked: modelFilter.text = ""
                                                }
                                            }
                                            ListView {
                                                id: modelList
                                                Layout.fillWidth: true
                                                Layout.fillHeight: true
                                                clip: true
                                                model: {
                                                    var list = root.checkpoints || []
                                                    var q = modelFilter.text.trim().toLowerCase()
                                                    if (!q) return list
                                                    return list.filter(function(m) { return m.toLowerCase().indexOf(q) !== -1 })
                                                }
                                                delegate: ItemDelegate {
                                                    id: itemDel
                                                    width: ListView.view ? ListView.view.width : 200
                                                    height: 36
                                                    highlighted: modelBox.editText === modelData
                                                    hoverEnabled: true
                                                    contentItem: Text {
                                                        text: modelData
                                                        color: "#ffffff"
                                                        font.pixelSize: 12
                                                        elide: Text.ElideMiddle
                                                        verticalAlignment: Text.AlignVCenter
                                                        leftPadding: 6
                                                    }
                                                    background: Rectangle {
                                                        color: itemDel.highlighted ? "#3d4655" : (itemDel.hovered ? root.panelAlt : "transparent")
                                                        radius: 4
                                                    }
                                                    onClicked: {
                                                        modelBox.editText = modelData
                                                        modelFilter.text = ""
                                                        modelPopup.close()
                                                    }
                                                }
                                                ScrollIndicator.vertical: ScrollIndicator { }
                                            }
                                            Label {
                                                Layout.fillWidth: true
                                                Layout.margins: 12
                                                visible: modelList.count === 0
                                                text: (!root.checkpoints || root.checkpoints.length === 0)
                                                      ? "No models loaded from ComfyUI.\n(Make sure ComfyUI is running and click ↻)"
                                                      : "No matching models found"
                                                color: root.muted
                                                font.pixelSize: 12
                                                horizontalAlignment: Text.AlignHCenter
                                                wrapMode: Text.Wrap
                                            }
                                        }
                                        onOpened: {
                                            modelFilter.forceActiveFocus()
                                        }
                                        onClosed: {
                                            modelFilter.text = ""
                                        }
                                    }
                                }
                                ToolButton {
                                    text: "↻"
                                    font.pixelSize: 16
                                    ToolTip.visible: hovered
                                    ToolTip.text: "Reload models from ComfyUI"
                                    onClicked: root.loadModels()
                                }
                            }

                            // ZodaPlus LoRA Toggle (Node 45)
                            RowLayout {
                                Layout.fillWidth: true
                                Switch {
                                    id: zodaToggle
                                    text: "ZodaPlus LoRA (Node 45)"
                                    checked: true
                                }
                                Item { Layout.fillWidth: true }
                            }

                            // Prompts
                            Label { text: "Positive Prompt:"; color: root.muted; font.bold: true }
                            ScrollView {
                                Layout.fillWidth: true
                                Layout.preferredHeight: 110
                                clip: true
                                TextArea {
                                    id: positiveText
                                    width: parent.width
                                    wrapMode: TextEdit.Wrap
                                    placeholderText: "masterpiece, 1girl, solo, highly detailed…"
                                }
                            }

                            Label { text: "Negative Prompt:"; color: root.muted; font.bold: true }
                            ScrollView {
                                Layout.fillWidth: true
                                Layout.preferredHeight: 70
                                clip: true
                                TextArea {
                                    id: negativeText
                                    width: parent.width
                                    wrapMode: TextEdit.Wrap
                                    placeholderText: "worst quality, low quality, blurry…"
                                }
                            }

                            Label { text: "LoRAs (comma-separated, e.g. MatureFemaleSliderAnima:1.5, ZodaPlus:1.0):"; color: root.muted; font.bold: true }
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 6
                                TextField {
                                    id: loraField
                                    Layout.fillWidth: true
                                    placeholderText: "e.g. MatureFemaleSliderAnima.safetensors:1.5, Costume:0.8"
                                    selectByMouse: true
                                    color: "#ffffff"
                                }
                                ToolButton {
                                    text: "+ LoRA"
                                    font.bold: true
                                    visible: root.loras && root.loras.length > 0
                                    ToolTip.visible: hovered
                                    ToolTip.text: "Pick from installed LoRAs"
                                    onClicked: loraPickerPopup.open()
                                }
                            }

                            Popup {
                                id: loraPickerPopup
                                y: loraField.y + loraField.height + 2
                                width: Math.max(loraField.width, 360)
                                height: 280
                                padding: 8
                                closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
                                background: Rectangle {
                                    color: root.panel
                                    border.color: root.line
                                    border.width: 1
                                    radius: 6
                                }
                                contentItem: ColumnLayout {
                                    spacing: 6
                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 4
                                        TextField {
                                            id: loraSearchField
                                            Layout.fillWidth: true
                                            placeholderText: "Search installed LoRAs..."
                                            color: "#ffffff"
                                            placeholderTextColor: root.muted
                                            selectByMouse: true
                                            background: Rectangle {
                                                color: root.panelAlt
                                                border.color: root.line
                                                radius: 4
                                            }
                                        }
                                        ToolButton {
                                            text: "✕"
                                            visible: loraSearchField.text.length > 0
                                            onClicked: loraSearchField.text = ""
                                        }
                                    }
                                    ListView {
                                        id: loraListView
                                        Layout.fillWidth: true
                                        Layout.fillHeight: true
                                        clip: true
                                        model: {
                                            var list = root.loras || []
                                            var q = loraSearchField.text.trim().toLowerCase()
                                            if (!q) return list
                                            return list.filter(function(m) { return m.toLowerCase().indexOf(q) !== -1 })
                                        }
                                        delegate: ItemDelegate {
                                            id: loraItemDel
                                            width: ListView.view ? ListView.view.width : 200
                                            height: 36
                                            hoverEnabled: true
                                            contentItem: Text {
                                                text: modelData
                                                color: "#ffffff"
                                                font.pixelSize: 12
                                                elide: Text.ElideMiddle
                                                verticalAlignment: Text.AlignVCenter
                                                leftPadding: 6
                                            }
                                            background: Rectangle {
                                                color: loraItemDel.hovered ? root.panelAlt : "transparent"
                                                radius: 4
                                            }
                                            onClicked: {
                                                var cur = loraField.text.trim()
                                                if (cur) loraField.text = cur + ", " + modelData + ":1.0"
                                                else loraField.text = modelData + ":1.0"
                                                loraSearchField.text = ""
                                                loraPickerPopup.close()
                                            }
                                        }
                                        ScrollIndicator.vertical: ScrollIndicator { }
                                    }
                                    Label {
                                        Layout.fillWidth: true
                                        Layout.margins: 12
                                        visible: loraListView.count === 0
                                        text: (!root.loras || root.loras.length === 0)
                                              ? "No LoRAs found from ComfyUI (check connection)"
                                              : "No matching LoRAs"
                                        color: root.muted
                                        font.pixelSize: 12
                                        horizontalAlignment: Text.AlignHCenter
                                        wrapMode: Text.Wrap
                                    }
                                }
                                onOpened: loraSearchField.forceActiveFocus()
                                onClosed: loraSearchField.text = ""
                            }

                            // Generation Parameters Grid
                            GridLayout {
                                columns: 4
                                Layout.fillWidth: true
                                columnSpacing: 12
                                rowSpacing: 8

                                Label { text: "Sampler"; color: root.muted }
                                ComboBox {
                                    id: samplerBox
                                    Layout.fillWidth: true
                                    editable: true
                                    model: root.samplers
                                }

                                Label { text: "Scheduler"; color: root.muted }
                                ComboBox {
                                    id: schedBox
                                    Layout.fillWidth: true
                                    editable: true
                                    model: root.schedulers
                                }

                                Label { text: "Steps"; color: root.muted }
                                SpinBox {
                                    id: stepsBox
                                    Layout.fillWidth: true
                                    from: 1
                                    to: 150
                                    value: 20
                                    editable: true
                                }

                                Label { text: "CFG Scale"; color: root.muted }
                                TextField {
                                    id: cfgField
                                    Layout.fillWidth: true
                                    text: "7.0"
                                    validator: DoubleValidator { bottom: 0.0; top: 30.0; decimals: 2 }
                                }

                                Label { text: "Width"; color: root.muted }
                                SpinBox {
                                    id: widthBox
                                    Layout.fillWidth: true
                                    from: 64
                                    to: 4096
                                    stepSize: 64
                                    value: 512
                                    editable: true
                                }

                                Label { text: "Height"; color: root.muted }
                                SpinBox {
                                    id: heightBox
                                    Layout.fillWidth: true
                                    from: 64
                                    to: 4096
                                    stepSize: 64
                                    value: 512
                                    editable: true
                                }

                                Label { text: "Seed (-1 = random)"; color: root.muted }
                                RowLayout {
                                    Layout.fillWidth: true
                                    TextField {
                                        id: seedField
                                        Layout.fillWidth: true
                                        text: "-1"
                                    }
                                    Button {
                                        text: "Random"
                                        onClicked: seedField.text = "-1"
                                    }
                                }
                            }
                        }
                    }

                    // ── TAB 2: Workflow JSON ────────────────────────────────
                    ColumnLayout {
                        spacing: 8
                        RowLayout {
                            Layout.fillWidth: true
                            Label {
                                text: "ComfyUI API Graph JSON (empty uses default txt2img)"
                                color: root.muted
                            }
                            Item { Layout.fillWidth: true }
                            Button {
                                text: "Format JSON"
                                flat: true
                                onClicked: root.formatJson()
                            }
                            Button {
                                text: "★ Save as Default Template"
                                flat: true
                                onClicked: root.saveAsDefaultWorkflow()
                            }
                            Button {
                                text: "↺ Load Default"
                                flat: true
                                onClicked: root.loadDefaultWorkflow()
                            }
                            Button {
                                text: "🔍 Dry Run"
                                flat: true
                                onClicked: root.openDryRun()
                            }
                        }
                        ScrollView {
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            TextArea {
                                id: workflowText
                                font.family: "monospace"
                                font.pixelSize: 12
                                wrapMode: TextEdit.NoWrap
                                text: "{}"
                            }
                        }
                    }

                    // ── TAB 3: Dry Run JSON ────────────────────────────────
                    ColumnLayout {
                        spacing: 8

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 8

                            Label {
                                text: "Resolved /prompt API payload ready for ComfyUI execution"
                                color: root.muted
                                font.pixelSize: 11
                            }

                            Item { Layout.fillWidth: true }

                            Label {
                                id: dryRunSeedLabel
                                text: ""
                                color: "#6ee7b7"
                                font.bold: true
                                font.pixelSize: 11
                            }

                            Label {
                                id: dryRunNodeCountLabel
                                text: ""
                                color: "#38bdf8"
                                font.pixelSize: 11
                            }

                            Button {
                                text: "🔄 Re-evaluate"
                                flat: true
                                onClicked: root.refreshDryRun()
                            }

                            Button {
                                text: "📋 Copy JSON"
                                highlighted: true
                                onClicked: {
                                    dryRunArea.selectAll()
                                    dryRunArea.copy()
                                    dryRunArea.deselect()
                                    root.setStatus("✓ Copied Dry Run JSON to clipboard", false)
                                }
                            }
                        }

                        ScrollView {
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            clip: true

                            TextArea {
                                id: dryRunArea
                                font.family: "monospace"
                                font.pixelSize: 12
                                wrapMode: TextEdit.NoWrap
                                readOnly: true
                                selectByMouse: true
                                text: "{}"
                                background: Rectangle {
                                    color: "#0f172a"
                                    border.color: root.line
                                    radius: 4
                                }
                            }
                        }
                    }

                    // ── TAB 4: Gallery & Output ─────────────────────────────
                    ColumnLayout {
                        spacing: 10

                        // Gallery Toolbar
                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 8

                            Label {
                                text: {
                                    if (root.repeatTotal > 1 && root.runStatus === "running") {
                                        return "Batch Progress: " + root.repeatCount + " / " + root.repeatTotal + " (generating...)"
                                    }
                                    return "Status: " + (root.runStatus || "idle")
                                }
                                color: root.statusColor(root.runStatus)
                                font.bold: true
                            }

                            Rectangle {
                                visible: root.repeatTotal > 1 && root.runStatus === "running"
                                Layout.preferredWidth: 100
                                Layout.preferredHeight: 6
                                color: root.panelAlt
                                radius: 3
                                clip: true
                                Rectangle {
                                    width: (parent.width * (root.repeatCount / Math.max(1, root.repeatTotal)))
                                    height: parent.height
                                    color: "#a855f7"
                                    radius: 3
                                }
                            }

                            Item { Layout.fillWidth: true }

                            Label {
                                text: root.runSeed !== null ? ("Latest Seed: " + root.runSeed) : ""
                                color: "#6ee7b7"
                                font.pixelSize: 11
                            }

                            Label {
                                text: (root.runGallery ? root.runGallery.length : 0) + " image(s) in gallery"
                                color: "#38bdf8"
                                font.bold: true
                                font.pixelSize: 11
                            }

                            Button {
                                text: "▶ 2x"
                                flat: true
                                font.pixelSize: 11
                                onClicked: root.runMultiSelected(2)
                            }

                            Button {
                                text: "▶ 4x"
                                flat: true
                                font.pixelSize: 11
                                onClicked: root.runMultiSelected(4)
                            }

                            Button {
                                text: "🗑 Clear"
                                flat: true
                                font.pixelSize: 11
                                Material.foreground: "#ff7a7a"
                                enabled: root.runGallery && root.runGallery.length > 0
                                onClicked: confirmClearGallery.open()
                            }
                        }

                        Rectangle {
                            visible: root.runError !== ""
                            Layout.fillWidth: true
                            height: errorLabel.implicitHeight + 16
                            color: "#3a1d1d"
                            border.color: "#ff7a7a"
                            radius: 4
                            Label {
                                id: errorLabel
                                anchors.fill: parent
                                anchors.margins: 8
                                text: root.runError
                                color: "#ff7a7a"
                                wrapMode: Text.Wrap
                            }
                        }

                        GridView {
                            id: galleryGrid
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            cellWidth: 260
                            cellHeight: 280
                            clip: true
                            model: root.runGallery

                            delegate: Item {
                                id: cardDelegate
                                width: 250
                                height: 270

                                readonly property bool isHovered: cardMouseArea.containsMouse
                                readonly property var itemData: modelData

                                Rectangle {
                                    anchors.fill: parent
                                    color: cardDelegate.isHovered ? root.panel : root.panelAlt
                                    radius: 8
                                    border.color: cardDelegate.isHovered ? root.accent : root.line
                                    border.width: cardDelegate.isHovered ? 2 : 1

                                    Image {
                                        id: thumbImg
                                        anchors.top: parent.top
                                        anchors.left: parent.left
                                        anchors.right: parent.right
                                        anchors.bottom: metaBar.top
                                        anchors.margins: 4
                                        fillMode: Image.PreserveAspectFit
                                        source: root.imageUrl(itemData)
                                    }

                                    // Top-left index badge
                                    Rectangle {
                                        anchors.top: parent.top
                                        anchors.left: parent.left
                                        anchors.margins: 8
                                        width: idxText.implicitWidth + 10
                                        height: 20
                                        radius: 4
                                        color: "#cc14161a"
                                        Label {
                                            id: idxText
                                            anchors.centerIn: parent
                                            text: "#" + (index + 1)
                                            font.pixelSize: 10
                                            font.bold: true
                                            color: "#ffffff"
                                        }
                                    }

                                    // Bottom metadata bar
                                    Rectangle {
                                        id: metaBar
                                        anchors.left: parent.left
                                        anchors.right: parent.right
                                        anchors.bottom: parent.bottom
                                        height: 32
                                        color: "#181b22"
                                        radius: 8

                                        RowLayout {
                                            anchors.fill: parent
                                            anchors.leftMargin: 8
                                            anchors.rightMargin: 8

                                            Label {
                                                text: (itemData && itemData.seed !== undefined) ? ("Seed: " + itemData.seed) : ""
                                                color: "#6ee7b7"
                                                font.pixelSize: 11
                                                Layout.fillWidth: true
                                                elide: Text.ElideRight
                                            }

                                            ToolButton {
                                                text: "🔍"
                                                font.pixelSize: 12
                                                onClicked: {
                                                    root.selectedGalleryItem = itemData
                                                    galleryLightbox.open()
                                                }
                                            }

                                            ToolButton {
                                                text: "🗑"
                                                font.pixelSize: 12
                                                onClicked: {
                                                    if (itemData && itemData.filename) {
                                                        root.deleteGalleryImage(itemData.filename)
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    MouseArea {
                                        id: cardMouseArea
                                        anchors.fill: parent
                                        hoverEnabled: true
                                        onClicked: {
                                            root.selectedGalleryItem = itemData
                                            galleryLightbox.open()
                                        }
                                    }
                                }
                            }
                        }

                        Label {
                            visible: (!root.runGallery || root.runGallery.length === 0) && root.runError === ""
                            text: "No images in gallery yet — click ▶ Save & run or ▶▶ Multi-run to generate"
                            color: root.muted
                            Layout.alignment: Qt.AlignHCenter
                        }
                    }
                }

                // Status Footer
                Rectangle {
                    Layout.fillWidth: true
                    height: 24
                    color: root.panel
                    Label {
                        anchors.left: parent.left
                        anchors.leftMargin: 8
                        anchors.verticalCenter: parent.verticalCenter
                        text: root.statusText
                        color: root.statusError ? "#ff7a7a" : root.muted
                        font.pixelSize: 11
                    }
                }
            }
        }
    }
}
