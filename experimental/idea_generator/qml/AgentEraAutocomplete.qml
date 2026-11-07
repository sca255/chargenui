import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

// Standalone era autocomplete component for agentic mode
Rectangle {
    id: agentEraAutocomplete
    width: 340
    height: 240
    color: "#0f172a"
    radius: 12
    border.color: "#334155"
    border.width: 1
    visible: Boolean(root && root.agenticEraAutocompleteActive && root.agenticEraAutocompleteItems && root.agenticEraAutocompleteItems.length > 0)
    z: 9999
    
    // Semi-transparent backdrop
    Rectangle {
        anchors.fill: parent
        color: "#00000066"
        radius: 12
        visible: agentEraAutocomplete.visible
    }
    
    // Autocomplete panel
    Rectangle {
        id: autocompletePanel
        anchors.centerIn: parent
        width: agentEraAutocomplete.width
        height: agentEraAutocomplete.visible ? 240 : 0
        color: "#1e293b"
        radius: 12
        border.color: "#10b981"
        border.width: 1
        
        ColumnLayout {
            id: autocompletePanelContent
            anchors.fill: parent
            anchors.margins: 8
            spacing: 4
            
            RowLayout {
                Layout.fillWidth: true
                spacing: 6
                Text {
                    text: "🏛️"
                    font.pixelSize: 12
                }
                Text {
                    text: "Era Autocomplete"
                    font.bold: true
                    font.pixelSize: 11
                    color: "#10b981"
                }
                Item { Layout.fillWidth: true }
                Text {
                    text: "✕"
                    font.pixelSize: 10
                    color: "#ef4444"
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: agentEraAutocomplete.hide()
                    }
                }
            }
            
            Text {
                Layout.fillWidth: true
                text: "Type 'era:' all, 'eram:' poly, 'eras:' solo, 'erac:' category"
                font.pixelSize: 9
                color: "#94a3b8"
                wrapMode: Text.Wrap
            }
            
            Rectangle {
                Layout.fillWidth: true
                height: 1
                color: "#334155"
            }
            
            ScrollView {
                Layout.fillWidth: true
                implicitHeight: 140
                clip: true
                
                ColumnLayout {
                    width: autocompletePanel.width - 16
                    spacing: 2
                    
                    Repeater {
                        model: root && root.agenticEraAutocompleteItems ? root.agenticEraAutocompleteItems : []
                        
                        Rectangle {
                            property bool hovered: false
                            width: autocompletePanel.width - 16
                            height: 32
                            radius: 6
                            color: hovered ? "#10b98122" : "#1e293b"
                            border.color: hovered ? "#10b981" : "#334155"
                            border.width: 1
                            
                            RowLayout {
                                anchors.fill: parent
                                anchors.margins: 4
                                spacing: 6
                                
                                Text {
                                    text: modelData.id
                                    font.pixelSize: 10
                                    font.bold: true
                                    color: "#a855f7"
                                    Layout.preferredWidth: 100
                                    elide: Text.ElideRight
                                }
                                
                                Text {
                                    text: "- " + modelData.name
                                    font.pixelSize: 9
                                    color: "#cbd5e1"
                                    elide: Text.ElideRight
                                    Layout.fillWidth: true
                                }
                                
                                Text {
                                    text: modelData.source === "extension" ? "📄" : "📚"
                                    font.pixelSize: 10
                                    color: "#64748b"
                                }
                            }
                            
                            MouseArea {
                                anchors.fill: parent
                                hoverEnabled: true
                                onEntered: parent.hovered = true
                                onExited: parent.hovered = false
                                onClicked: {
                                    if (root && typeof root.onAgentEraAutocompleteInsert === "function") {
                                        root.onAgentEraAutocompleteInsert(modelData.id);
                                    }
                                    if (root) {
                                        root.agenticEraAutocompleteItems = [];
                                        root.agenticEraAutocompleteQuery = "";
                                    }
                                }
                                cursorShape: Qt.PointingHandCursor
                            }
                        }
                    }
                }
            }
            
            Rectangle {
                Layout.fillWidth: true
                height: 1
                color: "#334155"
                visible: Boolean(root && root.agenticEraAutocompleteItems && root.agenticEraAutocompleteItems.length > 0)
            }
            
            RowLayout {
                Layout.fillWidth: true
                spacing: 4
                visible: Boolean(root && root.agenticEraAutocompleteItems && root.agenticEraAutocompleteItems.length > 0)
                
                Text {
                    text: "💡 Tips:"
                    font.pixelSize: 9
                    font.bold: true
                    color: "#10b981"
                }
                
                Text {
                    text: "Click any era to insert it into your message"
                    font.pixelSize: 8
                    color: "#94a3b8"
                    wrapMode: Text.Wrap
                    Layout.fillWidth: true
                }
            }
        }
    }
    
    // External API
    function show() {
        visible = true;
    }
    
    function hide() {
        visible = false;
    }
    
    function updateItems(eraItems, query) {
        if (!root) return;
        var parsedItems = eraItems;
        if (typeof eraItems === "string") {
            try {
                parsedItems = JSON.parse(eraItems);
            } catch (error) {
                parsedItems = [];
            }
        }
        root.agenticEraAutocompleteItems = Array.isArray(parsedItems) ? parsedItems : [];
        root.agenticEraAutocompleteQuery = query || "";
        visible = root.agenticEraAutocompleteItems.length > 0;
    }
    
    function insertSelectedEra(eraId) {
        if (root && typeof root.onAgentEraAutocompleteInsert === "function") {
            root.onAgentEraAutocompleteInsert(eraId);
        }
    }
}
