export function calculateTextLines(text, maxWidth, fontSize, fontFamily, leading = 1.2) {
  if (!text) return [];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const safeFontName = fontFamily.replace(/['"]/g, '');
  ctx.font = `${fontSize}px "${safeFontName}", sans-serif`;

  const paragraphs = String(text).split(/\r\n|\n/);
  const lines = [];
  
  const lineHeight = fontSize * leading; 
  
  // This pushes the baseline down so the optical middle of the text sits dead-center.
  let currentY = fontSize * 0.35; 

  paragraphs.forEach(para => {
    // Handle empty lines (like pressing Enter twice)
    if (para === "") {
      lines.push({ text: "", y: currentY });
      currentY += lineHeight;
      return;
    }

    const words = para.trim().split(/\s+/);
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine.length === 0 ? word : `${currentLine} ${word}`;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine.length > 0) {
          lines.push({ text: currentLine, y: currentY });
          currentY += lineHeight;
        }
        currentLine = word;
      }
    });

    if (currentLine.length > 0) {
      lines.push({ text: currentLine, y: currentY });
      currentY += lineHeight;
    }
  });

  return lines;
}