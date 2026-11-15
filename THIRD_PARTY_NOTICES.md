# Third-Party Notices & Attribution

CharGenUI incorporates, interfaces with, or references several open-source technologies, protocols, and standard specifications. This document details their respective licenses and attributions.

---

## 1. Runtime Dependencies & Tooling

CharGenUI is engineered to run on the following runtimes and environments:

- **Bun Runtime**  
  Licence: MIT License / LGPLv2.1  
  Copyright (c) Oven-sh, Inc. and contributors  
  Website: [https://bun.sh](https://bun.sh)

- **Node.js Type Definitions (`@types/node`, `@types/bun`)**  
  Licence: MIT License  
  Copyright (c) Microsoft Corporation and DefinitelyTyped contributors  
  Repository: [https://github.com/DefinitelyTyped/DefinitelyTyped](https://DefinitelyTyped/DefinitelyTyped)

- **PySide6 / Qt for Python (Desktop Studio & Companion Tools)**  
  Licence: GNU Lesser General Public License v3 (LGPLv3) / Commercial  
  Copyright (c) The Qt Company Ltd.  
  Website: [https://www.qt.io](https://www.qt.io)

- **Python Requests (`requests`)**  
  Licence: Apache License 2.0  
  Copyright (c) Kenneth Reitz & PSF  
  Repository: [https://github.com/psf/requests](https://github.com/psf/requests)

---

## 2. Community Formats & Specifications

CharGenUI provides interoperability with open community file formats and specifications:

- **SillyTavern Character Card Specification (V2 & V3)**  
  CharGenUI imports and exports PNG character cards utilizing the standard embedded `chara` PNG metadata chunk pioneered by the Tavern/SillyTavern open-source community.  
  Website: [https://sillytavern.app](https://sillytavern.app)

- **CharX Archive Container Specification**  
  CharGenUI supports reading and writing `.charx` multi-asset archive containers according to the open specification.

- **ComfyUI Workflow Protocols**  
  CharGenUI interfaces with ComfyUI prompt dispatchers and workflow templates over HTTP and WebSocket APIs.  
  Repository: [https://github.com/comfyanonymous/ComfyUI](https://github.com/comfyanonymous/ComfyUI)

- **Model Context Protocol (MCP)**  
  CharGenUI provides an optional client implementation interfacing with Stdio-based MCP servers following the open Model Context Protocol specification.

---

## 3. System Fonts & Styling

The CharGenUI web interface utilizes system font stacks:
- Apple System (`-apple-system`), BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, and standard sans-serif/monospace fallbacks rendered by the client operating system.
- No proprietary commercial web fonts are bundled or hosted in this repository.

---

## 4. Software Provenance Notice

The MIT license applied to this repository applies strictly to the original source code, scripts, and documentation authored as part of the CharGenUI project. It does not supersede, modify, or grant rights to third-party software, external runtime binaries (such as Python, Bun, Qt, ImageMagick, or FFmpeg), or third-party web services accessed via API.
