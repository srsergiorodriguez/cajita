const fontModules = import.meta.glob('$lib/fonts/*.{ttf,otf,woff,woff2}', { 
  query: '?url', 
  import: 'default', 
  eager: true 
});

// Generate an array of font objects based on the filenames
export const availableFonts = Object.keys(fontModules).map(filePath => {
  // Extract filename without extension (e.g., "/src/lib/fonts/SpaceMono.ttf" -> "SpaceMono")
  const filename = filePath.split('/').pop();
  const rawName = filename.split('.')[0];
  
  return {
    name: rawName.replace(/-/g, ' '), // Clean up hyphens for the UI (e.g., "Inter Regular")
    family: rawName,                  // Use the raw name as the internal CSS family
    url: fontModules[filePath]
  };
});

// Loads the fonts into the document via the CSS Font Loading API
export async function initLocalFonts() {
  const loadPromises = availableFonts.map(async (font) => {
    // Create a new font face using the internal family name and local URL
    const fontFace = new FontFace(font.family, `url(${font.url})`);
    
    try {
      await fontFace.load();
      document.fonts.add(fontFace);
    } catch (err) {
      console.error(`Failed to load font: ${font.family}`, err);
    }
  });

  await Promise.all(loadPromises);
}