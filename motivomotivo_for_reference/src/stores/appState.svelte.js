import { FUSION_EFFECTS } from '$lib/fusionEngine.js';

export const VERSION = "1.4.0";

/**
 * Calculates grid dimensions and safe areas based on exact mathematical subdivisions.
 * Ensures the grid is perfectly centered within the defined viewport margin.
 */
function calculateGeometry(width, height, marginPercent, subdivisionsW) {
  const marginPx = Math.min(width, height) * (marginPercent / 100);
  const availableW = width - (marginPx * 2);
  const availableH = height - (marginPx * 2);

  const cellSize = Math.floor(availableW / subdivisionsW);
  const subdivisionsH = Math.floor(availableH / cellSize);

  const mWidth = subdivisionsW * cellSize;
  const mHeight = subdivisionsH * cellSize;

  const margin = {
    l: Math.floor((width - mWidth) / 2),
    t: Math.floor((height - mHeight) / 2)
  };

  return {
    width, height, cellSize,
    divsW: subdivisionsW, divsH: subdivisionsH,
    margin, mWidth, mHeight, marginPercent
  };
}

/**
 * Initializes the grid data array.
 * Encoding Schema: Each cell is an 18-character string containing 3 marks (6 chars each).
 * Channels per mark: [0]Visibility [1]Shape [2]Color [3]Size [4]Position [5]Rotation
 */
function getDevTestGrid(total) {
  return Array.from({ length: total }, (_, i) => {
    const shape = i % 4;
    const color = (i % 4);
    const rot = i % 4;
    const pos = i % 9;

    // Mark 1 is populated dynamically; Marks 2 & 3 default to hidden ("0") centered ("4") circles ("0")
    const mark1 = `1${shape}${color}3${pos}${rot}`;
    const emptyMark = "000240";
    return mark1 + emptyMark + emptyMark;
  });
}

export const DIMENSIONS_PRESETS = [
  { id: 'square', name: 'Square', w: 1080, h: 1080 },
  { id: 'ig_story', name: 'IG Story', w: 1080, h: 1920 },
  { id: 'letter', name: 'Letter', w: 816, h: 1056 },
  { id: 'half_letter', name: 'Half Letter', w: 528, h: 816 },
  { id: 'legal', name: 'Legal', w: 816, h: 1344 },
  { id: 'half_legal', name: 'Half Legal', w: 672, h: 816 },
  { id: 'a4', name: 'A4', w: 794, h: 1123 }
];

export const PALETTE_PRESETS = [
  { name: "Default", colors: ["#e63946", "#e775a7", "#a8dadc", "#1d3557"]},
  { name: "Bauhaus", colors: ["#202121", "#E63946", "#FFB703", "#1B4965"] }, // Classic Primary
  { name: "Dada", colors: ["#F1E9DB", "#2E2E2E", "#A44200", "#D8D8D8"] }, // Newsprint & Ink
  { name: "RisoSplat", colors: ["#FF4C65", "#00A38D", "#FFD300", "#2E2E2E"] }, // Fluorescent vibe
  { name: "IBM_1980", colors: ["#FFFFFF", "#000000", "#0056B3", "#CCCCCC"] }, // Corporate Modernist
  { name: "GameBoy", colors: ["#0F380F", "#306230", "#8BAC0F", "#9BBC0F"] }, // 4-bit Green
  { name: "Brutalist", colors: ["#0000FF", "#FFFFFF", "#FF0000", "#CCCCCC"] }, // Raw & High-contrast
  { name: "Desert", colors: ["#BC6C25", "#DDA15E", "#FEFAE0", "#606C38"] }, // Natural Earthy
  { name: "E-Ink", colors: ["#000000", "#555555", "#AAAAAA", "#FFFFFF"] }, // Pure Monochrome
  { name: "Cyberpunk", colors: ["#08090A", "#F72585", "#4CC9F0", "#3A0CA3"] }, // Neon night
  { name: "Wabi-Sabi", colors: ["#582F0E", "#7F4F24", "#936639", "#C2C5AA"] }, // Organic Browns
  { name: "Blueprint", colors: ["#002147", "#004B95", "#8BB8E8", "#FFFFFF"] }, // Technical drawing
  { name: "Swiss", colors: ["#FFFFFF", "#D90429", "#2B2D42", "#8D99AE"] }  // Clean Editorial
];

export const SHAPE_PACKS = {
  standard: {
    name: 'Standard Pack',
    shapes: ['Circle', 'Square', 'Corner', 'Triangle'],
    rotatable: [2, 3]
  },
  playful: {
    name: 'Playful Pack',
    shapes: ['Diamond', 'Cross', 'Hexagon', 'Half-Circle'],
    rotatable: [2, 3]
  },
  organic: {
    name: 'Organic Pack',
    shapes: ['Amoeba', 'Pebble', 'Teardrop', 'Peanut'],
    rotatable: [0, 1, 2, 3]
  }
};

const initialPage = calculateGeometry(1080, 1920, 5, 4);
const initialTotalCells = initialPage.divsW * initialPage.divsH;

export const appState = $state({
  page: initialPage,
  gridData: getDevTestGrid(initialTotalCells),
  showGrid: true,
  showBatchOverlay: false,
  shapePack: 'standard',

  // Global Settings & UI State
  selectionMode: 'single',
  selectedCells: [],
  selectedMark: 0,
  palette: PALETTE_PRESETS[0].colors,
  bgColor: "#ffffff",
  copiedBlock: null,
  currentFilePath: null,

  mergedBlocks: {},

  get selectedCell() {
    return this.selectedCells.length > 0 ? this.selectedCells[0] : null;
  },

  toggleGrid() {
    this.showGrid = !this.showGrid;
  },
  setShapePack(packName) {
    this.saveState();
    this.shapePack = packName;
  },

  /* ===================================
  ===         History Engine         ===
  =================================== */
  undoStack: [],
  redoStack: [],
  lastSaveTime: 0,

  /**
   * Captures a full snapshot of the visual state.
   * Throttled to 400ms to prevent UI sliders from flooding the undo stack.
   */
  saveState(force = false) {
    const now = Date.now();
    if (force || now - this.lastSaveTime > 400 || this.undoStack.length === 0) {
      if (this.undoStack.length >= 50) this.undoStack.shift();

      const cleanEffects = JSON.parse(JSON.stringify(this.effects));
      const cleanTextData = JSON.parse(JSON.stringify(this.textData));
      const cleanImageData = JSON.parse(JSON.stringify(this.imageData));
      const cleanMergedBlocks = JSON.parse(JSON.stringify(this.mergedBlocks || {}));

      this.undoStack.push({
        gridData: [...this.gridData],
        palette: [...this.palette],
        bgColor: this.bgColor,
        page: { ...this.page },
        effects: cleanEffects,
        textData: cleanTextData,
        imageData: cleanImageData,
        mergedBlocks: cleanMergedBlocks
      });
      this.redoStack = [];
    }
    this.lastSaveTime = now;
  },

  undo() {
    if (this.undoStack.length === 0) return;
    this.redoStack.push({
      gridData: [...this.gridData],
      palette: [...this.palette],
      bgColor: this.bgColor,
      page: { ...this.page },
      effects: JSON.parse(JSON.stringify(this.effects)),
      textData: JSON.parse(JSON.stringify(this.textData)),
      imageData: JSON.parse(JSON.stringify(this.imageData)),
      mergedBlocks: JSON.parse(JSON.stringify(this.mergedBlocks || {}))
    });

    const prev = this.undoStack.pop();
    this.gridData = prev.gridData;
    this.palette = prev.palette;
    this.bgColor = prev.bgColor;
    this.page = prev.page;
    this.effects = prev.effects;
    this.textData = prev.textData;
    this.imageData = prev.imageData || {};
    this.mergedBlocks = prev.mergedBlocks || {};
  },

  redo() {
    if (this.redoStack.length === 0) return;
    this.undoStack.push({
      gridData: [...this.gridData],
      palette: [...this.palette],
      bgColor: this.bgColor,
      page: { ...this.page },
      effects: JSON.parse(JSON.stringify(this.effects)),
      textData: JSON.parse(JSON.stringify(this.textData)),
      imageData: JSON.parse(JSON.stringify(this.imageData)),
      mergedBlocks: JSON.parse(JSON.stringify(this.mergedBlocks || {}))
    });
    const next = this.redoStack.pop();
    this.gridData = next.gridData;
    this.palette = next.palette;
    this.bgColor = next.bgColor;
    this.page = next.page;
    this.effects = next.effects;
    this.textData = next.textData;
    this.imageData = next.imageData || {};
    this.mergedBlocks = next.mergedBlocks || {};
  },


  /* ===================================
  ===           Page Layout          ===
  =================================== */

  /**
   * Recalculates the grid and remaps existing vector/text data to the new coordinates.
   * Data falling outside the new bounds is discarded.
   */
  updateLayout(newW, newH, newMargin, newDivsW) {
    this.saveState();

    const oldDivsW = this.page.divsW;
    const oldDivsH = this.page.divsH;
    const oldData = [...this.gridData];

    this.page = calculateGeometry(newW, newH, newMargin, newDivsW);
    const newTotal = this.page.divsW * this.page.divsH;
    const newData = Array(newTotal).fill("000240000240000240");

    // Map structural marks
    for (let row = 0; row < this.page.divsH; row++) {
      for (let col = 0; col < this.page.divsW; col++) {
        if (row < oldDivsH && col < oldDivsW) {
          newData[row * this.page.divsW + col] = oldData[row * oldDivsW + col];
        }
      }
    }

    // Map typographic blocks
    const newTextData = {};
    for (let key in this.textData) {
      const oldIndex = parseInt(key);
      const r = Math.floor(oldIndex / oldDivsW);
      const c = oldIndex % oldDivsW;
      if (r < this.page.divsH && c < this.page.divsW) {
        newTextData[r * this.page.divsW + c] = { ...this.textData[oldIndex] };
      }
    }

    // Map image blocks
    const newImageData = {};
    for (let key in this.imageData) {
      const oldIndex = parseInt(key);
      const r = Math.floor(oldIndex / oldDivsW);
      const c = oldIndex % oldDivsW;
      if (r < this.page.divsH && c < this.page.divsW) {
        newImageData[r * this.page.divsW + c] = { ...this.imageData[oldIndex] };
      }
    }

    // BUGFIX: Map merged blocks safely. If the new grid is smaller and the block 
    // spills over the right or bottom edge, we gracefully discard the merge.
    const newMergedBlocks = {};
    for (let key in this.mergedBlocks) {
      const oldIndex = parseInt(key);
      const r = Math.floor(oldIndex / oldDivsW);
      const c = oldIndex % oldDivsW;
      const span = this.mergedBlocks[key];
      
      if (r + span <= this.page.divsH && c + span <= this.page.divsW) {
        newMergedBlocks[r * this.page.divsW + c] = span;
      }
    }

    this.textData = newTextData;
    this.imageData = newImageData; 
    this.mergedBlocks = newMergedBlocks;
    this.gridData = newData;
    this.selectedCells = [];
  },

  /* ===================================
  ===         Motivo Editing         ===
  =================================== */

  /**
   * Mutates a specific channel within the 18-character cell string.
   * Utilizes a 6-character offset to target Mark 1, Mark 2, or Mark 3.
   */
  updateAttribute(attrIndex, value) {
    if (this.selectedCells.length === 0) return;
    this.saveState();

    for (let i of this.selectedCells) {
      let cellCode = this.gridData[i];
      let stringIndex = (this.selectedMark * 6) + attrIndex;

      this.gridData[i] =
        cellCode.substring(0, stringIndex) +
        value +
        cellCode.substring(stringIndex + 1);
    }
  },

  updatePaletteColor(index, colorHex) {
    this.saveState();
    let newPalette = [...this.palette];
    newPalette[index] = colorHex;
    this.palette = newPalette;
  },

  loadPalette(colors) {
    this.saveState();
    this.palette = [...colors];
  },

  randomizePalette() {
    this.saveState();
    const randomHex = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    this.palette = [randomHex(), randomHex(), randomHex(), randomHex()];
  },

  updateBgColor(hex) {
    this.saveState();
    this.bgColor = hex;
  },

  /* ===================================
  ===       Clipboard Operations     ===
  =================================== */

  /**
   * Calculates the geometric bounding box around the current multiselection.
   * Extracts both vector codes and text objects while retaining relative spatial layout.
   */
  copySelectedCell() {
    if (this.selectedCells.length === 0) return;

    let minCol = Infinity, maxCol = -Infinity;
    let minRow = Infinity, maxRow = -Infinity;
    const divsW = this.page.divsW;

    for (let index of this.selectedCells) {
      let col = index % divsW;
      let row = Math.floor(index / divsW);
      if (col < minCol) minCol = col;
      if (col > maxCol) maxCol = col;
      if (row < minRow) minRow = row;
      if (row > maxRow) maxRow = row;
    }

    const cols = maxCol - minCol + 1;
    const rows = maxRow - minRow + 1;
    const cells = [];
    const textCells = {};
    const imageCells = {};

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let gridIndex = (minRow + r) * divsW + (minCol + c);
        cells.push(this.gridData[gridIndex]);
        if (this.textData[gridIndex]) {
          textCells[r * cols + c] = JSON.parse(JSON.stringify(this.textData[gridIndex]));
        }
        
        if (this.imageData[gridIndex]) {
          imageCells[r * cols + c] = JSON.parse(JSON.stringify(this.imageData[gridIndex]));
        }
      }
    }
    this.copiedBlock = { cols, rows, cells, textCells, imageCells };
  },

  /**
   * Stamps the copied bounding box data starting from the top-left cell of the new selection.
   * Overwrites target cells, effectively clearing text if the source cell was empty.
   */
  pasteToSelectedCell(pasteTarget = 'all') { // pasteTarget can be 'all', 'mark', or 'text'
    if (this.selectedCells.length === 0 || !this.copiedBlock) return;

    this.saveState();

    let minCol = Infinity, minRow = Infinity;
    const divsW = this.page.divsW;
    const divsH = this.page.divsH;

    for (let index of this.selectedCells) {
      let col = index % divsW;
      let row = Math.floor(index / divsW);
      if (col < minCol) minCol = col;
      if (row < minRow) minRow = row;
    }
    
    const { cols, rows, cells, textCells, imageCells } = this.copiedBlock;
    const markStart = this.selectedMark * 6;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let targetCol = minCol + c;
        let targetRow = minRow + r;

        if (targetCol < divsW && targetRow < divsH) {
          let targetIndex = targetRow * divsW + targetCol;
          let sourceIndex = r * cols + c;

          if (pasteTarget === 'mark') {
            // ONLY PASTE THE ACTIVE MARK
            let targetCode = this.gridData[targetIndex];
            let sourceCode = cells[sourceIndex];
            let sourceMarkCode = sourceCode.substring(markStart, markStart + 6);
            
            this.gridData[targetIndex] = 
              targetCode.substring(0, markStart) + 
              sourceMarkCode + 
              targetCode.substring(markStart + 6);
              
          } else if (pasteTarget === 'text') {
            // ONLY PASTE TEXT
            if (textCells && textCells[sourceIndex]) {
              this.textData[targetIndex] = JSON.parse(JSON.stringify(textCells[sourceIndex]));
            } else {
              delete this.textData[targetIndex];
            }
            
          } else if (pasteTarget === 'all') {
            // STANDARD PASTE (Overwrites everything)
            this.gridData[targetIndex] = cells[sourceIndex];

            if (textCells && textCells[sourceIndex]) {
              this.textData[targetIndex] = JSON.parse(JSON.stringify(textCells[sourceIndex]));
            } else {
              delete this.textData[targetIndex];
            }

            if (imageCells && imageCells[sourceIndex]) {
              const isReplacing = !!this.imageData[targetIndex];
              const currentTotal = Object.keys(this.imageData).length;
              if (isReplacing || currentTotal < this.maxImages) {
                this.imageData[targetIndex] = JSON.parse(JSON.stringify(imageCells[sourceIndex]));
              }
            } else {
              delete this.imageData[targetIndex];
            }
          }
        }
      }
    }
  },

  clearSelectedCells() {
    if (this.selectedCells.length === 0) return;
    const emptyCellCode = "000240000240000240";
    this.saveState(); 
    this.selectedCells.forEach(cellIndex => {
      this.gridData[cellIndex] = emptyCellCode;
    });
  },

  clearSelectedText() {
    if (this.selectedCells.length === 0) return;
    this.saveState();
    
    let changed = false;
    for (let i of this.selectedCells) {
      if (this.textData[i]) {
        delete this.textData[i];
        changed = true;
      }
    }

    if (changed) {
      this.textData = { ...this.textData };
    }
  },

  clearEntireCell() {
    if (this.selectedCells.length === 0) return;
    this.saveState();
    
    const emptyCellCode = "000240000240000240";
    let textChanged = false;
    let imageChanged = false;

    for (let i of this.selectedCells) {
      // 1. Reset vector marks
      this.gridData[i] = emptyCellCode;
      
      // 2. Delete text if it exists
      if (this.textData[i]) {
        delete this.textData[i];
        textChanged = true;
      }
      
      // 3. Delete image if it exists
      if (this.imageData[i]) {
        delete this.imageData[i];
        imageChanged = true;
      }
    }

    // Trigger Svelte reactivity for the dictionaries
    if (textChanged) this.textData = { ...this.textData };
    if (imageChanged) this.imageData = { ...this.imageData };
  },

  /* ===================================
  ===       Cell Manipulation        ===
  =================================== */

  flipSelectedCells(axis) {
    if (this.selectedCells.length === 0) return;
    this.saveState();

    // Positional Mapping (3x3 Grid)
    const flipH_Pos = { '0':'2', '1':'1', '2':'0', '3':'5', '4':'4', '5':'3', '6':'8', '7':'7', '8':'6' };
    const flipV_Pos = { '0':'6', '1':'7', '2':'8', '3':'3', '4':'4', '5':'5', '6':'0', '7':'1', '8':'2' };

    for (let i of this.selectedCells) {
      let code = this.gridData[i];
      let newCode = "";

      // Process all 3 marks inside the cell
      for (let m = 0; m < 3; m++) {
        let mark = code.substring(m * 6, (m * 6) + 6);
        
        if (mark[0] === '0') {
          newCode += mark; // Leave hidden marks alone
          continue;
        }

        let shape = mark[1];
        let pos = mark[4];
        let rot = mark[5];

        // 1. Flip Position
        pos = axis === 'horizontal' ? flipH_Pos[pos] : flipV_Pos[pos];

        // 2. Flip Rotation
        const isStandardCorner = (this.shapePack === 'standard' && shape === '2');
        const isOrganicAsymmetric = (this.shapePack === 'organic' && ['0', '1', '3'].includes(shape));

        // Apply special asymmetric diagonal rotation to Corners and Organic Blobs
        if (isStandardCorner || isOrganicAsymmetric) {
          if (axis === 'horizontal') rot = { '0':'3', '1':'2', '2':'1', '3':'0' }[rot];
          if (axis === 'vertical')   rot = { '0':'1', '1':'0', '2':'3', '3':'2' }[rot];
        } else {
          // Standard rotation for bilaterally symmetric shapes
          // (Triangles, Half-Circles, Hexagons, and the Organic Teardrop)
          if (axis === 'horizontal') rot = { '0':'0', '1':'3', '2':'2', '3':'1' }[rot];
          if (axis === 'vertical')   rot = { '0':'2', '1':'1', '2':'0', '3':'3' }[rot];
        }

        // Reconstruct the mark string: Vis + Shape + Color + Size + Pos + Rot
        newCode += mark.substring(0, 4) + pos + rot;
      }
      
      this.gridData[i] = newCode;
    }
  },

  /* ===================================
  ===          File & Utility        ===
  =================================== */

  clearGrid() {
    this.saveState();
    const total = this.page.divsW * this.page.divsH;
    this.gridData = Array(total).fill("000240000240000240");
    this.textData = {};
    this.imageData = {}; 
    this.mergedBlocks = {}; // BUGFIX: Wipe macro-cells
    this.selectedCells = [];
  },

  generateRandomGrid() {
    this.saveState();
    
    // Check how many shapes are in the current pack (usually 4)
    const numShapes = SHAPE_PACKS[this.shapePack]?.shapes?.length || 4;
    
    const newData = this.gridData.map(() => {
      let cellCode = "";
      for (let i = 0; i < 3; i++) {
        // 60% chance to be visible, otherwise hidden
        const vis = Math.random() > 0.4 ? "1" : "0"; 
        const shape = Math.floor(Math.random() * numShapes);
        const color = Math.floor(Math.random() * 4); // 4 palette colors
        const size = Math.floor(Math.random() * 4);  // 4 sizes
        const pos = Math.floor(Math.random() * 9);   // 9 positions (0-8)
        const rot = Math.floor(Math.random() * 4);   // 4 rotations
        
        cellCode += `${vis}${shape}${color}${size}${pos}${rot}`;
      }
      return cellCode;
    });
    
    this.gridData = newData;
    
    // BUGFIX: Ensure random grids start completely fresh without leftover assets
    this.textData = {};
    this.imageData = {};
    this.mergedBlocks = {};
    this.selectedCells = [];
  },

  getProjectJSON() {
    return JSON.stringify({
      schemaVersion: "1.5",
      shapePack: this.shapePack,
      palette: this.palette,
      bgColor: this.bgColor,
      page: this.page,
      gridData: this.gridData,
      textData: this.textData,
      effects: this.effects,
      imageData: this.imageData,
      imagesAffectedByFusion: this.imagesAffectedByFusion,
      customFonts: this.customFonts,
      mergedBlocks: this.mergedBlocks
    }, null, 2);
  },

  loadProjectJSON(jsonString) {
    this.saveState();
    try {
      const data = JSON.parse(jsonString);
      if (data.shapePack) this.shapePack = data.shapePack;
      if (data.palette) this.palette = data.palette;
      if (data.bgColor) this.bgColor = data.bgColor;
      if (data.page) this.page = data.page;
      if (data.gridData) this.gridData = data.gridData;
      if (data.textData) this.textData = data.textData;
      if (data.effects) {
        // BUGFIX: Safely merge legacy effect states without deleting new effect keys
        this.effects.active = data.effects.active || [];
        if (data.effects.values) {
          this.effects.values = { ...this.effects.values, ...data.effects.values };
        }
      }
      if (data.imageData) this.imageData = data.imageData;
      if (data.imagesAffectedByFusion !== undefined) this.imagesAffectedByFusion = data.imagesAffectedByFusion;
      
      // Load custom fonts array from the save file
      if (data.customFonts) this.customFonts = data.customFonts;
      
      // Inject custom fonts into the browser engine immediately upon load
      if (this.customFonts && this.customFonts.length > 0) {
        this.customFonts.forEach(async (font) => {
          try {
            const fontFace = new FontFace(font.family, `url(${font.dataUrl})`);
            await fontFace.load();
            document.fonts.add(fontFace);
          } catch (e) {
            console.error("Failed to inject custom font from project file:", e);
          }
        });
      }

      this.selectedCells = [];

      if (data.mergedBlocks) this.mergedBlocks = data.mergedBlocks;
      else this.mergedBlocks = {};

    } catch (e) {
      console.error("Failed to parse project file:", e);
    }
  },

  /* ===================================
  === Post-Processing (Fusion) State ===
  =================================== */

  maxEffects: 3,
  effects: {
    active: [],
    values: {
      filmGrain: 0,
      chromatic: 0,
      glitch: 0,
      dither: 1,
      pixelate: 0,
      wavy: 0,
      slitscan: 0,
      washed: 0,
      halftone: 0,
      vignette: 0,
      ascii: 6,
      scannerPull: 0,
      smear: 0,
      kaleidoscope: 2,
      photocopy: 0,
      stochastic: 0,
      inkBleed: 1
    }
  },

  toggleEffect(id) {
    this.saveState();
    if (this.effects.active.includes(id)) {
      this.effects.active = this.effects.active.filter(i => i !== id);
    } else {
      if (this.effects.active.length >= this.maxEffects) {
        return;
      }
      this.effects.active.push(id);
    }
  },

  updateEffectValue(id, val) {
    // Note: State saving is deliberately bypassed here to prevent the UI slider
    // from overwhelming the undo stack. Handled via onpointerdown in the UI.
    this.effects.values[id] = val;
  },

  randomizeFusion() {
    this.saveState();
    const allIds = Object.keys(FUSION_EFFECTS);

    const count = Math.floor(Math.random() * 2) + 2;
    const shuffled = allIds.sort(() => 0.5 - Math.random());
    this.effects.active = shuffled.slice(0, count);

    this.effects.active.forEach(id => {
      const config = FUSION_EFFECTS[id];
      if (config.isToggle) {
        this.effects.values[id] = 1;
      } else {
        const minVisible = config.min + (config.max - config.min) * 0.2;
        const randomVal = minVisible + (Math.random() * (config.max - minVisible));
        this.effects.values[id] = Math.round(randomVal / config.step) * config.step;
      }
    });
  },

  /* ===================================
  ===       Text Editor State        ===
  =================================== */

  /**
   * Sparse dictionary mapping grid indices to text objects.
   * Enables performant iteration during canvas rendering.
   */
  textData: {},
  textAffectedByFusion: true,
  maxCustomFonts: 2,
  customFonts: [
    // { name: "MyCoolFont", family: "custom-0", dataUrl: "data:font/ttf;base64,AAEAAAA..." }
  ],

  updateTextAttribute(cellIndex, attr, value) {
    this.saveState(true);

    if (!this.textData[cellIndex]) {
      this.textData[cellIndex] = {
        content: "",
        span: 2,
        size: 24,
        colorIndex: 0,
        font: "Anton",
        align: "left",
        dir: "horizontal",
        leading: 1.2
      };
    }

    this.textData[cellIndex][attr] = value;
  },

  removeText(cellIndex) {
    this.saveState(true);
    if (this.textData[cellIndex]) {
      delete this.textData[cellIndex];
    }
  },

  /* ===================================
  ===       Image Layer State        ===
  =================================== */

  /**
   * Sparse dictionary mapping grid indices to image objects.
   * Format: { src: "base64...", spanW: 2, spanH: 2, padding: 0 }
   */
  maxImages: 4,
  imageData: {},
  imagesAffectedByFusion: true,

  updateImageAttribute(cellIndex, attr, value) {
    this.saveState(true);

    if (!this.imageData[cellIndex]) {
      this.imageData[cellIndex] = {
        src: "",          // The compressed WebP Base64 string
        spanW: 2,         // Horizontal grid span
        spanH: 2,         // Vertical grid span
        padding: 0        // Internal padding slider value
      };
    }

    this.imageData[cellIndex][attr] = value;
  },

  clearSelectedImage() {
    if (this.selectedCells.length === 0) return;
    this.saveState();
    
    let changed = false;
    for (let i of this.selectedCells) {
      if (this.imageData[i]) {
        delete this.imageData[i];
        changed = true;
      }
    }
    
    if (changed) {
      this.imageData = { ...this.imageData };
    }
  },

  // --- METAMOTIVO (MERGING) LOGIC ---

  getCellStatus(index, currentBlocks = null) {
    const blocks = currentBlocks || this.mergedBlocks || {};

    if (blocks[index]) {
      return { role: 'anchor', span: blocks[index] };
    }

    const divsW = this.page.divsW;
    const col = index % divsW;
    const row = Math.floor(index / divsW);

    for (const [anchorStr, span] of Object.entries(blocks)) {
      const anchorIdx = parseInt(anchorStr, 10);
      const aCol = anchorIdx % divsW;
      const aRow = Math.floor(anchorIdx / divsW);

      if (col >= aCol && col < aCol + span && row >= aRow && row < aRow + span) {
        return { role: 'hidden', anchorIndex: anchorIdx };
      }
    }

    return { role: 'standard' };
  },

  canMergeSelection() {
    if (this.selectedCells.length < 4) return { valid: false }; // Minimum 2x2

    const divsW = this.page.divsW;
    let minCol = Infinity, maxCol = -Infinity;
    let minRow = Infinity, maxRow = -Infinity;

    for (const idx of this.selectedCells) {
      const col = idx % divsW;
      const row = Math.floor(idx / divsW);
      if (col < minCol) minCol = col;
      if (col > maxCol) maxCol = col;
      if (row < minRow) minRow = row;
      if (row > maxRow) maxRow = row;
    }

    const spanW = (maxCol - minCol) + 1;
    const spanH = (maxRow - minRow) + 1;

    // Rule 1: Must be a perfect square
    if (spanW !== spanH) return { valid: false };

    // Rule 2: Selected area must perfectly match the bounding box area (no gaps)
    if (this.selectedCells.length !== spanW * spanH) return { valid: false };

    // Rule 3: Cannot overlap existing merges
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const checkIdx = r * divsW + c;
        if (this.getCellStatus(checkIdx).role !== 'standard') return { valid: false };
      }
    }

    return { valid: true, anchor: minRow * divsW + minCol, span: spanW };
  },

  mergeSelectedCells() {
    const check = this.canMergeSelection();
    if (!check.valid) return;

    this.saveState();
    
    // Clean up the "eaten" cells so they don't hold hidden geometry or text
    const emptyCellCode = "000240000240000240";
    let cleanedObjects = false;
    
    for (const idx of this.selectedCells) {
      if (idx !== check.anchor) {
        this.gridData[idx] = emptyCellCode;
        if (this.textData[idx]) { delete this.textData[idx]; cleanedObjects = true; }
        if (this.imageData[idx]) { delete this.imageData[idx]; cleanedObjects = true; }
      }
    }

    this.mergedBlocks[check.anchor] = check.span;
    
    // Trigger Svelte reactivity
    this.mergedBlocks = { ...this.mergedBlocks };
    if (cleanedObjects) {
      this.textData = { ...this.textData };
      this.imageData = { ...this.imageData };
    }

    // Snap selection to the new master anchor
    this.selectedCells = [check.anchor];
  },

  unmergeSelectedCells() {
    if (this.selectedCells.length === 0) return;
    
    let changed = false;
    this.saveState();

    for (const idx of this.selectedCells) {
      const status = this.getCellStatus(idx);
      if (status.role === 'anchor') {
        delete this.mergedBlocks[idx];
        changed = true;
      } else if (status.role === 'hidden') {
        delete this.mergedBlocks[status.anchorIndex];
        changed = true;
      }
    }

    if (changed) {
      this.mergedBlocks = { ...this.mergedBlocks };
      this.selectedCells = []; // Clear selection to prevent phantom highlights
    }
  },

});