import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

// Simple autocomplete component for era names in agentic mode
TextField {
    id: eraAutocompletionInput
    width: 320
    height: 36
    font.pixelSize: 12
    
    // Placeholder changes based on agent mode
    placeholderText: root && root.agenticEraModeActive ? "era:" : "era:"
    
    // Styling
    color: "#f8fafc"
    background: Rectangle {
        color: "#1e293b"
        radius: 8
        border.color: eraAutocompletionInput.activeFocus ? "#10b981" : "#334155"
        border.width: 1
    }
    
    // Autocomplete popup
    property var autocompleteItems: []
    property bool showAutocomplete: false
    
    // Show autocomplete only in agentic mode and when text is being typed
    onTextChanged: {
        if (root && root.agenticEraModeActive && text.length > 0) {
            showAutocomplete = true
            filterAutocompletionItems()
        } else {
            showAutocomplete = false
        }
    }
    
    // Filter autocomplete items based on current input
    function filterAutocompletionItems() {
        if (!root || !root.eraAutocompletionSource) {
            autocompleteItems = []
            return
        }
        
        const filter = text.toLowerCase()
        autocompleteItems = root.eraAutocompletionSource.filter(function(item) {
            return item.id.toLowerCase().includes(filter) || 
                   item.name.toLowerCase().includes(filter)
        })
        // Limit to 8 items
        if (autocompleteItems.length > 8) {
            autocompleteItems = autocompleteItems.slice(0, 8)
        }
    }
    
    // Handle autocomplete item selection
    function selectAutocompletionItem(item) {
        eraAutocompletionInput.text = item.id
        showAutocomplete = false
        if (root && root.onEraAutocompletionSelected) {
            root.onEraAutocompletionSelected(item)
        }
    }
    
    // Create the autocomplete popup
    Rectangle {
        x: 0
        y: height
        width: eraAutocompletionInput.width
        height: Math.min(autocompleteItems.length * 36 + 8, 320)
        visible: showAutocomplete && autocompleteItems.length > 0
        color: "#1e293b"
        radius: 8
        border.color: "#334155"
        border.width: 1
        z: 9999
        
        // Background for autocomplete
        Rectangle {
            anchors.fill: parent
            color: "#1e293b"
            radius: 8
        }
        
        // Autocomplete items
        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 4
            spacing: 0
            
            Repeater {
                model: autocompleteItems
                delegate: MouseArea {
                    width: parent.width
                    height: 36
                    
                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 4
                        spacing: 2
                        
                        RowLayout {
                            spacing: 6
                            Text {
                                text: modelData.id
                                font.pixelSize: 11
                                font.bold: true
                                color: "#a855f7"
                            }
                            Text {
                                text: "- " + modelData.name
                                font.pixelSize: 10
                                color: "#cbd5e1"
                                elide: Text.ElideRight
                                Layout.fillWidth: true
                            }
                        }
                    }
                    
                    onClicked: eraAutocompletionInput.selectAutocompletionItem(modelData)
                    
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                }
            }
        }
    }
    
    // External API
    function updateAutocompletionSource(eraSource) {
        autocompleteItems = eraSource || []
    }
    
    function clearAutocompletion() {
        eraAutocompletionInput.text = ""
        showAutocomplete = false
        autocompleteItems = []
    }
}
